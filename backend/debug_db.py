import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "drishtikosh_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "anmol2006")
DB_PORT = os.getenv("DB_PORT", "5432")

try:
    conn = psycopg2.connect(dbname=DB_NAME, user=DB_USER, host=DB_HOST, password=DB_PASS, port=DB_PORT)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    """)
    tables = cursor.fetchall()
    
    print("Tables in database:", [t[0] for t in tables])
    
    # describe users table if it exists
    if ('users',) in tables:
        cursor.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'")
        cols = cursor.fetchall()
        print("Users table columns:", cols)

    # Check alembic_version
    if ('alembic_version',) in tables:
        cursor.execute("SELECT * FROM alembic_version")
        ver = cursor.fetchall()
        print("Alembic version:", ver)

    conn.close()

except Exception as e:
    print(f"Error: {e}")
