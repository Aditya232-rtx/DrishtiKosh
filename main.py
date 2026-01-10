"""
FastAPI Backend for 3D Focus Realm
Simple JSON-based persistence for user forest data
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import json
import os
from datetime import datetime

app = FastAPI(title="Focus Realm API")

# CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Global forest data
FOREST_DATA_FILE = "forest_data.json"

# Initialize forest data file if it doesn't exist
if not os.path.exists(FOREST_DATA_FILE):
    with open(FOREST_DATA_FILE, "w") as f:
        json.dump([], f)

def load_forest_data():
    """Load forest data from JSON file"""
    try:
        with open(FOREST_DATA_FILE, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def save_forest_data(data):
    """Save forest data to JSON file"""
    with open(FOREST_DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

class TreeSession(BaseModel):
    duration: int  # Duration in minutes
    tree_type: Optional[str] = "default"  # Tree type identifier

@app.get("/")
async def root():
    """Serve the main HTML file"""
    return {"message": "Focus Realm API is running"}

@app.get("/api/forest")
async def get_forest():
    """Get all trees in the user's forest"""
    forest = load_forest_data()
    return {"forest": forest, "total_trees": len(forest)}

@app.post("/api/forest/add")
async def add_tree(session: TreeSession):
    """Add a new tree to the forest"""
    forest = load_forest_data()
    
    # Create new tree entry
    new_tree = {
        "id": len(forest) + 1,
        "duration": session.duration,
        "tree_type": session.tree_type,
        "timestamp": datetime.now().isoformat(),
        "completed": True
    }
    
    forest.append(new_tree)
    save_forest_data(forest)
    
    return {
        "success": True,
        "tree": new_tree,
        "total_trees": len(forest)
    }

@app.delete("/api/forest/remove")
async def remove_tree():
    """Remove the last tree from the forest (when user aborts session)"""
    forest = load_forest_data()
    
    if len(forest) > 0:
        removed_tree = forest.pop()
        save_forest_data(forest)
        return {
            "success": True,
            "removed_tree": removed_tree,
            "total_trees": len(forest)
        }
    else:
        return {
            "success": False,
            "message": "No trees to remove",
            "total_trees": 0
        }

@app.delete("/api/forest/clear")
async def clear_forest():
    """Clear all trees from the forest (for testing)"""
    save_forest_data([])
    return {"success": True, "message": "Forest cleared"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
