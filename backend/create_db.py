import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from dotenv import load_dotenv
from urllib.parse import urlparse

load_dotenv()

# Connection details
# Parse DATABASE_URL if available, otherwise use individual vars or default to potentially unsafe hardcoded values for dev
database_url = os.getenv("DATABASE_URL")
if database_url:
    parsed = urlparse(database_url)
    DB_HOST = parsed.hostname
    DB_NAME = parsed.path[1:]
    DB_USER = parsed.username
    DB_PASS = parsed.password
    DB_PORT = parsed.port or 5432
else:
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_NAME = os.getenv("DB_NAME", "drishtikosh_db")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASS = os.getenv("DB_PASS", "anmol2006")
    DB_PORT = os.getenv("DB_PORT", "5432")

try:
    print(f"Connecting to database server at {DB_HOST}...")
    # Connect to default 'postgres' database to create the new db
    conn = psycopg2.connect(dbname='postgres', user=DB_USER, host=DB_HOST, password=DB_PASS, port=DB_PORT)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    
    # Check if database exists
    cursor.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{DB_NAME}'")
    exists = cursor.fetchone()
    
    if not exists:
        print(f"Creating database {DB_NAME}...")
        cursor.execute(f"CREATE DATABASE {DB_NAME}")
        print("Database created successfully!")
    else:
        print(f"Database {DB_NAME} already exists.")
        
    cursor.close()
    conn.close()

except Exception as e:
    print(f"Error: {e}")
    print("Ensure PostgreSQL is running and credentials in .env are correct.")
