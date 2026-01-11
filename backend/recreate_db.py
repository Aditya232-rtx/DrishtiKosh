import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from dotenv import load_dotenv
from urllib.parse import urlparse

load_dotenv()

database_url = os.getenv("DATABASE_URL")
if database_url:
    parsed = urlparse(database_url)
    DB_HOST = parsed.hostname
    DB_USER = parsed.username
    DB_PASS = parsed.password
    DB_PORT = parsed.port or 5432
else:
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASS = os.getenv("DB_PASS", "anmol2006")
    DB_PORT = os.getenv("DB_PORT", "5432")

DB_NAME = "drishtikosh_db"

def recreate_db():
    try:
        # Connect to 'postgres' db to perform drop/create
        conn = psycopg2.connect(dbname='postgres', user=DB_USER, host=DB_HOST, password=DB_PASS, port=DB_PORT)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        print(f"Dropping database {DB_NAME} if exists...")
        cursor.execute(f"DROP DATABASE IF EXISTS {DB_NAME} WITH (FORCE)")
        
        print(f"Creating database {DB_NAME}...")
        cursor.execute(f"CREATE DATABASE {DB_NAME}")
        print("Database recreated successfully!")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    recreate_db()
