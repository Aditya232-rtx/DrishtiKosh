from fastapi import APIRouter
from pydantic import BaseModel
from app.services.memory import memory_service
from app.services.vertex import vertex_service

from app.core.ratelimit import limiter
from starlette.requests import Request

router = APIRouter()

class ChatRequest(BaseModel):
    user_id: str
    message: str

@router.post("/chat")
@limiter.limit("20/minute")
async def chat_endpoint(request: Request, body: ChatRequest):
    # 1. Retrieve context from memory
    context = await memory_service.retrieve_context(body.user_id, body.message)
    
    # 2. Construct Prompt
    system_instruction = "You are DrishtiKosh, an AI assistant for accessible education. Be helpful, concise, and adaptive."
    if context:
        prompt = f"{system_instruction}\nContext:\n{context}\n\nUser: {body.message}"
    else:
        prompt = f"{system_instruction}\nUser: {body.message}"

    # 3. Generate response via Vertex AI (Gemini)
    response_text = await vertex_service.generate_text(prompt)
    
    # 4. Save interaction to memory
    await memory_service.add_memory(request.user_id, f"User: {request.message}\nAI: {response_text}")
    
    return {"response": response_text}
