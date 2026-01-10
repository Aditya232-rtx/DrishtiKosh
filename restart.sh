#!/bin/bash

# restart.sh - Restart Backend & Frontend Servers

echo "🔄 Restarting DrishtiKosh Servers..."

# 0. Check Database Connection
echo "🔍 Checking Database Connection..."

# Try using pg_isready if installed
if command -v pg_isready &> /dev/null; then
    if ! pg_isready -h localhost -p 5432; then
        echo "❌ Postgres is not running or not accessible on localhost:5432"
        exit 1
    fi
else
    # Fallback: Simple port check
    if ! lsof -i:5432 &> /dev/null; then
         echo "❌ No process listening on port 5432 (Postgres is likely down)"
         echo "   Please start Postgres before running this script."
         exit 1
    fi
fi
echo "✅ Database Connectable (Port 5432 Active)"

# 1. Kill cleanup previous processes
echo "🧹 Cleaning up old processes..."
lsof -ti:8001 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# 2. Start Backend
echo "🚀 Starting Backend (Port 8001)..."
cd backend
source venv/bin/activate
# Run in background, log to backend.log
nohup python -m uvicorn app.main:app --reload --port 8001 > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend started (PID: $BACKEND_PID)"
cd ..

# 3. Start Frontend
echo "🎨 Starting Frontend (Port 3000)..."
cd frontend
# Run in background, log to frontend.log
nohup npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend started (PID: $FRONTEND_PID)"
cd ..

echo "✅ Servers are running!"
echo "   📝 Backend Logs: tail -f backend.log"
echo "   📝 Frontend Logs: tail -f frontend.log"
echo "   🌍 Access App: http://localhost:3000"
