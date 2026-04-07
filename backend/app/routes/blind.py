from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from starlette.websockets import WebSocketState
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.audio import audio_service
from app.services.vertex import vertex_service
from app.services.ollama import ollama_service
from app.models.blind_conversation import BlindConversation, BlindMessage, ConversationStatus, MessageRole
from app.models.learning_session import LearningSession, SessionType
from app.models.learning_session import LearningSession, SessionType
from app.core.utils import personalize_prompt
from app.core.personalization import build_personalized_system_instruction, DEFAULT_SYSTEM_INSTRUCTION
from app.core.database import SessionLocal
from typing import Optional
import uuid
import asyncio
import json
import os
from datetime import datetime
import base64
from google import genai

from google.genai.types import HttpOptions

router = APIRouter()
from app.core.config import settings

# --- Gemini Live Configuration ---
PROJECT_ID = settings.PROJECT_ID
LOCATION = settings.LOCATION
GEMINI_API_KEY = settings.GEMINI_API_KEY or settings.GOOGLE_API_KEY

if GEMINI_API_KEY:
    print("✅ Gemini Live: Using API key mode")
    try:
        client = genai.Client(
            api_key=GEMINI_API_KEY,
            http_options=HttpOptions(api_version="v1beta")
        )
    except Exception as e:
        print(f"❌ Failed to initialize Gemini API-key client: {e}")
        client = None
    MODEL = "models/gemini-3.1-flash-live-preview"
elif PROJECT_ID:
    print(f"✅ Gemini Live: Using Vertex AI (Project: {PROJECT_ID}, Location: {LOCATION})")
    try:
        client = genai.Client(
            vertexai=True,
            project=PROJECT_ID,
            location=LOCATION,
            http_options=HttpOptions(api_version="v1beta1")
        )
    except Exception as e:
        print(f"❌ Failed to initialize Vertex AI Client: {e}")
        client = None
    MODEL = "gemini-2.0-flash-live-preview-04-09"
else:
    print("❌ CRITICAL ERROR: No Gemini API key or Vertex project configuration found.")
    client = None
    MODEL = "gemini-2.0-flash-live-001"

@router.websocket("/blind/live")
async def blind_live_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("🔌 WebSocket connected: /blind/live")
    
    # Create database session manually for WebSocket context
    db = SessionLocal()
    
    try:
        # Extract user_id from query parameters
        query_params = dict(websocket.query_params)
        user_id = query_params.get("user_id")
        
        if not user_id:
            print("⚠️ No user_id provided, using default instruction")
            system_instruction_text = DEFAULT_SYSTEM_INSTRUCTION
        else:
            print(f"✅ Building personalized instruction for user: {user_id}")
            system_instruction_text = build_personalized_system_instruction(user_id, db)

        if not client:
            print("❌ Client not initialized")
            await websocket.close(code=1011)
            return

        # Initialize Gemini Live Session
        config = {
            "response_modalities": ["AUDIO"],
            "system_instruction": {
                "parts": [{"text": system_instruction_text}]
            }
        }
        
        async with client.aio.live.connect(model=MODEL, config=config) as session:
            print(f"✅ Connected to Gemini Live: {MODEL}")
            
            # LATENCY OPTIMIZATION: No buffering - stream everything immediately
            # Gemini Live's internal VAD handles turn-taking and barge-in
            
            async def send_to_gemini(data, end_of_turn=False):
                try:
                     if end_of_turn:
                         await session.send_realtime_input(audio_stream_end=True)
                     else:
                         await session.send_realtime_input(
                             audio={"data": data, "mime_type": "audio/pcm"}
                         )
                except Exception as e:
                    print(f"❌ Error sending to Gemini: {e}")

            # Task: Receive from Frontend -> Send to Gemini
            async def receive_from_client():
                try:
                    while True:
                        message = await websocket.receive()
                        if message.get("type") == "websocket.disconnect":
                            print("⚠️ Client disconnected")
                            break
                        
                        if "bytes" in message:
                            # Stream user audio immediately
                            await send_to_gemini(message["bytes"], end_of_turn=False)
                            
                        elif "text" in message:
                             data = json.loads(message["text"])
                             if data.get("type") == "input_end":
                                 print("🛑 Input End - Committing turn")
                                 # Signal end of user turn to Gemini
                                 await send_to_gemini(b"", end_of_turn=True)
                                 
                except WebSocketDisconnect:
                    print("⚠️ Client disconnected")
                except asyncio.CancelledError:
                    return
                except Exception as e:
                    print(f"❌ Error in receive_from_client: {e}")

            # Task: Receive from Gemini -> Stream to Frontend (zero buffering)
            async def receive_from_gemini():
                try:
                    async for response in session.receive():
                        if websocket.client_state != WebSocketState.CONNECTED:
                            break
                        if response.server_content:
                            if response.server_content.model_turn:
                                for part in response.server_content.model_turn.parts:
                                    # Stream TEXT immediately
                                    if part.text:
                                        msg = json.dumps({"type": "text", "role": "ai", "content": part.text})
                                        if websocket.client_state == WebSocketState.CONNECTED:
                                            await websocket.send_text(msg)

                                    # Stream AUDIO immediately (critical for low latency)
                                    if part.inline_data:
                                        if websocket.client_state == WebSocketState.CONNECTED:
                                            await websocket.send_bytes(part.inline_data.data)
                            
                            if response.server_content.turn_complete:
                                print("🏁 Gemini Turn Complete")
                                if websocket.client_state == WebSocketState.CONNECTED:
                                    await websocket.send_text(json.dumps({"type": "turn_complete"}))

                except asyncio.CancelledError:
                    return
                except Exception as e:
                    print(f"❌ Error in receive_from_gemini: {e}")

            # Run tasks concurrently and stop cleanly when either side ends
            client_task = asyncio.create_task(receive_from_client())
            gemini_task = asyncio.create_task(receive_from_gemini())
            done, pending = await asyncio.wait(
                {client_task, gemini_task},
                return_when=asyncio.FIRST_COMPLETED,
            )

            for task in pending:
                task.cancel()
            await asyncio.gather(*pending, return_exceptions=True)

            for task in done:
                exc = task.exception()
                if exc:
                    print(f"❌ Blind live task ended with error: {exc}")
    
    except Exception as e:
        print(f"❌ WebSocket Global Error: {e}")
    finally:
        db.close()
        try:
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.close()
        except Exception:
            pass
 

# EXPLICIT SUPPORTED LANGUAGES - Only these 12 Indian languages + English
SUPPORTED_LANGUAGES = {
    'hi': {'name': 'Hindi', 'script': 'Devanagari'},
    'en': {'name': 'English', 'script': 'Latin'},
    'bn': {'name': 'Bengali', 'script': 'Bengali'},
    'ta': {'name': 'Tamil', 'script': 'Tamil'},
    'te': {'name': 'Telugu', 'script': 'Telugu'},
    'kn': {'name': 'Kannada', 'script': 'Kannada'},
    'ml': {'name': 'Malayalam', 'script': 'Malayalam'},
    'mr': {'name': 'Marathi', 'script': 'Devanagari'},
    'gu': {'name': 'Gujarati', 'script': 'Gujarati'},
    'pa': {'name': 'Punjabi', 'script': 'Gurmukhi'},
    'as': {'name': 'Assamese', 'script': 'Bengali'},
    'or': {'name': 'Odia', 'script': 'Odia'},
}

LANGUAGE_CODES = list(SUPPORTED_LANGUAGES.keys())
LANGUAGE_NAMES = ', '.join([lang['name'] for lang in SUPPORTED_LANGUAGES.values()])

SYSTEM_PROMPT = f"""You are Drishti, an intelligent and compassionate AI assistant designed for visually impaired users.
Your Goal: Be the user's eyes and helpful companion.

### CORE BEHAVIOUR RULES
1. **MEDIUM LENGTH & CONVERSATIONAL**: Keep responses medium length (approx 3-4 sentences), informative but natural. Avoid long monologues.
2. **NO MARKDOWN**: Do not use bold, italics, or lists. They break text-to-speech.
3. **IMAGE DESCRIPTION**: If an image is provided, describe it vividly but briefly, starting with the most important aspect.

### LANGUAGE BEHAVIOUR RULES
1. **DETECT & MATCH**: Automatically detect the user's language from this EXACT list: {LANGUAGE_NAMES}. Respond ONLY in that detected language.
2. **STRICT LANGUAGE CONSTRAINT**: ONLY use languages from the supported list. Do not respond in unsupported languages.
3. **HINGLISH HANDLING**: If the user speaks Hinglish or Hindi in English script, understand it but reply in **CLEAR HINDI (Devanagari script)**. Do not use Roman script for Indian languages.
4. **CLARITY**: Use simple, conversational language. Avoid unnecessary English mixed into Indian languages unless the user explicitly requests it.
5. **FALLBACK**: If you don't understand the language or it's not in the supported list, politely ask for clarification in Hindi or English (e.g., "Sorry, I am still learning this language. Can we continue in Hindi or English?").

### PRONUNCIATION & TTS OPTIMIZATION
- Write text that sounds natural when spoken.
- Use correct native scripts (Devanagari for Hindi/Marathi, Tamil script for Tamil, Telugu for Telugu, etc.) to ensure the TTS engine pronounces them correctly.
- For Hindi: Use proper Devanagari punctuation (। for period, ॥ for double period)
- For other Indian languages: Use appropriate script-specific punctuation
"""

from app.core.ratelimit import limiter
from starlette.requests import Request

@router.post("/blind/interact")
@limiter.limit("20/minute")
async def blind_interact(
    request: Request,
    audio: Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    conversation_id: Optional[str] = Form(None),
    user_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    print(f"DEBUG: blind_interact called. Audio: {audio}, Image: {image}, Text: {text}")
    if audio:
        print(f"DEBUG: Audio filename: {audio.filename}, Content-Type: {audio.content_type}")
    if conversation_id:
        conversation = db.query(BlindConversation).filter(
            BlindConversation.id == uuid.UUID(conversation_id)
        ).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        # Create new conversation
        conversation = BlindConversation(
            id=uuid.uuid4(),
            user_id=uuid.UUID(user_id) if user_id else None,
            started_at=datetime.utcnow(),
            status=ConversationStatus.active,
            message_count=0
        )
        db.add(conversation)
        db.flush()  # Get ID

        # Create linked Learning Session for History/Dashboard
        if conversation_id is None: # Only for new conversations
            # Default title based on input or date
            title = text[:30] + "..." if text else (f"Image Analysis" if image else "Blind Session")
            
            learning_session = LearningSession(
                user_id=uuid.UUID(user_id) if user_id else None,
                type=SessionType.blind,
                title=title,
                content_data={"blind_conversation_id": str(conversation.id)}
            )
            db.add(learning_session)
    
    user_input = text or ""
    transcription = ""
    image_context = ""
    detected_language = "en"  # Default to English
    detected_language_name = "English"

    # 1. Pipeline: Audio -> Text (with automatic language detection)
    if audio:
        try:
            content = await audio.read()
            stt_result = await audio_service.speech_to_text(content)
            
            # Handle dict response from new multilingual STT
            if isinstance(stt_result, dict):
                transcription = stt_result.get("text", "")
                detected_language = stt_result.get("language", "en")
                detected_language_name = stt_result.get("language_name", "English")
                print(f"DEBUG: STT Transcription: '{transcription}' (Language: {detected_language_name})")
            else:
                # Fallback for old string response
                transcription = str(stt_result)
                print(f"DEBUG: STT Transcription (legacy): '{transcription}'")
            
            if transcription and transcription not in ["STT Model not available", "Error transcribing audio", "", "STT Disabled"]:
                user_input += f" {transcription}"
            else:
                print("DEBUG: STT returned empty or unavailable")
        except Exception as e:
            print(f"STT Error: {e}")

    # 2. Pipeline: Image -> Description
    if image:
        try:
            image_bytes = await image.read()
            image_context = await vertex_service.analyze_image(image_bytes, prompt="Describe this image in detail for a blind user.")
            image_context = f"[Image Context: {image_context}]"
        except Exception as e:
            print(f"Vision Error: {e}")

    # 3. Build prompt with recent history
    recent_messages = db.query(BlindMessage).filter(
        BlindMessage.conversation_id == conversation.id
    ).order_by(BlindMessage.created_at.desc()).limit(10).all()
    
    recent_messages.reverse()  # Chronological order
    history_text = "\n".join([f"{msg.role.value}: {msg.content}" for msg in recent_messages])
    
    full_prompt = f"{SYSTEM_PROMPT}\n\nHistory:\n{history_text}\n\nUser Input:\n{image_context}\n[User Language: {detected_language_name}]\n{user_input}\n\nDrishti:"
    
    # Personalize prompt based on user interest
    if user_id:
        full_prompt = personalize_prompt(full_prompt, user_id, db, context="conversation")

    # 4. Generate Response (Gemini 2.5 Pro)
    # 4. Generate Response (Gemini 2.5 Pro)
    ai_text = ""
    
    # Check if we have any valid input
    if not user_input.strip() and not image_context:
        ai_text = "I'm sorry, I didn't catch that. Could you please speak again?"
    else:
        try:
            ai_text = await ollama_service.generate_text(full_prompt)
        except Exception as e:
            ai_text = "I'm having trouble connecting to my brain right now. Please try again."
            print(f"Generation Error: {e}")

    # 5. Save messages to DB
    user_message = BlindMessage(
        conversation_id=conversation.id,
        role=MessageRole.user,
        content = f"{image_context} {user_input}".strip(),
        has_image=bool(image),
        image_description=image_context if image else None,
        audio_processed=bool(audio)
    )
    db.add(user_message)
    
    ai_message = BlindMessage(
        conversation_id=conversation.id,
        role=MessageRole.ai,
        content=ai_text,
        audio_processed=False  # Will be processed by TTS
    )
    db.add(ai_message)
    
    # Update conversation count
    conversation.message_count += 2
    
    db.commit()

    # 6. Pipeline: Text -> Audio (with language-specific voice)
    try:
        print(f"DEBUG: AI Text to convert: '{ai_text}' (Language: {detected_language})")
        audio_buffer = await audio_service.text_to_speech(
            ai_text,
            language_code=detected_language,
            user_id=user_id,
            db_session=db
        )
        if audio_buffer:
            print(f"DEBUG: Audio generated successfully with {detected_language_name} voice")
            audio_b64 = base64.b64encode(audio_buffer.read()).decode('utf-8') 
        else:
            print("DEBUG: Audio generation returned None")
            audio_b64 = None
    except Exception as e:
        print(f"TTS Error: {e}")
        audio_b64 = None

    print(f"DEBUG: Returning response. Audio present: {bool(audio_b64)}")

    return {
        "conversation_id": str(conversation.id),
        "user_transcript": user_input.strip(),
        "ai_response": ai_text,
        "audio_base64": audio_b64
    }

@router.post("/blind/end_conversation")
async def end_conversation(conversation_id: str, db: Session = Depends(get_db)):
    """End an active conversation"""
    conversation = db.query(BlindConversation).filter(
        BlindConversation.id == uuid.UUID(conversation_id)
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conversation.ended_at = datetime.utcnow()
    conversation.status = ConversationStatus.ended
    db.commit()
    
    return {"message": "Conversation ended"}

@router.get("/blind/history/{user_id}")
async def get_conversation_history(user_id: str, db: Session = Depends(get_db)):
    """Get all conversations for a user"""
    conversations = db.query(BlindConversation).filter(
        BlindConversation.user_id == uuid.UUID(user_id)
    ).order_by(BlindConversation.started_at.desc()).all()
    
    return conversations

@router.get("/blind/messages/{conversation_id}")
async def get_conversation_messages(conversation_id: str, db: Session = Depends(get_db)):
    """Get all messages for a specific conversation"""
    messages = db.query(BlindMessage).filter(
        BlindMessage.conversation_id == uuid.UUID(conversation_id)
    ).order_by(BlindMessage.created_at.asc()).all()
    
    return [
        {
            "role": msg.role.value,
            "content": msg.content,
            "has_image": msg.has_image,
            "image_description": msg.image_description
        } for msg in messages
    ]
