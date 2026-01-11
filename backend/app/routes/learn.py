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
import re

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
    explanation: str 

class ExplainResponse(BaseModel):
    slides: List[Slide]
    quiz: List[QuizQuestion]
    image: Optional[str] = None
    images: List[str] = []
    image_prompt: Optional[str] = None
    
    # Deaf Mode Entitlements
    flashcards: Optional[List[dict]] = None
    flowchart: Optional[str] = None
    model_url: Optional[str] = None
    
    session_id: Optional[str] = None

# Video Analysis Models
class EmotionalSegment(BaseModel):
    text: str
    loudness: str
    pitch: str
    speed: str
    timestamp: Optional[float] = None
    metrics: Optional[dict] = None

class Flashcard(BaseModel):
    front: str
    back: str

class VideoAnalysisRequest(BaseModel):
    url: str
    mode: str = "adhd"
    instruction: Optional[str] = None
    user_id: str = "guest"

class VideoAnalysisResponse(BaseModel):
    transcript: List[EmotionalSegment]
    flashcards: List[Flashcard]
    flowchart: str
    quiz: List[QuizQuestion]

class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None
    user_id: str = "guest"
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
    chart: Optional[str] = None

class FlashcardRequest(BaseModel):
    topic: str
    user_id: str = "guest"

class LogRequest(BaseModel):
    message: str
    level: str = "info"

class ThreeDModelRequest(BaseModel):
    topic: str
    prompt: Optional[str] = None
    image_url: Optional[str] = None

# --- Endpoints ---

@router.post("/learn/chat")
async def learn_chat(req: ChatRequest, db: Session = Depends(get_db)):
    """
    Inline chat for Learn Mode. 
    Answers doubts using personalized prompt settings.
    """
    try:
        user_uuid = req.user_id if req.user_id != "guest" else None
        
        base_prompt = f"""
        You are a helpful AI tutor. The user has a doubt: "{req.message}".
        
        Context of the lesson: {req.context if req.context else 'General Query'}
        
        Answer the doubt concisely and clearly. 
        Focus on explaining the concept simply.
        Do not use asterisks (*) in your response.
        """
        
        prompt = personalize_prompt(base_prompt, req.user_id, db, context="conversation")
        
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
        return [
            {
                "id": str(item.id),
                "title": item.title,
                "preview": item.preview,
                "type": item.type.value,
                "timestamp": item.created_at.isoformat(),
                "date": "Today"
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
        
        summary_lines = []
        for slide in slides[:3]:
            summary_lines.append(f"• {slide.get('title', 'Point')}: {slide.get('content', '')[:100]}")
        content_summary = "\n".join(summary_lines)
        
        user_interest = get_user_interest(user_id, db_session) if user_id != "guest" else "default"
        
        video_b64 = await video_service.generate_video_summary(
            topic=topic,
            content_summary=content_summary,
            user_interest=user_interest,
            duration=8
        )
        
        session = db_session.query(LearningSession).filter(
             LearningSession.id == uuid.UUID(session_id)
        ).first()

        if not video_b64:
            session = db_session.query(LearningSession).filter(
                 LearningSession.id == uuid.UUID(session_id)
            ).first()

            if session:
                 content_data = session.content_data or {}
                 content_data["video_status"] = "failed"
                 session.content_data = content_data
                 flag_modified(session, "content_data")
                 
                 db_session.commit()
                 print(f"❌ Session {session_id} video generation FAILED")
        else:
            if session:
                content_data = session.content_data or {}
                content_data["video_summary"] = video_b64
                content_data["video_status"] = "completed"
                session.content_data = content_data
                
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
    from app.brain import brain
    
    # 2. Text Explanation (Slides + Quiz)
    if body.is_video:
        prompt = brain.get_system_prompt(body.mode, "General", "video_analysis", user_instruction=body.instruction)
        prompt += f"\n\nAnalyze this YouTube Video URL: {body.topic}\n"
        prompt += "Instruction: Use your internal knowledge of this YouTube video (title, transcripts, metadata) to Analyze it."
        prompt += " If you cannot 'watch' it directly, Infer the educational content from the likely topic of this URL."
        prompt += " Create educational slides and a quiz based on this analysis."
    else:
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
    
    # DEAF MODE SPECIFIC PROMPT INJECTION
    if body.mode == "deaf":
        prompt += """
        ALSO generate:
        3. "flashcards": 5 key terms with "front" and "back".
        4. "flowchart": A valid Mermaid JS graph TD string ensuring node labels are quoted.
        
        Update JSON structure:
        {
          "slides": [...],
          "quiz": [...],
          "flashcards": [{"front": "...", "back": "..."}],
          "flowchart": "graph TD\\n..."
        }
        """

    if body.user_id and body.user_id != "guest":
        prompt = personalize_prompt(prompt, body.user_id, db, context="explanation")
        
        quiz_personalization = personalize_prompt(
            "Generate quiz questions.",
            body.user_id,
            db,
            context="quiz"
        )
        prompt += f"\n{quiz_personalization}"

    try:
        video_uri = body.topic if body.is_video else None
        
        if video_uri and "youtu.be/" in video_uri:
            video_id = video_uri.split("youtu.be/")[-1].split("?")[0]
            video_uri = f"https://www.youtube.com/watch?v={video_id}"
            
        print(f"📺 Processing Video URI: {video_uri}") 

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
            print(f"❌ JSON Decode Error. Raw text: {clean_text[:100]}...")
            raise HTTPException(status_code=500, detail="Failed to parse AI response")
        
        # --- DEAF MODE: 3D Model & Parsing ---
        if body.mode == "deaf":
            from app.services.meshy import meshy_service
            
            # 1. 3D Model Generation (Background/Parallel)
            print(f"🧊 Generating 3D Model for Deaf Mode: {body.topic}")
            try:
                # We await here, but ideally this could be a background task if latency is high.
                # For now, we wait to populate the response.
                model_url = await meshy_service.generate_3d_model_from_text(f"Educational model of {body.topic}")
                data["model_url"] = model_url
            except Exception as e:
                print(f"⚠️ 3D Model Generation Failed: {e}")
                data["model_url"] = None
                
            # 2. Extract Deaf-specific fields
            data["flashcards"] = data.get("flashcards", [])
            data["flowchart"] = data.get("flowchart", None)
            
            # Deaf users might still want ONE image context
            image_prompts = [f"Educational illustration of {body.topic}, clear and descriptive"]
            
        else:
             # ADHD/General Mode: 4-Image Logic
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
            
        final_image_prompts = []
        for p in image_prompts[:4]: # Limit to 4
            p_final = p
            if body.mode == "adhd":
                p_final += " Vibrant, infographic style, minimal clutter."
            final_image_prompts.append(p_final)

        print(f"🎨 Generating {len(final_image_prompts)} images...")
        image_tasks = [vertex_service.generate_image_base64(p) for p in final_image_prompts]
        generated_images = await asyncio.gather(*image_tasks)
        
        valid_images = [img for img in generated_images if img]
        
        data["images"] = valid_images
        data["image"] = valid_images[0] if valid_images else None
        data["image_prompt"] = final_image_prompts[0] if final_image_prompts else image_prompts[0] if image_prompts else None

        session_id = save_history_entry_db(
            db=db,
            title=body.topic, 
            preview=data["slides"][0]["content"] if data["slides"] else "Explaining topic...", 
            type="topic",
            data=data,
            user_id=body.user_id
        )
        
        # Background Video Generation (ADHD Mode Only)
        if body.mode == "adhd" and session_id:
             print(f"⏩ Scheduling background video generation for session {session_id}")
             background_tasks.add_task(
                 generate_video_background,
                 session_id=session_id,
                 topic=body.topic,
                 slides=data["slides"],
                 user_id=body.user_id,
                 db_session=db 
             )
        
        return {
            "slides": data["slides"],
            "quiz": data["quiz"],
            "image": data["image"],
            "images": data["images"],
            "session_id": session_id,
            "flashcards": data.get("flashcards"),
            "flowchart": data.get("flowchart"),
            "model_url": data.get("model_url")
        }
    except Exception as e:
        logger.error(f"Error explaining topic: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/learn/flowchart", response_model=FlowchartResponse)
async def generate_flowchart(request: FlowchartRequest):
    prompt = f"""
    Create a flowchart for the topic '{request.topic}' using Mermaid JS syntax.
    Return strictly valid Mermaid code starting with `graph TD`.
    CRITICAL SYNTAX RULES:
    1. Every node label MUST be enclosed in double quotes.
    2. Do NOT use parentheses ( ) inside the node IDs.
    3. Use <br/> for line breaks inside the quoted labels.
    4. Escape any inner double quotes with backslash.
    """
    
    try:
        response_text = await vertex_service.generate_text(prompt)
        match = re.search(r"(graph|flowchart)\s+[a-zA-Z0-9]+", response_text, re.IGNORECASE)
        
        if match:
            clean_text = response_text[match.start():]
            clean_text = clean_text.replace("```", "").strip()
        else:
             clean_text = response_text.replace("```mermaid", "").replace("```", "").strip()
             if not clean_text.lower().startswith("graph") and not clean_text.lower().startswith("flowchart"):
                clean_text = "graph TD\n" + clean_text
             
        return {
            "nodes": [], 
            "notes": [], 
            "summary": "Generated Diagram",
            "chart": clean_text # Frontend seems to expect this field based on usage, or we fix the model
        } 
        # WAIT: FlowchartResponse model used in v3 snippet had nodes/notes/summary.
        # But my generate_flowchart returned {"chart": clean_text} previously.
        # The user's v3 snippet showed FlowchartRequest but I don't see generate_flowchart usage.
        # I will return both to be safe, but FlowchartResponse implies structured data.
        # Actually my previous code returned {"chart": ...} but used `response_model=FlowchartResponse`? 
        # That would fail validtion if mismatched.
        # Let's check my previous code.
        # Code in Step 2440 had `async def generate_flowchart(request: FlowchartRequest):` WITHOUT response_model.
        # So it returned a dict.
        # I will remove response_model from decorator to avoid validation error if I return raw chart.
    except Exception as e:
        logger.error(f"Error generating flowchart: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class VideoSummaryRequest(BaseModel):
    session_id: str
    user_id: str = "guest"

@router.post("/learn/video-summary")
async def generate_video_summary(request: VideoSummaryRequest, db: Session = Depends(get_db)):
    try:
        session = db.query(LearningSession).filter(
            LearningSession.id == uuid.UUID(request.session_id)
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        content_data = session.content_data or {}
        slides = content_data.get("slides", [])
        
        if not slides:
            raise HTTPException(status_code=400, detail="No content available for video generation")
        
        summary_lines = []
        for slide in slides[:3]: 
            summary_lines.append(f"• {slide.get('title', 'Point')}: {slide.get('content', '')[:100]}")
        
        content_summary = "\n".join(summary_lines)
        
        from app.core.utils import get_user_interest
        user_interest = get_user_interest(request.user_id, db) if request.user_id != "guest" else "default"
        
        from app.services.video import video_service
        video_b64 = await video_service.generate_video_summary(
            topic=session.title,
            content_summary=content_summary,
            user_interest=user_interest,
            duration=8 
        )
        
        if not video_b64:
            return {
                "success": False,
                "message": "Video generation is coming soon! Veo 3 API access pending.",
                "session_id": str(session.id),
                "topic": session.title
            }
        
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

@router.post("/learn/log")
async def log_frontend_message(body: LogRequest):
    prefix = "🌐 [Frontend]:"
    if body.level == "error":
        print(f"❌ {prefix} {body.message}")
    else:
        print(f"ℹ️ {prefix} {body.message}")
    return {"status": "logged"}

@router.post("/learn/flashcards")
async def generate_flashcards(request: FlashcardRequest, db: Session = Depends(get_db)):
    from app.services.vertex import vertex_service
    prompt = f"Create 6 educational flashcards about '{request.topic}'. "
    prompt += "Each flashcard should have a 'front' (question/term) and 'back' (answer/definition). "
    prompt += """
    Output strictly valid JSON:
    [
      {"front": "...", "back": "..."},
      {"front": "..."}
    ]
    """
    try:
        response_text = await vertex_service.generate_text(prompt)
        clean_text = response_text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_text)
        return data
    except Exception as e:
        logger.error(f"Error generating flashcards: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/learn/3d_model")
async def generate_3d_model(request: ThreeDModelRequest):
    from app.services.meshy import meshy_service
    prompt = request.prompt or f"A detailed 3D model of {request.topic}, educational, realistic texturing"
    
    if request.image_url:
        model_url = await meshy_service.generate_3d_model_from_image(request.image_url)
    else:
        model_url = await meshy_service.generate_3d_model_from_text(prompt)
        
    if not model_url:
        raise HTTPException(status_code=500, detail="Failed to generate 3D model")
        
    return {"model_url": model_url}

@router.post("/learn/analyze_video_emotional", response_model=VideoAnalysisResponse)
@limiter.limit("3/minute")
async def analyze_video_emotional(
    request: Request,
    body: VideoAnalysisRequest,
    db: Session = Depends(get_db)
):
    from app.brain import brain
    from app.services.vertex import vertex_service
    import re
    
    try:
        video_title = "Video Content"
        video_description = ""
        
        if "youtube.com" in body.url or "youtu.be" in body.url:
            youtube_match = re.search(r'(?:v=|youtu\.be/)([a-zA-Z0-9_-]{11})', body.url)
            if youtube_match:
                video_id = youtube_match.group(1)
                video_title = f"YouTube Video: {video_id}"
        
        system_prompt = brain.get_system_prompt(
            user_mode="deaf",
            user_interests=get_user_interest(body.user_id, db) if body.user_id != "guest" else "General Knowledge",
            task_type="video_analysis"
        )
        
        user_prompt = f"""
Analyze this video and provide comprehensive learning content:
VIDEO URL: {body.url}

Strict JSON output:
{{
  "transcript": [{{"text": "...", "loudness": "normal", "pitch": "normal", "speed": "normal"}}],
  "flashcards": [{{"front": "...", "back": "..."}}],
  "flowchart": "graph TD\\n...",
  "quiz": [{{"question": "...", "options": [], "correct": 0, "explanation": "..."}}]
}}
"""
        logger.info(f"Analyzing video content: {body.url}")
        response_text = await vertex_service.analyze_video(body.url, system_prompt + "\n\n" + user_prompt)
        clean_text = response_text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_text)
        
        transcript = [EmotionalSegment(**seg) for seg in data.get("transcript", [])]
        flashcards = [Flashcard(**card) for card in data.get("flashcards", [])]
        flowchart = data.get("flowchart", "graph TD\n  A[Video Content]")
        quiz = [QuizQuestion(**q) for q in data.get("quiz", [])]
        
        return {
            "transcript": transcript,
            "flashcards": flashcards,
            "flowchart": flowchart,
            "quiz": quiz
        }
    except Exception as e:
        logger.error(f"Video analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
