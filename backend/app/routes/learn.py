from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
from app.services.vertex import vertex_service
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
    user_id: str = "guest"  # Added user_id


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
    image: Optional[str] = None  # Base64 image
    session_id: Optional[str] = None  # Session ID for polling

class VideoAnalysisRequest(BaseModel):
    url: str
    mode: str = "adhd"
    instruction: Optional[str] = None
    user_id: str = "guest"


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
        "timestamp": item.created_at.isoformat()
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
        
        if video_b64:
            # Update session with generated video
            session = db_session.query(LearningSession).filter(
                LearningSession.id == uuid.UUID(session_id)
            ).first()
            
            if session:
                # Update content_data JSON with video
                content_data = session.content_data or {}
                content_data["video_summary"] = video_b64
                session.content_data = content_data
                
                # Mark as updated (tell SQLAlchemy JSON changed)
                flag_modified(session, "content_data")
                db_session.commit()
                
                print(f"✅ Video stored in session {session_id} ({len(video_b64)} chars)")
            else:
                print(f"❌ Session {session_id} not found")
        else:
            print(f"❌ Video generation returned None")
            
    except Exception as e:
        print(f"❌ Background video generation failed: {e}")
        import traceback
        traceback.print_exc()

@router.post("/learn/explain", response_model=ExplainResponse)
async def explain_topic(
    request: ExplainRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    # 1. Get System Prompt from Brain
    from app.brain import brain
    
    # 2. Text Explanation (Slides + Quiz)
    prompt = brain.get_system_prompt(request.mode, "General", "explanation", user_instruction=request.instruction)
    prompt += f"\n\nTopic: {request.topic}\nCreate 3-5 slides and 2 quiz questions. Return strictly valid JSON (slides, quiz)."
    
    # Force JSON format via prompt injection if not in system prompt
    prompt += """
    Output strictly valid JSON with this structure:
    {
      "slides": [{"title": "...", "content": "..."}],
      "quiz": [{"question": "...", "options": [], "correct": 0, "explanation": "Briefly explain why the correct answer is right."}]
    }
    """
    
    # Personalize the prompt based on user interest
    if request.user_id and request.user_id != "guest":
        prompt = personalize_prompt(prompt, request.user_id, db, context="explanation")
        
        # Also personalize quiz generation
        quiz_personalization = personalize_prompt(
            "Generate quiz questions.",
            request.user_id,
            db,
            context="quiz"
        )
        prompt += f"\n{quiz_personalization}"

    try:
        response_text = await vertex_service.generate_text(prompt)
        clean_text = response_text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_text)
        
        # 3. Context-Aware Image Generation
        # Generate a prompt for the image based on the topic and mode
        image_prompt = f"Educational illustration of {request.topic}, {request.mode} friendly style, high quality."
        if request.instruction:
             image_prompt += f" Context: {request.instruction}"
        if request.mode == "adhd":
            image_prompt += " Vibrant, infographic style, minimal clutter."
        
        # Personalize image style based on user interest
        if request.user_id and request.user_id != "guest":
            image_prompt = personalize_prompt(image_prompt, request.user_id, db, context="image")
        
        image_b64 = await vertex_service.generate_image_base64(image_prompt)
        data["image"] = image_b64
        
        # Save History to DB and get session_id
        session_id = save_history_entry_db(
            db=db,
            title=request.topic, 
            preview=data["slides"][0]["content"] if data["slides"] else "Explaining topic...", 
            type="topic",
            data=data,
            user_id=request.user_id
        )
        
        # Start background video generation
        if session_id:
            background_tasks.add_task(
                generate_video_background,
                session_id=session_id,
                topic=request.topic,
                slides=data["slides"],
                user_id=request.user_id or "guest",
                db_session=db
            )
            print(f"🚀 Background video generation started for session {session_id}")
        
        # Return immediately with content (video generates in background)
        return {
            "slides": data["slides"],
            "quiz": data["quiz"],
            "image": data["image"],
            "session_id": session_id
        }
    except Exception as e:
        logger.error(f"Error explaining topic: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/learn/analyze_video", response_model=ExplainResponse)
async def analyze_video(request: VideoAnalysisRequest, db: Session = Depends(get_db)):
    from app.brain import brain
    
    # Note: Without a YouTube Transcriber, we treat the URL as context.
    # Ideally, we'd fetch the transcript here.
    # For now, we prompt Gemini to "use its knowledge of the video if possible" or General Knowledge + URL context.
    
    prompt = brain.get_system_prompt(request.mode, "General", "video_analysis", user_instruction=request.instruction)
    prompt += f"\n\nVideo URL: {request.url}\n"
    prompt += "Task: Analyze the likely content of this video based on its topic/URL context. "
    prompt += "If you cannot access the video directly, use your general knowledge about the implied topic. "
    prompt += "Create detailed educational slides and a quiz."
    prompt += """
    Output strictly valid JSON with this structure:
    {
      "slides": [{"title": "...", "content": "..."}],
      "quiz": [{"question": "...", "options": [], "correct": 0, "explanation": "Why this is correct..."}]
    }
    """
    
    # Personalize video analysis based on user interest
    if request.user_id and request.user_id != "guest":
        prompt = personalize_prompt(prompt, request.user_id, db, context="explanation")
    
    try:
         response_text = await vertex_service.generate_text(prompt)
         clean_text = response_text.replace("```json", "").replace("```", "").strip()
         data = json.loads(clean_text)
         # No image generation for video analysis (video is the visual)
         data["image"] = None 

         # Save History
         # Try to extract a title from the explanation or use the URL
         title = data["slides"][0]["title"] if data.get("slides") else "Video Analysis"
         save_history_entry_db(
            db=db,
            title=title, 
            preview=f"Analysis of {request.url}", 
            type="video",
            data=data,
            user_id=request.user_id
        )

         return data
    except Exception as e:
        logger.error(f"Error analyzing video: {e}")
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
