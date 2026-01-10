
import sys
import os
from sqlalchemy import text
from dotenv import load_dotenv

# Add the parent directory to sys.path to make app importable
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load env vars from backend/.env
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(env_path)

from app.core.database import engine

def add_role_column():
    print("Checking for 'role' column in 'users' table...")
    with engine.connect() as connection:
        # Check if column exists (PostgreSQL specific check, or generic try/except)
        try:
            result = connection.execute(text("SELECT role FROM users LIMIT 1"))
            print("'role' column already exists.")
        except Exception:
            print("'role' column not found. Adding it...")
            connection.rollback() # Rollback the failed transaction
            try:
                # Add the column
                connection.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'student'"))
                connection.commit()
                print("'role' column added successfully.")
            except Exception as e:
                print(f"Error adding column: {e}")

if __name__ == "__main__":
    add_role_column()
