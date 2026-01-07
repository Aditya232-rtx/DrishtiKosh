from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.models.preferences import UserPreferences
from app.models.streak import UserStreak
from app.models.goal import UserGoal, GoalType, GoalPeriod
from app.models.achievement import Achievement, UserAchievement
import uuid
from datetime import datetime, date

from app.core.ratelimit import limiter
from starlette.requests import Request

router = APIRouter()

# Pydantic Models
class PreferencesUpdate(BaseModel):
    preferred_language: str | None = None
    theme: str | None = None
    font_size: int | None = None
    high_contrast: bool | None = None
    tts_voice: str | None = None
    tts_speed: float | None = None

class GoalCreate(BaseModel):
    goal_type: str  # "daily_time", "quiz_accuracy", "session_count"
    target_value: float
    period: str  # "daily", "weekly", "monthly"

@router.get("/user/{user_id}/preferences")
async def get_preferences(user_id: str, db: Session = Depends(get_db)):
    prefs = db.query(UserPreferences).filter(UserPreferences.user_id == uuid.UUID(user_id)).first()
    if not prefs:
        # Create default preferences
        prefs = UserPreferences(user_id=uuid.UUID(user_id))
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    return prefs

@router.put("/user/{user_id}/preferences")
@limiter.limit("50/minute")
async def update_preferences(request: Request, user_id: str, update: PreferencesUpdate, db: Session = Depends(get_db)):
    prefs = db.query(UserPreferences).filter(UserPreferences.user_id == uuid.UUID(user_id)).first()
    if not prefs:
        prefs = UserPreferences(user_id=uuid.UUID(user_id))
        db.add(prefs)
    
    # Update fields
    for field, value in update.dict(exclude_unset=True).items():
        setattr(prefs, field, value)
    
    prefs.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(prefs)
    return prefs

@router.get("/user/{user_id}/streak")
async def get_streak(user_id: str, db: Session = Depends(get_db)):
    streak = db.query(UserStreak).filter(UserStreak.user_id == uuid.UUID(user_id)).first()
    if not streak:
        streak = UserStreak(user_id=uuid.UUID(user_id), current_streak=0, longest_streak=0)
        db.add(streak)
        db.commit()
        db.refresh(streak)
    return streak

@router.post("/user/{user_id}/streak/increment")
async def increment_streak(user_id: str, db: Session = Depends(get_db)):
    """Call this when user completes a session"""
    streak = db.query(UserStreak).filter(UserStreak.user_id == uuid.UUID(user_id)).first()
    if not streak:
        streak = UserStreak(user_id=uuid.UUID(user_id))
        db.add(streak)
    
    today = date.today()
    if streak.last_activity_date == today:
        return streak  # Already counted today
    
    # Check if consecutive day
    if streak.last_activity_date and (today - streak.last_activity_date).days == 1:
        streak.current_streak += 1
    else:
        streak.current_streak = 1  # Reset
    
    streak.longest_streak = max(streak.longest_streak, streak.current_streak)
    streak.last_activity_date = today
    
    db.commit()
    db.refresh(streak)
    return streak

@router.get("/user/{user_id}/goals")
async def get_goals(user_id: str, db: Session = Depends(get_db)):
    goals = db.query(UserGoal).filter(UserGoal.user_id == uuid.UUID(user_id)).all()
    return goals

@router.post("/user/{user_id}/goals")
async def create_goal(user_id: str, goal: GoalCreate, db: Session = Depends(get_db)):
    new_goal = UserGoal(
        user_id=uuid.UUID(user_id),
        goal_type=GoalType[goal.goal_type],
        target_value=goal.target_value,
        period=GoalPeriod[goal.period]
    )
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)
    return new_goal

@router.get("/user/{user_id}/achievements")
async def get_user_achievements(user_id: str, db: Session = Depends(get_db)):
    achievements = db.query(UserAchievement).filter(
        UserAchievement.user_id == uuid.UUID(user_id)
    ).join(Achievement).all()
    return achievements

@router.get("/achievements")
async def list_all_achievements(db: Session = Depends(get_db)):
    """Get all available achievements"""
    return db.query(Achievement).all()
