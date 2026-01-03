from sqlalchemy import Column, Integer, Boolean, ForeignKey, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid

class QuizProgress(Base):
    __tablename__ = "quiz_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("learning_sessions.id", ondelete="CASCADE"), unique=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    
    current_question_index = Column(Integer, default=0)
    answers = Column(JSONB, default=list)  # [{question_id, user_answer, is_correct, timestamp}]
    score = Column(Integer, default=0)
    total_questions = Column(Integer, default=0)
    completed = Column(Boolean, default=False)
    
    # Relationship
    session = relationship("LearningSession", back_populates="quiz_progress")
    user = relationship("User", backref="quiz_progress_records")
