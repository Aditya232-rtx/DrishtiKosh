from sqlalchemy.orm import Session
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.services.vertex import vertex_service
import json
import logging
from app.core.database import get_db
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
    image: Optional[str] = None # Base64 image

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

@router.post("/learn/explain", response_model=ExplainResponse)
async def explain_topic(request: ExplainRequest, db: Session = Depends(get_db)):
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
        
        image_b64 = await vertex_service.generate_image_base64(image_prompt)
        data["image"] = image_b64
        
        # Save History to DB
        save_history_entry_db(
            db=db,
            title=request.topic, 
            preview=data["slides"][0]["content"] if data["slides"] else "Explaining topic...", 
            type="topic",
            data=data,
            user_id=request.user_id
        )
        
        return data
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
