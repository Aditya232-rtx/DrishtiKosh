from sqlalchemy import Column, Integer, String, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class AccessibilityProfile(Base):
    __tablename__ = "accessibility_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    # Profile data: { "disability": "blind", "preferences": {...} }
    profile_data = Column(JSON)
    
    user = relationship("User", backref="accessibility_profile")

# RLS Policy Note:
# ALTER TABLE accessibility_profiles ENABLE ROW LEVEL SECURITY;
# CREATE POLICY user_access_policy ON accessibility_profiles
# FOR ALL
# TO public
# USING (user_id = current_setting('app.current_user_id')::integer);
