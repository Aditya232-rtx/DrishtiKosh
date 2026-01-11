from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Request
from pydantic import BaseModel
import asyncio
from typing import List, Optional
from app.services.vertex import vertex_service
from app.core.ratelimit import limiter
import json
import logging
from app.core.database import get_db
from app.core.utils import personalize_prompt, get_interest_style, get_user_interest
from app.models.learning_session import LearningSession, SessionType, SessionStatus
from app.models.quiz_progress import QuizProgress
from datetime import datetime
import uuid

router = APIRouter()
logger = logging.getLogger(__name__)

# --- Models ---

class ExplainRequest(BaseModel):
    topic: str
    mode: str = "adhd"
    instruction: Optional[str] = None
    user_id: str = "guest"
    is_video: bool = False
    file_uri: Optional[str] = None
    file_mime: Optional[str] = None


class Slide(BaseModel):
    title: str
    content: str
    hasVideo: bool = False
    videoQuery: Optional[str] = None

class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct: int
    explanation: str # New field for reasoning

class ExplainResponse(BaseModel):
    slides: List[Slide]
    quiz: List[QuizQuestion]
    image: Optional[str] = None  # Deprecated (keeps backward compatibility)
    images: List[str] = []       # New: List of 4 generated images
    session_id: Optional[str] = None  # Session ID for polling

class VideoAnalysisRequest(BaseModel):
    url: str
    mode: str = "adhd"
    instruction: Optional[str] = None
    user_id: str = "guest"

class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None
    user_id: str = "guest"
    # New: Accept GCS file info
    file_uri: Optional[str] = None
    file_mime: Optional[str] = None


class FlowchartRequest(BaseModel):
    topic: str

class FlowNode(BaseModel):
    id: int
    title: str
    level: int
    parent: Optional[int] = None

class FlowNote(BaseModel):
    id: int
    title: str
    content: str

class FlowchartResponse(BaseModel):
    nodes: List[FlowNode]
    notes: List[FlowNote]
    summary: str

# --- Endpoints ---

@router.post("/learn/chat")
async def learn_chat(req: ChatRequest, db: Session = Depends(get_db)):
    """
    Inline chat for Learn Mode. 
    Answers doubts using personalized prompt settings.
    """
    try:
        # 1. Personalize Prompt
        user_uuid = req.user_id if req.user_id != "guest" else None
        
        base_prompt = f"""
        You are a helpful AI tutor. The user has a doubt: "{req.message}".
        
        Context of the lesson: {req.context if req.context else 'General Query'}
        
        Answer the doubt concisely and clearly. 
        Focus on explaining the concept simply.
        Do not use asterisks (*) in your response.
        """
        
        # FIX: personalize_prompt is synchronous and args were wrong order
        prompt = personalize_prompt(base_prompt, req.user_id, db, context="conversation")
        
        # 2. Call Vertex AI
        files = []
        if req.file_uri and req.file_mime:
             files.append({"uri": req.file_uri, "mime_type": req.file_mime})
             prompt += "\n[Context: The user has uploaded a file. Use the attached file to answer the doubt.]"

        response_text = await vertex_service.generate_text(prompt, files=files)
        
        return {"response": response_text}

    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate answer")


def save_history_entry_db(db: Session, title: str, preview: str, type: str, data: dict, user_id: str = "guest"):
    try:
        entry = LearningSession(
            id=uuid.uuid4(),
            user_id=uuid.UUID(user_id) if user_id != "guest" else None,
            title=title,
            preview=preview[:60] + "..." if len(preview) > 60 else preview,
            type=SessionType[type] if type in ["video", "topic", "image", "quiz"] else SessionType.topic,
            content_data=data,
            status=SessionStatus.completed,
            created_at=datetime.utcnow()
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return str(entry.id)
    except Exception as e:
        logger.error(f"Error saving history to DB: {e}")
        db.rollback()
        return None

@router.get("/learn/history")
async def get_history(user_id: str = "guest", db: Session = Depends(get_db)):
    try:
        user_uuid = uuid.UUID(user_id) if user_id != "guest" else None
        query = db.query(LearningSession)
        if user_uuid:
            query = query.filter(LearningSession.user_id == user_uuid)
        items = query.order_by(LearningSession.created_at.desc()).limit(50).all()
        # Return lightweight history (exclude 'content_data' to save bandwidth)
        return [
            {
                "id": str(item.id),
                "title": item.title,
                "preview": item.preview,
                "type": item.type.value,
                "timestamp": item.created_at.isoformat(),
                "date": "Today" # Backward compat
            } for item in items
        ]
    except Exception as e:
        logger.error(f"Error fetching history: {e}")
        return []

@router.get("/learn/session/{session_id}")
async def get_session(session_id: str, db: Session = Depends(get_db)):
    item = db.query(LearningSession).filter(LearningSession.id == uuid.UUID(session_id)).first()
    if not item:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "id": str(item.id),
        "title": item.title,
        "type": item.type.value,
        "data": item.content_data,
        "timestamp": item.created_at.isoformat(),
        "status": item.status.value
    }

# Background Video Generation Function
async def generate_video_background(
    session_id: str,
    topic: str,
    slides: list,
    user_id: str,
    db_session: Session
):
    """
    Background task to generate video and update session.
    Runs after response is sent to user.
    """
    try:
        from app.services.video import video_service
        from app.core.utils import get_user_interest
        
        print(f"🎥 Starting background video generation for session {session_id}")
        
        # Create content summary from first 3 slides
        summary_lines = []
        for slide in slides[:3]:
            summary_lines.append(f"• {slide.get('title', 'Point')}: {slide.get('content', '')[:100]}")
        content_summary = "\n".join(summary_lines)
        
        # Get user interest for personalization
        user_interest = get_user_interest(user_id, db_session) if user_id != "guest" else "default"
        
        # Generate 8-second video
        video_b64 = await video_service.generate_video_summary(
            topic=topic,
            content_summary=content_summary,
            user_interest=user_interest,
            duration=8
        )
        
        # Mark session as failed immediately to stop frontend polling
        session = db_session.query(LearningSession).filter(
             LearningSession.id == uuid.UUID(session_id)
        ).first()

        if not video_b64:
            # Mark session as failed immediately to stop frontend polling
            session = db_session.query(LearningSession).filter(
                 LearningSession.id == uuid.UUID(session_id)
            ).first()

            if session:
                 # Mark video as failed in content_data w/o failing session
                 content_data = session.content_data or {}
                 content_data["video_status"] = "failed"
                 session.content_data = content_data
                 flag_modified(session, "content_data")
                 
                 db_session.commit()
                 print(f"❌ Session {session_id} video generation FAILED (or returned None)")
        else:
            if session:
                # Update content_data JSON with video
                content_data = session.content_data or {}
                content_data["video_summary"] = video_b64
                content_data["video_status"] = "completed"
                session.content_data = content_data
                
                # Mark as updated (tell SQLAlchemy JSON changed)
                flag_modified(session, "content_data")
                db_session.commit()
                
                print(f"✅ Video stored in session {session_id} ({len(video_b64)} chars)")
            else:
                print(f"❌ Session {session_id} not found")
            
    except Exception as e:
        print(f"❌ Background video generation failed: {e}")
        import traceback
        traceback.print_exc()

@router.post("/learn/explain", response_model=ExplainResponse)
@limiter.limit("5/minute")
async def explain_topic(
    request: Request,
    body: ExplainRequest, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    # 1. Get System Prompt from Brain
    from app.brain import brain
    
    # 2. Text Explanation (Slides + Quiz)
    if body.is_video:
        # User provided a YouTube URL
        prompt = brain.get_system_prompt(body.mode, "General", "video_analysis", user_instruction=body.instruction)
        prompt += f"\n\nAnalyze this YouTube Video URL: {body.topic}\n"
        prompt += "Instruction: Use your internal knowledge of this YouTube video (title, transcripts, metadata) to Analyze it."
        prompt += " If you cannot 'watch' it directly, Infer the educational content from the likely topic of this URL."
        prompt += " Create educational slides and a quiz based on this analysis."
    else:
        # Standard Topic Explanation
        prompt = brain.get_system_prompt(body.mode, "General", "explanation", user_instruction=body.instruction)
        prompt += f"\n\nTopic: {body.topic}\n"
        prompt += "Create 3-5 slides and 2 quiz questions."

    prompt += " Return strictly valid JSON (slides, quiz, image_prompts)."
    prompt += " IMPORTANT: Do not use asterisks (*) in any text content."
    
    prompt += """
    Output strictly valid JSON with this structure. 
    CRITICAL REQUIREMENTS:
    1. "slides": MUST have at least 10 items.
    2. "quiz": MUST have at least 5 questions.
    3. "image_prompts": MUST have exactly 4 prompts.
    4. "Do not use asterisks (*) in any text content."

    Structure:
    {
      "slides": [{"title": "...", "content": "..."}], 
      "quiz": [{"question": "...", "options": [], "correct": 0, "explanation": "..."}],
      "image_prompts": ["prompt1", "prompt2", "prompt3", "prompt4"]
    }
    """
    
    # Personalize the prompt based on user interest
    if body.user_id and body.user_id != "guest":
        prompt = personalize_prompt(prompt, body.user_id, db, context="explanation")
        
        # Also personalize quiz generation
        quiz_personalization = personalize_prompt(
            "Generate quiz questions.",
            body.user_id,
            db,
            context="quiz"
        )
        prompt += f"\n{quiz_personalization}"

    try:
        # If it's a video, pass the URL for VLM analysis
        video_uri = body.topic if body.is_video else None
        
        # Normalize Short URLs (youtu.be) to Full URLs (youtube.com) for Vertex AI
        if video_uri and "youtu.be/" in video_uri:
            video_id = video_uri.split("youtu.be/")[-1].split("?")[0]
            video_uri = f"https://www.youtube.com/watch?v={video_id}"
            
        print(f"📺 Processing Video URI: {video_uri}") 

        # Handle File Context
        files = []
        if body.file_uri and body.file_mime:
             print(f"DEBUG: Adding Explain context file: {body.file_uri}")
             files.append({"uri": body.file_uri, "mime_type": body.file_mime})
             prompt += "\n\nCRITICAL INSTRUCTION: The user has provided an attached file. YOU MUST BASE YOUR EXPLANATION, SLIDES, AND QUIZ SOLELY AND EXCLUSIVELY ON THE CONTENT OF THIS FILE. Do not use external knowledge unless the file is unreadable. If the file contradicts general knowledge, follow the file."

        response_text = await vertex_service.generate_text(prompt, video_url=video_uri, files=files)
        clean_text = response_text.replace("```json", "").replace("```", "").strip()
        
        try:
            data = json.loads(clean_text)
        except json.JSONDecodeError:
            # Fallback for malformed JSON
            print(f"❌ JSON Decode Error. Raw text: {clean_text[:100]}...")
            raise HTTPException(status_code=500, detail="Failed to parse AI response")
        
        # 3. Enhanced Image Generation (4 Images)
        image_prompts = data.get("image_prompts", [])
        
        # Fallback if AI didn't return prompts
        if not image_prompts:
            base_prompt = f"Educational illustration of {body.topic}, {body.mode} style"
            image_prompts = [
                f"{base_prompt} - Concept 1 overview",
                f"{base_prompt} - Detailed diagram",
                f"{base_prompt} - Real world application",
                f"{base_prompt} - creative analogy"
            ]
            
        # Ensure we have at least 4 prompts
        while len(image_prompts) < 4:
            image_prompts.append(f"Educational illustration of {body.topic} - key concept {len(image_prompts)+1}")
            
        # Personalize prompts
        final_image_prompts = []
        for p in image_prompts[:4]: # Limit to 4
            p_final = p
            if body.mode == "adhd":
                p_final += " Vibrant, infographic style, minimal clutter."
            if body.user_id and body.user_id != "guest":
                # Light personalization for style without full overhead
                # We skip full personalize_prompt calls per image to save latency
                pass 
            final_image_prompts.append(p_final)

        # Generate images in parallel
        print(f"🎨 Generating {len(final_image_prompts)} images...")
        image_tasks = [vertex_service.generate_image_base64(p) for p in final_image_prompts]
        generated_images = await asyncio.gather(*image_tasks)
        
        # Filter failures (None)
        valid_images = [img for img in generated_images if img]
        
        data["images"] = valid_images
        # Set primary image for backward compatibility
        data["image"] = valid_images[0] if valid_images else None
        
        # Save History to DB and get session_id
        session_id = save_history_entry_db(
            db=db,
            title=body.topic, 
            preview=data["slides"][0]["content"] if data["slides"] else "Explaining topic...", 
            type="topic",
            data=data,
            user_id=body.user_id
        )
        
        # Start background video generation
        if session_id:
            background_tasks.add_task(
                generate_video_background,
                session_id=session_id,
                topic=body.topic,
                slides=data["slides"],
                user_id=body.user_id or "guest",
                db_session=db
            )
            print(f"🚀 Background video generation started for session {session_id}")
        
        # Return response
        return {
            "slides": data["slides"],
            "quiz": data["quiz"],
            "image": data["image"],
            "images": data["images"],
            "session_id": session_id
        }
    except Exception as e:
        logger.error(f"Error explaining topic: {e}")
        raise HTTPException(status_code=500, detail=str(e))



@router.post("/learn/flowchart", response_model=FlowchartResponse)
async def generate_flowchart(request: FlowchartRequest):
    prompt = f"""
    Create a hierarchical flowchart for the topic '{request.topic}'.
    Return strictly valid JSON with this structure:
    {{
      "nodes": [
        {{"id": 1, "title": "Main Topic", "level": 0, "parent": null}},
        {{"id": 2, "title": "Subtopic", "level": 1, "parent": 1}}
      ],
      "notes": [
        {{"id": 1, "title": "Key Concept", "content": "Short note."}}
      ],
      "summary": "Brief summary of the structure."
    }}
    Ensure the JSON is raw and not wrapped in markdown code blocks.
    """
    
    try:
        response_text = await vertex_service.generate_text(prompt)
        clean_text = response_text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_text)
        return data
    except Exception as e:
        logger.error(f"Error generating flowchart: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Video Summary Generation
class VideoSummaryRequest(BaseModel):
    session_id: str  # Learning session ID to create video from
    user_id: str = "guest"

@router.post("/learn/video-summary")
async def generate_video_summary(request: VideoSummaryRequest, db: Session = Depends(get_db)):
    """
    Generate a 30-second video summary using Google Veo 3
    Based on a completed learning session
    """
    try:
        # Fetch the learning session
        session = db.query(LearningSession).filter(
            LearningSession.id == uuid.UUID(request.session_id)
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Extract content for video generation
        content_data = session.content_data or {}
        slides = content_data.get("slides", [])
        
        if not slides:
            raise HTTPException(status_code=400, detail="No content available for video generation")
        
        # Create summary text from slides
        summary_lines = []
        for slide in slides[:3]:  # First 3 slides for 30s video
            summary_lines.append(f"• {slide.get('title', 'Point')}: {slide.get('content', '')[:100]}")
        
        content_summary = "\n".join(summary_lines)
        
        # Get user interest for personalization
        from app.core.utils import get_user_interest
        user_interest = get_user_interest(request.user_id, db) if request.user_id != "guest" else "default"
        
        # Generate video using Veo 3
        from app.services.video import video_service
        video_b64 = await video_service.generate_video_summary(
            topic=session.title,
            content_summary=content_summary,
            user_interest=user_interest,
            duration=8  # Veo maximum: 8 seconds
        )
        
        if not video_b64:
            # Gracefully handle when Veo 3 API is not available yet
            return {
                "success": False,
                "message": "Video generation is coming soon! Veo 3 API access pending.",
                "session_id": str(session.id),
                "topic": session.title
            }
        
        # Update session with video
        if not session.content_data:
            session.content_data = {}
        session.content_data["video_summary"] = video_b64
        db.commit()
        
        return {
            "success": True,
            "video_base64": video_b64,
            "session_id": str(session.id),
            "topic": session.title,
            "duration": 30
        }
        
    except Exception as e:
        logger.error(f"Error generating video summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))
