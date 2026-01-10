#!/bin/bash

# setup.sh - Full Application Setup

set -e  # Exit on error

echo "🚀 Starting DrishtiKosh Setup..."

# 1. System Checks
echo "🔍 Checking system dependencies..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed."
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL client (psql) not found. Make sure Postgres is installed."
fi

# 2. Environment Setup
echo "🔐 Checking Environment Variables..."
if [ ! -f "backend/.env" ]; then
    echo "⚠️  backend/.env not found."
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        echo "✅ Created backend/.env from example."
        echo "❗ PLEASE EDIT backend/.env with your actual keys (DB, Google Cloud, etc.) before proceeding."
        exit 1
    else
        echo "❌ backend/.env.example not found. Cannot configure environment."
        exit 1
    fi
else
    echo "✅ backend/.env found."
fi

# 3. Backend Setup
echo "🐍 Setting up Backend..."
cd backend

# Create Venv if not exists
if [ ! -d "venv" ]; then
    echo "   Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate Venv
source venv/bin/activate

# Install Dependencies
echo "   Installing Python requirements..."
pip install -r requirements.txt

# Run Migrations (if DB is ready)
echo "🗄️  Running Database Migrations..."
# Check if Postgres is running locally
if lsof -i:5432 &> /dev/null; then
    alembic upgrade head || echo "⚠️  Migration failed. Check your DB credentials in .env"
else
    echo "⚠️  Postgres does not seem to be running on port 5432. Skipping migrations."
fi

cd ..

# 4. Model Setup
echo "🧠 Checking/Downloading AI Models..."
# Run from root as script expects backend path
source backend/venv/bin/activate
python backend/download_whisper.py

# 5. Frontend Setup
echo "⚛️  Setting up Frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "   Installing Node modules..."
    npm install
else
    echo "   Node modules already installed."
fi
cd ..

echo "✅ Setup Complete! You can now run ./restart.sh to start the application."
chmod +x restart.sh
