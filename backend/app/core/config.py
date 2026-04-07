from pydantic_settings import BaseSettings
from typing import Optional
from pydantic import Field, AliasChoices

class Settings(BaseSettings):
    PROJECT_NAME: str = "DrishtiKosh Backend"
    
    # Database
    DATABASE_URL: str = "postgresql://adityajadhav@localhost:5432/drishtikosh_db"
    
    # Vertex AI
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    PROJECT_ID: Optional[str] = None
    LOCATION: str = "us-central1"
    GOOGLE_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("GEMINI_API_KEY", "geminikey"),
    )
    
    # 3D Generation
    MESHY_API_KEY: Optional[str] = None

    # Ollama (Local LLM)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen3:4b"
    
    # JWT Auth
    SECRET_KEY: str  # Must be set in .env
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
