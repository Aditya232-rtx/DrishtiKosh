# Import all models so Alembic can detect them
from app.models.user import User
from app.models.preferences import UserPreferences
from app.models.blind_conversation import BlindConversation, BlindMessage
from app.models.learning_session import LearningSession
from app.models.quiz_progress import QuizProgress
from app.models.achievement import Achievement, UserAchievement
from app.models.streak import UserStreak
from app.models.goal import UserGoal
from app.models.accessibility import AccessibilityProfile

# Legacy (will be migrated to LearningSession)
from app.models.history import HistoryItem

__all__ = [
    "User",
    "UserPreferences",
    "BlindConversation",
    "BlindMessage",
    "LearningSession",
    "QuizProgress",
    "Achievement",
    "UserAchievement",
    "UserStreak",
    "UserGoal",
    "AccessibilityProfile",
    "HistoryItem",
]
