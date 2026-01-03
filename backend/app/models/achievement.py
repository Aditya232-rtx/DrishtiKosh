from sqlalchemy import Column, String, Enum as SQLEnum, ForeignKey, DateTime, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import uuid
import enum

class AchievementCategory(enum.Enum):
    sessions = "sessions"
    quiz = "quiz"
    streak = "streak"
    custom = "custom"

class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True)
    description = Column(String)
    icon = Column(String)  # Trophy color/type
    category = Column(SQLEnum(AchievementCategory))
    requirement = Column(JSONB)  # {type: "session_count", value: 5}
    
    # Relationship
    user_achievements = relationship("UserAchievement", back_populates="achievement", cascade="all, delete-orphan")

class UserAchievement(Base):
    __tablename__ = "user_achievements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    achievement_id = Column(UUID(as_uuid=True), ForeignKey("achievements.id", ondelete="CASCADE"))
    
    unlocked_at = Column(DateTime, default=datetime.utcnow)
    progress = Column(Float, default=0.0)  # 0.0-1.0 for partial achievements
    
    # Relationships
    user = relationship("User", backref="achievements")
    achievement = relationship("Achievement", back_populates="user_achievements")
