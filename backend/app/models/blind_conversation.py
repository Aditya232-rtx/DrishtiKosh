from sqlalchemy import Column, String, Text, Boolean, ForeignKey, DateTime, Integer, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import uuid
import enum

class ConversationStatus(enum.Enum):
    active = "active"
    ended = "ended"

class MessageRole(enum.Enum):
    user = "user"
    ai = "ai"

class BlindConversation(Base):
    __tablename__ = "blind_conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    message_count = Column(Integer, default=0)
    status = Column(SQLEnum(ConversationStatus), default=ConversationStatus.active)
    
    # Relationship
    messages = relationship("BlindMessage", back_populates="conversation", cascade="all, delete-orphan")
    user = relationship("User", backref="blind_conversations")

class BlindMessage(Base):
    __tablename__ = "blind_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("blind_conversations.id", ondelete="CASCADE"), index=True)
    
    role = Column(SQLEnum(MessageRole))
    content = Column(Text)
    has_image = Column(Boolean, default=False)
    image_description = Column(Text, nullable=True)
    audio_processed = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationship
    conversation = relationship("BlindConversation", back_populates="messages")
