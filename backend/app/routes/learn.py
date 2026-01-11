from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Request
from pydantic import BaseModel
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
    image_prompt: Optional[str] = None # Return the prompt used for generation
    session_id: Optional[str] = None  # Session ID for polling

# Video Analysis Models
class EmotionalSegment(BaseModel):
    text: str
    loudness: str  # "high", "normal", "low" (legacy, kept for compatibility)
    pitch: str     # "high", "normal", "low" (legacy)
    speed: str     # "fast", "normal", "slow" (legacy)
    timestamp: Optional[float] = None  # Timestamp in seconds
    metrics: Optional[dict] = None  # Acoustic metrics for Semantic-Emotional Captioning
    # metrics structure: {"rms": float, "pitch_f0": float, "jitter": float, "speech_rate": float, "centroid": float}

class Flashcard(BaseModel):
    front: str
    back: str

class VideoAnalysisRequest(BaseModel):
    url: str
    user_id: str = "guest"

class VideoAnalysisResponse(BaseModel):
    transcript: List[EmotionalSegment]
    flashcards: List[Flashcard]
    flowchart: str
    quiz: List[QuizQuestion]

# Acoustic Feature Models (Semantic-Emotional Captioning)
class AudioMetrics(BaseModel):
    rms: float          # RMS amplitude (0.0-1.0) - Loudness
    pitch_f0: float     # Fundamental frequency in Hz - Pitch
    jitter: float       # Voice tremor (0.0-1.0) - Anxiety/Emotion
    speech_rate: float  # Words per second - Speed
    centroid: float     # Spectral centroid in Hz - Brightness

class AcousticSegment(BaseModel):
    timestamp: float
    metrics: AudioMetrics

class AudioFeatureRequest(BaseModel):
    url: str
    user_id: str = "guest"

class AudioFeatureResponse(BaseModel):
    segments: List[AcousticSegment]
    duration: float

# ... (omitted lines)

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
    prompt = brain.get_system_prompt(body.mode, "General", "explanation", user_instruction=body.instruction)
    prompt += f"\n\nTopic: {body.topic}\nCreate 3-5 slides and 2 quiz questions. Return strictly valid JSON (slides, quiz)."
    
    # Force JSON format via prompt injection if not in system prompt
    prompt += """
    Output strictly valid JSON with this structure:
    {
      "slides": [{"title": "...", "content": "..."}],
      "quiz": [{"question": "...", "options": [], "correct": 0, "explanation": "Briefly explain why the correct answer is right."}]
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
        response_text = await vertex_service.generate_text(prompt)
        clean_text = response_text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_text)
        
        # 3. Context-Aware Image Generation
        # Generate a prompt for the image based on the topic and mode
        image_prompt = f"Educational illustration of {body.topic}, {body.mode} friendly style, high quality."
        if body.instruction:
             image_prompt += f" Context: {body.instruction}"
        if body.mode == "adhd":
            image_prompt += " Vibrant, infographic style, minimal clutter."
        
        # Personalize image style based on user interest
        if body.user_id and body.user_id != "guest":
            image_prompt = personalize_prompt(image_prompt, body.user_id, db, context="image")
        
        image_b64 = await vertex_service.generate_image_base64(image_prompt)
        data["image"] = image_b64
        
        # Save History to DB and get session_id
        session_id = save_history_entry_db(
            db=db,
            title=body.topic, 
            preview=data["slides"][0]["content"] if data["slides"] else "Explaining topic...", 
            type="topic",
            data=data,
            user_id=body.user_id
        )
        
        # Return immediately with content (video generates in background)
        return {
            "slides": data["slides"],
            "quiz": data["quiz"],
            "image": data["image"],
            "image_prompt": image_prompt, # Return consistency data
            "session_id": session_id
        }
    except Exception as e:
        logger.error(f"Error explaining topic: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ... (omitted lines)



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
    prompt = brain.get_system_prompt(body.mode, "General", "explanation", user_instruction=body.instruction)
    prompt += f"\n\nTopic: {body.topic}\nCreate 3-5 slides and 2 quiz questions. Return strictly valid JSON (slides, quiz)."
    
    # Force JSON format via prompt injection if not in system prompt
    prompt += """
    Output strictly valid JSON with this structure:
    {
      "slides": [{"title": "...", "content": "..."}],
      "quiz": [{"question": "...", "options": [], "correct": 0, "explanation": "Briefly explain why the correct answer is right."}]
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
        response_text = await vertex_service.generate_text(prompt)
        clean_text = response_text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_text)
        
        # 3. Context-Aware Image Generation
        # Generate a prompt for the image based on the topic and mode
        image_prompt = f"Educational illustration of {body.topic}, {body.mode} friendly style, high quality."
        if body.instruction:
             image_prompt += f" Context: {body.instruction}"
        if body.mode == "adhd":
            image_prompt += " Vibrant, infographic style, minimal clutter."
        
        # Personalize image style based on user interest
        if body.user_id and body.user_id != "guest":
            image_prompt = personalize_prompt(image_prompt, body.user_id, db, context="image")
        
        try:
             # ENABLED
             image_b64 = await vertex_service.generate_image_base64(image_prompt)
             data["image"] = image_b64
             data["image_prompt"] = image_prompt # Return prompt for 3D model generation
             # print("⚠️ Image generation DISABLED to save credits.")
             # 1x1 Transparent PNG Base64
             # data["image"] = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        except Exception as img_error:
             print(f"⚠️ Image generation failed (Quota/Error): {img_error}")
             data["image"] = None
             data["image_error"] = str(img_error)
        
        # Save History to DB and get session_id
        session_id = save_history_entry_db(
            db=db,
            title=body.topic, 
            preview=data["slides"][0]["content"] if data["slides"] else "Explaining topic...", 
            type="topic",
            data=data,
            user_id=body.user_id
        )
        
        # Save History to DB and get session_id
        session_id = save_history_entry_db(
            db=db,
            title=body.topic, 
            preview=data["slides"][0]["content"] if data["slides"] else "Explaining topic...", 
            type="topic",
            data=data,
            user_id=body.user_id
        )
        
        # REMOVED: Background video generation as per user request to optimize performance.
        # It was deemed "extra" and not required for the default flow.
        # if session_id:
        #    print(f"⏩ Skipping background video generation for session {session_id}")
        
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
@limiter.limit("3/minute") # Strict limit for expensive video analysis
async def analyze_video(request: Request, body: VideoAnalysisRequest, db: Session = Depends(get_db)):
    from app.brain import brain
    
    # Note: Without a YouTube Transcriber, we treat the URL as context.
    # Ideally, we'd fetch the transcript here.
    # For now, we prompt Gemini to "use its knowledge of the video if possible" or General Knowledge + URL context.
    
    prompt = brain.get_system_prompt(body.mode, "General", "video_analysis", user_instruction=body.instruction)
    prompt += f"\n\nVideo URL: {body.url}\n"
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

@router.post("/learn/flowchart")
async def generate_flowchart(request: FlowchartRequest):
    prompt = f"""
    Create a flowchart for the topic '{request.topic}' using Mermaid JS syntax.
    Return strictly valid Mermaid code starting with `graph TD`.
    
    CRITICAL SYNTAX RULES:
    1. Every node label MUST be enclosed in double quotes.
    2. Do NOT use parentheses ( ) inside the node IDs (the part before the bracket).
    3. Use <br/> for line breaks inside the quoted labels.
    4. Escape any inner double quotes with backslash.
    
    CORRECT EXAMPLE:
    graph TD
    A["Start Node"] --> B["Node with (parentheses) and <br/> line break"]
    
    INCORRECT EXAMPLE:
    graph TD
    A[Start] --> B[Node with (parentheses)]
    
    Do not wrap in markdown code blocks. Just the raw string.
    """
    
    try:
        response_text = await vertex_service.generate_text(prompt)
        
        # Regex to find the start of the mermaid graph (graph or flowchart followed by direction)
        # Case insensitive to handle 'graph td' etc.
        match = re.search(r"(graph|flowchart)\s+[a-zA-Z0-9]+", response_text, re.IGNORECASE)
        
        if match:
            # Keep everything from the match onwards
            clean_text = response_text[match.start():]
            # Remove any trailing markdown ticks
            clean_text = clean_text.replace("```", "").strip()
        else:
             # Fallback: assume it's just body, clean markdown and prepend
             clean_text = response_text.replace("```mermaid", "").replace("```", "").strip()
             if not clean_text.lower().startswith("graph") and not clean_text.lower().startswith("flowchart"):
                clean_text = "graph TD\n" + clean_text
             
        return {"chart": clean_text}
    except Exception as e:
        logger.error(f"Error generating flowchart: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# REMOVED: Unused generate_video_summary endpoint
# class VideoSummaryRequest(BaseModel):
#     session_id: str
#     user_id: str = "guest"

# @router.post("/learn/video-summary")
# async def generate_video_summary(request: VideoSummaryRequest, db: Session = Depends(get_db)):
#    pass


# --- New Endpoints for DeafLearnMode ---

class FlashcardRequest(BaseModel):
    topic: str
    user_id: str = "guest"

# New logging proxy model
class LogRequest(BaseModel):
    message: str
    level: str = "info" # info, warn, error

@router.post("/learn/log")
async def log_frontend_message(body: LogRequest):
    """Proxies frontend logs to backend terminal for user visibility."""
    prefix = "🌐 [Frontend]:"
    if body.level == "error":
        print(f"❌ {prefix} {body.message}")
    else:
        print(f"ℹ️ {prefix} {body.message}")
    return {"status": "logged"}

class ThreeDModelRequest(BaseModel):
    topic: str
    prompt: Optional[str] = None
    image_url: Optional[str] = None

@router.post("/learn/flashcards")
async def generate_flashcards(request: FlashcardRequest, db: Session = Depends(get_db)):
    from app.services.vertex import vertex_service
    
    prompt = f"Create 6 educational flashcards about '{request.topic}'. "
    prompt += "Each flashcard should have a 'front' (question/term) and 'back' (answer/definition). "
    prompt += "Focus on visual or conceptual clarity. "
    prompt += """
    Output strictly valid JSON:
    [
      {"front": "...", "back": "..."},
      {"front": "...", "back": "..."}
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
    
    # Use explicit prompt if provided, else use topic
    prompt = request.prompt or f"A detailed 3D model of {request.topic}, educational, realistic texturing"
    
    # Prefer Image-to-3D if URL is available (future proofing), else Text-to-3D
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
    """
    Analyze video content and generate emotional captions, flashcards, flowchart, and quiz.
    Designed for deaf/hearing impaired users with visual learning focus.
    """
    from app.brain import brain
    from app.services.vertex import vertex_service
    import re
    
    try:
        # Extract video metadata (title, description) from URL
        video_title = "Video Content"
        video_description = ""
        
        # Simple YouTube URL detection
        if "youtube.com" in body.url or "youtu.be" in body.url:
            # Extract video ID for context
            youtube_match = re.search(r'(?:v=|youtu\.be/)([a-zA-Z0-9_-]{11})', body.url)
            if youtube_match:
                video_id = youtube_match.group(1)
                video_title = f"YouTube Video: {video_id}"
        
        # Get system prompt for deaf mode video analysis
        system_prompt = brain.get_system_prompt(
            user_mode="deaf",
            user_interests=get_user_interest(body.user_id, db) if body.user_id != "guest" else "General Knowledge",
            task_type="video_analysis"
        )
        
        # Create comprehensive user prompt for Gemini
        user_prompt = f"""
Analyze this video and provide comprehensive learning content for a deaf/hearing impaired user:

VIDEO URL: {body.url}
VIDEO TITLE: {video_title}
{f"DESCRIPTION: {video_description}" if video_description else ""}

Please provide the following in STRICT JSON format:

1. EMOTIONAL TRANSCRIPT:
   Break the video content into segments with emotional/prosody markers.
   For each segment, analyze the speaker's tone and delivery:
   - text: The actual spoken content or caption text
   - loudness: "high" (shouting/emphasis/excitement), "normal" (conversational), or "low" (whisper/calm/somber)
   - pitch: "high" (excited/urgent/happy), "normal" (neutral), or "low" (serious/sad/authoritative)
   - speed: "fast" (rushed/energetic), "normal" (conversational), or "slow" (deliberate/thoughtful)

2. FLASHCARDS:
   Create 5-8 flashcards covering key concepts from the video.
   Each flashcard should have:
   - front: Question, term, or concept
   - back: Answer, definition, or explanation

3. FLOWCHART:
   Create a Mermaid diagram (graph TD format) showing the video's structure, main topics, or process flow.
   Use clear node labels and logical connections.

4. QUIZ:
   Create 3-5 multiple choice questions testing understanding of the video content.
   Each question should have:
   - question: The question text
   - options: Array of 4 possible answers
   - correct: Index (0-3) of the correct answer
   - explanation: Brief explanation of why the answer is correct

Return ONLY valid JSON with this EXACT structure (no markdown, no code blocks):
{{
  "transcript": [
    {{"text": "Hello everyone!", "loudness": "high", "pitch": "high", "speed": "normal"}},
    {{"text": "Today we'll explore...", "loudness": "normal", "pitch": "normal", "speed": "normal"}}
  ],
  "flashcards": [
    {{"front": "What is...?", "back": "It is..."}}
  ],
  "flowchart": "graph TD\\n  A[Introduction]-->B[Main Topic]\\n  B-->C[Conclusion]",
  "quiz": [
    {{
      "question": "What was the main topic?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "The video clearly states..."
    }}
  ]
}}

CRITICAL: Return ONLY the JSON object. No additional text, no markdown formatting, no code blocks.
"""
        
        # Call Gemini Vertex API with actual video analysis
        logger.info(f"Analyzing video content: {body.url}")
        response_text = await vertex_service.analyze_video(body.url, system_prompt + "\n\n" + user_prompt)
        
        # Clean response (remove markdown code blocks if present)
        clean_text = response_text.replace("```json", "").replace("```", "").strip()
        
        # Parse JSON response
        data = json.loads(clean_text)
        
        # Validate and structure response
        transcript = [EmotionalSegment(**seg) for seg in data.get("transcript", [])]
        flashcards = [Flashcard(**card) for card in data.get("flashcards", [])]
        flowchart = data.get("flowchart", "graph TD\n  A[Video Content]")
        quiz = [QuizQuestion(**q) for q in data.get("quiz", [])]
        
        logger.info(f"Video analysis successful: {len(transcript)} segments, {len(flashcards)} flashcards, {len(quiz)} quiz questions")
        
        return VideoAnalysisResponse(
            transcript=transcript,
            flashcards=flashcards,
            flowchart=flowchart,
            quiz=quiz
        )
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error: {e}")
        logger.error(f"Response text: {response_text[:500]}")
        # Return fallback data
        return VideoAnalysisResponse(
            transcript=[
                EmotionalSegment(text="Video analysis in progress...", loudness="normal", pitch="normal", speed="normal"),
                EmotionalSegment(text="Please check back shortly.", loudness="low", pitch="low", speed="slow")
            ],
            flashcards=[
                Flashcard(front="Video Content", back="Analysis is being processed")
            ],
            flowchart="graph TD\n  A[Video]-->B[Processing]",
            quiz=[
                QuizQuestion(
                    question="What is this video about?",
                    options=["Topic A", "Topic B", "Topic C", "Topic D"],
                    correct=0,
                    explanation="Video content is being analyzed."
                )
            ]
        )
    except Exception as e:
        logger.error(f"Video analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Video analysis failed: {str(e)}")

@router.post("/learn/extract_audio_features", response_model=AudioFeatureResponse)
@limiter.limit("5/minute")
async def extract_audio_features(
    request: Request,
    body: AudioFeatureRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Extract acoustic features from video audio for Semantic-Emotional Captioning.
    
    This endpoint extracts 5 acoustic features in 500ms windows:
    1. RMS Amplitude (Loudness) → Font weight & size
    2. Fundamental Frequency F0 (Pitch) → Color temperature
    3. Jitter (Voice tremor) → Shake animation
    4. Speech Rate (WPM) → Letter spacing
    5. Spectral Centroid (Brightness) → Text shadow
    """
    from app.services.audio_analysis import audio_analysis_service
    import librosa
    
    audio_path = None
    
    try:
        # Extract audio from URL
        logger.info(f"Extracting audio from: {body.url}")
        audio_path = await audio_analysis_service.extract_audio_from_url(body.url)
        
        if not audio_path:
            raise HTTPException(status_code=400, detail="Failed to extract audio from URL")
        
        # Analyze audio features
        logger.info(f"Analyzing audio features: {audio_path}")
        segments_data = await audio_analysis_service.analyze_audio_features(audio_path)
        
        # Get audio duration
        y, sr = librosa.load(audio_path, sr=audio_analysis_service.sample_rate)
        duration = librosa.get_duration(y=y, sr=sr)
        
        # Convert to Pydantic models
        segments = [
            AcousticSegment(
                timestamp=seg["timestamp"],
                metrics=AudioMetrics(**seg["metrics"])
            )
            for seg in segments_data
        ]
        
        logger.info(f"Audio analysis complete: {len(segments)} segments, {duration:.2f}s duration")
        
        # Schedule cleanup of temp file
        if audio_path:
            background_tasks.add_task(audio_analysis_service.cleanup_temp_file, audio_path)
        
        return AudioFeatureResponse(
            segments=segments,
            duration=round(duration, 2)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Audio feature extraction failed: {e}")
        # Cleanup on error
        if audio_path:
            audio_analysis_service.cleanup_temp_file(audio_path)
        raise HTTPException(status_code=500, detail=f"Audio feature extraction failed: {str(e)}")

class SaveModelRequest(BaseModel):
    model_url: str

@router.post("/learn/save_3d_model")
async def save_3d_model(request: SaveModelRequest):
    """
    Download a 3D model from a remote URL and save it locally.
    Returns the local static URL for the saved model.
    """
    import requests
    import os
    import uuid
    from fastapi.responses import JSONResponse

    try:
        # Create static/models directory if it doesn't exist
        # Using relative path from this file: backend/app/routes/learn.py -> backend/static/models
        # Actually, simpler to rely on the static dir we mounted in main.py
        # backend/static/models
        
        # We need absolute path for file saving
        # backend -> .. -> DrishtiKosh -> frontend -> public -> models
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__))) # backend
        frontend_models_dir = os.path.abspath(os.path.join(base_dir, "..", "frontend", "public", "models"))
        os.makedirs(frontend_models_dir, exist_ok=True)
        
        # Generate unique filename
        filename = f"model_{uuid.uuid4().hex}.glb"
        filepath = os.path.join(frontend_models_dir, filename)
        
        logger.info(f"Downloading model from {request.model_url}...")
        
        # Download the file
        response = requests.get(request.model_url, stream=True)
        response.raise_for_status()
        
        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                
        logger.info(f"Model saved to {filepath}")
        
        # Return frontend-accessible URL (served by Vite from public/)
        local_url = f"/models/{filename}"
        
        return JSONResponse(content={"local_url": local_url})
        
    except Exception as e:
        logger.error(f"Failed to save 3D model: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save model: {str(e)}")


