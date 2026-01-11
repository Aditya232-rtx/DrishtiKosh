import os
import sys
# Add the backend directory to sys.path to allow imports
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load env manually to avoid Pydantic validation errors from backend.app.core.config
# if some vars are missing in the shell context.
load_dotenv(os.path.join(os.path.dirname(__file__), 'backend', '.env'))

# Setup DB connection
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # No DATABASE_URL? construct it.
    DB_USER = os.getenv("POSTGRES_USER", "postgres")
    DB_PASS = os.getenv("POSTGRES_PASSWORD", "anmol2006")
    DB_HOST = os.getenv("POSTGRES_SERVER", "localhost")
    DB_PORT = os.getenv("POSTGRES_PORT", "5432")
    DB_NAME = os.getenv("POSTGRES_DB", "drishtikosh_db")
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    print(f"Constructed DATABASE_URL: {DATABASE_URL}")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def fetch_last_image():
    db = SessionLocal()
    try:
        # Query for the last 10 sessions
        result = db.execute(text("SELECT id, title, created_at, content_data FROM learning_sessions ORDER BY created_at DESC LIMIT 10"))
        rows = result.fetchall()
        
        found = False
        for row in rows:
            print(f"Checking session: {row.title} ({row.created_at})")
            content_data = row.content_data
            
            if content_data and "image" in content_data and content_data["image"]:
                image_b64 = content_data["image"]
                print(f"✅ Found image in session: {row.title}")
                print(f"Size: {len(image_b64)} bytes")
                
                output_path = "last_generated_image.txt"
                with open(output_path, "w") as f:
                    f.write(image_b64)
                print(f"💾 Saved Base64 image data to {output_path}")
                found = True
                break
            else:
                 print(f"   (No image data)")
                 
        if not found:
            print("❌ No images found in the last 10 sessions.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fetch_last_image()
