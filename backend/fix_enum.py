from sqlalchemy import text
from app.core.database import SessionLocal

def fix_enum():
    db = SessionLocal()
    try:
        # Check if value exists first to avoid error?
        # Postgres throws error if value exists? No, it throws error if adding duplicate?
        # Actually 'ADD VALUE IF NOT EXISTS' is supported in newer PG versions.
        # Let's try direct add.
        
        # We need to execute outside of transaction for some enum operations?
        # Trying standard execution.
        try:
            db.execute(text("ALTER TYPE sessiontype ADD VALUE 'blind';"))
            db.commit()
            print("Successfully added 'blind' to sessiontype enum.")
        except Exception as e:
            print(f"Error adding value (maybe exists?): {e}")
            
    except Exception as e:
        print(f"General Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_enum()
