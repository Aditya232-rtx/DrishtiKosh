from sqlalchemy import Column, String, DateTime, Boolean, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from datetime import datetime
import uuid
import enum

class LearningPreference(enum.Enum):
    blind = "blind"
    deaf = "deaf"
    adhd = "adhd"


class UserRole(enum.Enum):
    student = "student"
    teacher = "teacher"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    field_of_interest = Column(String, nullable=True)
    learning_preference = Column(String, nullable=True)  # "blind", "deaf", "adhd"
    
    # Personalization v3
    disabilities = Column(String, nullable=True) # Stored as comma-separated string or JSON
    interests = Column(String, nullable=True) # Stored as comma-separated string or JSON
    preferred_analogies = Column(String, nullable=True)
    learning_style = Column(String, nullable=True) # visual, auditory, kinesthetic
    
    role = Column(String, default="student") # "student", "teacher"

    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
