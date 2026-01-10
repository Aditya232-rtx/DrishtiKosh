from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import json
import logging

# === CONFIGURATION ===
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DrishtiKosh")

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# === DATA STORE (TEACHER UPDATES) ===
course_content = {
    "phys_ch1": {
        "title": "Physics: Thermodynamics",
        "summary": "Thermodynamics is the branch of physics that deals with heat, work, and temperature, and their relation to energy and radiation."
    },
    "phys_ch2": {
        "title": "Physics: Newton's Laws",
        "summary": "Newton's first law states that an object will remain at rest or in uniform motion unless acted upon by an external force."
    },
    "hist_ch1": {
        "title": "History: Mughal Empire",
        "summary": "The Mughal Empire controlled much of South Asia between the 16th and 19th centuries, known for its art and architecture."
    },
    "hist_ch2": {
        "title": "History: Indus Valley",
        "summary": "The Indus Valley Civilisation was a Bronze Age civilisation in the northwestern regions of South Asia, known for urban planning."
    }
}

# === CARD MAPPING (YOUR 7 TAGS) ===
card_mapping = {
    # --- CARD 1: HOME ---
    "EF 15 E1 05": {
        "type": "nav", 
        "view": "home", 
        "audio": "Welcome back. System Online. Battery 80%. You have new physics updates."
    },

    # --- CARD 2: PHYSICS CH 1 ---
    "4E 39 26 7C": {
        "type": "course", 
        "view": "course",
        "data": course_content["phys_ch1"], 
        "audio": "Opening Physics Chapter 1. Thermodynamics."
    },

    # --- CARD 3: PHYSICS CH 2 ---
    "8E E2 04 7C": {
        "type": "course", 
        "view": "course",
        "data": course_content["phys_ch2"], 
        "audio": "Opening Physics Chapter 2. Newton's Laws."
    },

    # --- CARD 4: HISTORY CH 1 ---
    "9E 53 D7 06": {
        "type": "course", 
        "view": "course",
        "data": course_content["hist_ch1"], 
        "audio": "Opening History Chapter 1. The Mughal Empire."
    },

    # --- CARD 5: HISTORY CH 2 ---
    "3F 5E E3 05": {
        "type": "course", 
        "view": "course",
        "data": course_content["hist_ch2"], 
        "audio": "Opening History Chapter 2. Indus Valley Civilisation."
    },

    # --- CARD 6: DRISHTI BOT ---
    "AF 07 0E 06": {
        "type": "nav", 
        "view": "bot", 
        "audio": "DrishtiBot AI Active. I am listening."
    },

    # --- CARD 7: REDIRECT (PERSONALIZED) ---
    "5F 76 D8 05": {
        "type": "redirect", 
        "view": "redirect",
        # REPLACE THIS URL WITH YOUR ACTUAL APP URL
        "url": "http://localhost:3000/dashboard", 
        "audio": "Redirecting to your Personalized Learning Platform."
    }
}

# === CONNECTION MANAGER ===
active_connections = []

async def broadcast_to_frontend(data: dict):
    """Sends JSON data to all connected Dashboard pages"""
    for connection in active_connections:
        try:
            await connection.send_text(json.dumps(data))
        except Exception as e:
            logger.error(f"Error broadcasting: {e}")

# === WEBSOCKET ENDPOINT (Browser connects here) ===
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    logger.info("Browser Connected to Dashboard")
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        logger.info("Browser Disconnected")

# === TRIGGER ENDPOINT (ESP32 calls this) ===
@app.get("/trigger/{tag_id}")
async def trigger_card(tag_id: str):
    logger.info(f"🚀 CARD SCANNED: {tag_id}")
    
    # 1. Lookup Card
    if tag_id in card_mapping:
        card_data = card_mapping[tag_id]
        
        # 2. Build Payload for Frontend
        payload = {
            "type": card_data["type"],
            "view": card_data.get("view", "home"),
            "audio": card_data.get("audio", ""),
            "url": card_data.get("url", "")
        }
        
        # Add Course Content if applicable
        
        if "data" in card_data:
            payload["title"] = card_data["data"]["title"]
            payload["summary"] = card_data["data"]["summary"]
            # Append summary to audio so browser reads it automatically
            payload["audio"] += " " + card_data["data"]["summary"]

        # 3. Send to Browser via WebSocket
        await broadcast_to_frontend(payload)
        
        logger.info(f"✅ Action Triggered: {payload['view']}")
        return {"status": "success", "action": payload['view']}
    
    else:
        logger.warning(f"❌ Unknown Card: {tag_id}")
        return {"status": "error", "message": "Unknown Card"}

# === SERVE STATIC FILES (Frontend) ===
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def root():
    return FileResponse("static/index.html")

if __name__ == "__main__":
    import uvicorn
    print("📢 DRISHTIKOSH OS RUNNING ON http://0.0.0.0:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)