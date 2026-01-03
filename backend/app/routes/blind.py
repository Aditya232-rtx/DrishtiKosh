from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.audio import audio_service
from app.services.vertex import vertex_service
from app.models.blind_conversation import BlindConversation, BlindMessage, ConversationStatus, MessageRole
from typing import Optional
import uuid
from datetime import datetime
import base64

router = APIRouter()

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
1. **CONCISE & SPOKEN-STYLE**: Keep responses short (max 5-7 lines), clear, and natural. Avoid robotic tones.
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

Your Goal: Be the user's eyes and helpful companion.

### CORE BEHAVIOUR RULES
1. **CONCISE & SPOKEN-STYLE**: Keep responses short (max 5-7 lines), clear, and natural. Avoid robotic tones.
2. **NO MARKDOWN**: Do not use bold, italics, or lists. They break text-to-speech.
3. **IMAGE DESCRIPTION**: If an image is provided, describe it vividly but briefly, starting with the most important aspect.

### LANGUAGE BEHAVIOUR RULES
1. **DETECT & MATCH**: Automatically detect the user's language (Hindi, English, Bengali, Tamil, Telugu, Kannada, Malayalam, Marathi, Gujarati, Punjabi, Assamese, Odia, Urdu, Nepali, Sanskrit, Kashmiri, Sindhi). Respond ONLY in that language.
2. **HINGLISH HANDLING**: If the user speaks Hinglish or Hindi in English script, understand it but reply in **CLEAR HINDI (Devanagari script)**. Do not use Roman script for Indian languages.
3. **CLARITY**: Use simple, conversational language. Avoid unnecessary English mixed into Indian languages unless the user explicitly requests it.
4. **FALLBACK**: If you don't understand the language, politely ask for clarification in Hindi or English (e.g., "Sorry, I am still learning this language. Can we continue in Hindi or English?").

### PRONUNCIATION & TTS OPTIMIZATION
- Write text that sounds natural when spoken.
- Use correct native scripts (Devanagari, Tamil, etc.) for Indian languages to ensure the TTS engine pronounces them correctly.
"""

@router.post("/blind/interact")
async def blind_interact(
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
        db.flush()  # Get ID but don't commit yet
    
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
            
            if transcription and transcription not in ["STT Model not available", "Error transcribing audio", ""]:
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

    # 4. Generate Response (Gemini 2.5 Pro)
    # 4. Generate Response (Gemini 2.5 Pro)
    ai_text = ""
    
    # Check if we have any valid input
    if not user_input.strip() and not image_context:
        ai_text = "I'm sorry, I didn't catch that. Could you please speak again?"
    else:
        try:
            ai_text = await vertex_service.generate_text(full_prompt)
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
            language_code=detected_language
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
