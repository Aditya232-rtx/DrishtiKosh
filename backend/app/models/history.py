from sqlalchemy import Column, String, DateTime, JSON
from app.core.database import Base
from datetime import datetime

class HistoryItem(Base):
    __tablename__ = "history_items"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True)
    title = Column(String)
    type = Column(String)
    preview = Column(String)
    data = Column(JSON)
    timestamp = Column(DateTime, default=datetime.utcnow)
