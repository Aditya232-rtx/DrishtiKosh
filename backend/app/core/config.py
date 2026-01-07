from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "DrishtiKosh Backend"
    
    # Database
    DATABASE_URL: str = "postgresql://adityajadhav@localhost:5432/drishtikosh_db"
    
    # Vertex AI
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    PROJECT_ID: Optional[str] = None
    LOCATION: str = "us-central1"
    
    # JWT Auth
    SECRET_KEY: str  # Must be set in .env
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
