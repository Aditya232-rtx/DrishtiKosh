from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
import warnings

# Suppress warnings for clean logs
warnings.filterwarnings("ignore", category=UserWarning, module="vertexai")
warnings.filterwarnings("ignore", message=".*Flash attention 2.*")

# Import models to ensure tables are created
from app.models import user, accessibility, history 

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME)

from app.routes import chat, blind, learn, auth, user

app.include_router(auth.router, prefix="/api/auth")
app.include_router(user.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(blind.router, prefix="/api")
app.include_router(learn.router, prefix="/api")

# CORS Configuration
origins = [
    "http://localhost:5173",  # React Frontend (Vite default)
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",  # Frontend running via Python HTTP Server
    "http://localhost:8080",
    "http://localhost:8081",
    "http://localhost:8082",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to DrishtiKosh Backend"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
