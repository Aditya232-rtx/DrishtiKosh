from sqlalchemy.orm import Session
from app.models.user import User
import uuid

# Interest-to-Style Mapping
INTEREST_STYLES = {
    "sports": {
        "tone": "energetic, competitive, motivational",
        "visual_style": "dynamic, action-oriented, vibrant",
        "examples": "team strategies, athletic performance, competitive scenarios",
        "tts_rate": 1.1,  # Slightly faster
        "video_theme": "high-energy sports montage"
    },
    "music": {
        "tone": "rhythmic, expressive, harmonious",
        "visual_style": "abstract, colorful, flowing",
        "examples": "musical harmonies, rhythmic patterns, melodic concepts",
        "tts_rate": 1.0,  # Normal
        "video_theme": "music visualization with notes and instruments"
    },
    "art": {
        "tone": "contemplative, descriptive, creative",
        "visual_style": "artistic, painterly, aesthetically rich",
        "examples": "color theory, composition, artistic techniques",
        "tts_rate": 0.95,  # Slightly slower for contemplation
        "video_theme": "gallery-style art presentation"
    },
    "technology": {
        "tone": "precise, analytical, systematic",
        "visual_style": "clean, modern, diagrammatic",
        "examples": "algorithms, system architectures, technical processes",
        "tts_rate": 1.0,  # Normal
        "video_theme": "tech demo with code and diagrams"
    },
    "science": {
        "tone": "curious, methodical, exploratory",
        "visual_style": "diagram-heavy, labeled, educational",
        "examples": "scientific experiments, natural phenomena, research findings",
        "tts_rate": 1.0,  # Normal
        "video_theme": "documentary-style science explanation"
    },
    "history": {
        "tone": "narrative, contextual, storytelling",
        "visual_style": "timeline-based, period-accurate, archival",
        "examples": "historical events, timelines, cultural context",
        "tts_rate": 0.95,  # Slightly slower for narrative
        "video_theme": "historical documentary with timeline graphics"
    },
    "literature": {
        "tone": "narrative, eloquent, literary",
        "visual_style": "book-like, text-focused, elegant",
        "examples": "literary devices, character analysis, narrative structures",
        "tts_rate": 0.95,  # Slower for appreciation
        "video_theme": "book presentation with quotes and typography"
    },
    "mathematics": {
        "tone": "logical, step-by-step, problem-solving",
        "visual_style": "equation-focused, graph-based, structured",
        "examples": "mathematical proofs, equations, geometric patterns",
        "tts_rate": 1.0,  # Normal
        "video_theme": "animated equations and problem-solving"
    },
    "default": {
        "tone": "neutral, clear, balanced",
        "visual_style": "simple, straightforward, accessible",
        "examples": "everyday scenarios, common situations",
        "tts_rate": 1.0,  # Normal
        "video_theme": "clean educational presentation"
    }
}

def get_user_interest(user_id: str, db: Session) -> str:
    """
    Retrieve user's field of interest from database.
    Returns 'default' if not found or not set.
    """
    try:
        user_uuid = uuid.UUID(user_id)
        user = db.query(User).filter(User.id == user_uuid).first()
        
        if user and user.field_of_interest:
            # Normalize to lowercase
            interest = user.field_of_interest.lower().strip()
            # Return the interest if it's in our mapping, otherwise default
            return interest if interest in INTEREST_STYLES else "default"
        
        return "default"
    except (ValueError, Exception) as e:
        print(f"Error fetching user interest: {e}")
        return "default"

def get_interest_style(interest: str) -> dict:
    """
    Get the style configuration for a given interest.
    Returns default style if interest not found.
    """
    return INTEREST_STYLES.get(interest.lower(), INTEREST_STYLES["default"])

def personalize_prompt(base_prompt: str, user_id: str, db: Session, context: str = "general") -> str:
    """
    Enhance a prompt with user's interest-based personalization.
    
    Args:
        base_prompt: The original prompt text
        user_id: User's UUID string
        db: Database session
        context: Type of content (options: 'explanation', 'quiz', 'image', 'conversation')
    
    Returns:
        Personalized prompt string
    """
    interest = get_user_interest(user_id, db)
    style = get_interest_style(interest)
    
    if interest == "default":
        return base_prompt
    
    # Context-specific personalization
    if context == "explanation":
        personalization = f"\n\nPersonalization Note: The user is passionate about {interest}. Use {style['examples']} in your explanations to make concepts relatable and engaging."
    elif context == "quiz":
        personalization = f"\n\nPersonalization Note: Frame quiz questions using {interest}-related scenarios. Examples: {style['examples']}."
    elif context == "image":
        personalization = f"In {style['visual_style']} style: "
        return personalization + base_prompt  # Prefix for images
    elif context == "conversation":
        personalization = f"\n\nPersonalization Note: The user is interested in {interest}. When appropriate, use analogies or examples from {style['examples']} to illustrate your points."
    else:
        personalization = f"\n\nUser Interest: {interest}. Tailor examples to this domain when relevant."
    
    return base_prompt + personalization

def get_tts_rate_for_interest(user_id: str, db: Session) -> float:
    """
    Get the optimal TTS speaking rate based on user interest.
    Returns a multiplier (0.75 - 1.25)
    """
    interest = get_user_interest(user_id, db)
    style = get_interest_style(interest)
    return style.get("tts_rate", 1.0)

def get_video_theme_for_interest(user_id: str, db: Session) -> str:
    """
    Get the video generation theme based on user interest.
    Used for Veo 3 video generation prompts.
    """
    interest = get_user_interest(user_id, db)
    style = get_interest_style(interest)
    return style.get("video_theme", "clean educational presentation")
