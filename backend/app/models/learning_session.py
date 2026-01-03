from sqlalchemy import Column, String, DateTime, JSON, Integer, Float, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import uuid
import enum

class SessionType(enum.Enum):
    video = "video"
    topic = "topic"
    image = "image"
    quiz = "quiz"

class SessionStatus(enum.Enum):
    active = "active"
    completed = "completed"
    archived = "archived"

class LearningSession(Base):
    __tablename__ = "learning_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    
    type = Column(SQLEnum(SessionType))
    title = Column(String)
    preview = Column(String, nullable=True)
    content_data = Column(JSONB)  # Slides, images, quiz questions
    
    status = Column(SQLEnum(SessionStatus), default=SessionStatus.active)
    
    # Stats
    quiz_score = Column(Float, nullable=True)
    quiz_accuracy = Column(Float, nullable=True)  # Percentage
    total_time_spent = Column(Integer, default=0)  # seconds
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationship
    user = relationship("User", backref="learning_sessions")
    quiz_progress = relationship("QuizProgress", back_populates="session", uselist=False, cascade="all, delete-orphan")
