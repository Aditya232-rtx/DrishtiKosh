from sqlalchemy import Column, Enum as SQLEnum, Float, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import uuid
import enum

class GoalType(enum.Enum):
    daily_time = "daily_time"
    quiz_accuracy = "quiz_accuracy"
    session_count = "session_count"

class GoalPeriod(enum.Enum):
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"

class UserGoal(Base):
    __tablename__ = "user_goals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    
    goal_type = Column(SQLEnum(GoalType))
    target_value = Column(Float)  # 85 (for 85%)
    current_value = Column(Float, default=0.0)
    period = Column(SQLEnum(GoalPeriod))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = relationship("User", backref="goals")
