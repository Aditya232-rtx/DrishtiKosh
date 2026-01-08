from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.learning_session import LearningSession
import json

# Setup DB connection
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def check_latest_sessions():
    print("\n🔍 Checking Latest 3 Learning Sessions in DB...\n")
    
    sessions = db.query(LearningSession).order_by(LearningSession.created_at.desc()).limit(3).all()
    
    if not sessions:
        print("❌ No sessions found in database.")
        return

    for session in sessions:
        print(f"🆔 ID: {session.id}")
        print(f"👤 User ID: {session.user_id}")
        print(f"📅 Time: {session.created_at}")
        print(f"📌 Title: {session.title}")
        print(f"🏷️ Type: {session.type}")
        
        if session.content_data:
            data = session.content_data
            slides = data.get('slides', [])
            quiz = data.get('quiz', [])
            print(f"✅ Content: {len(slides)} Slides, {len(quiz)} Quiz Questions")
            if slides:
                print(f"   First Slide: {slides[0].get('title')}")
        else:
            print("❌ Content Data is EMPTY")
        print("-" * 40)

if __name__ == "__main__":
    check_latest_sessions()
