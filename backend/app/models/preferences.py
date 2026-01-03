from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import uuid

class UserPreferences(Base):
    __tablename__ = "user_preferences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    
    # Display
    preferred_language = Column(String, default="en")
    theme = Column(String, default="light")  # light, dark, high-contrast
    font_size = Column(Integer, default=16)
    high_contrast = Column(Boolean, default=False)
    
    # Audio
    tts_voice = Column(String, default="default")
    tts_speed = Column(Float, default=1.0)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = relationship("User", backref="preferences")
