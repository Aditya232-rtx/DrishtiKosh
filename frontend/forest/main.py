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

@app.get("/api/leaderboard")
async def get_leaderboard():
    """Get top performers for peer comparison (synthetic data for MVP)"""
    import random
    
    # Generate 10 synthetic peers with varying performance
    peers = []
    for i in range(1, 11):
        peers.append({
            "id": f"anon_{i}",
            "trees": random.randint(3, 25),
            "total_focus_minutes": random.randint(75, 625),
            "label": f"Focused Mind #{i}"
        })
    
    # Sort by trees descending
    peers.sort(key=lambda x: x["trees"], reverse=True)
    
    return {
        "leaderboard": peers[:10],
        "total_users": 100  # Mock total
    }

@app.get("/api/stats/compare")
async def compare_stats(user_trees: int = 0):
    """Compare user's stats with peers"""
    import random
    
    # Get current user stats
    forest = load_forest_data()
    actual_user_trees = len(forest)
    total_focus_minutes = sum(tree.get("duration", 0) for tree in forest)
    
    # Generate synthetic peer data (ensure some are better than user)
    peers = []
    for i in range(1, 5):
        # Make peers progressively better
        peer_trees = actual_user_trees + random.randint(2, 10)
        peer_minutes = total_focus_minutes + random.randint(50, 200)
        
        # Generate forest preview (tree positions for 3D rendering)
        forest_preview = []
        for j in range(peer_trees):
            forest_preview.append({
                "id": j + 1,
                "duration": random.choice([5, 10, 15, 20, 25, 30]),
                "tree_type": "default",
                "position": {
                    "x": random.uniform(-10, 10),
                    "z": random.uniform(-10, 10)
                }
            })
        
        peers.append({
            "id": f"anon_{i}",
            "trees": peer_trees,
            "total_focus_minutes": peer_minutes,
            "forest_preview": forest_preview,
            "label": f"Focused Mind #{i}"
        })
    
    # Calculate stats
    all_tree_counts = [p["trees"] for p in peers] + [actual_user_trees]
    average_trees = sum(all_tree_counts) / len(all_tree_counts)
    
    # Calculate percentile (lower is worse)
    better_than_user = sum(1 for count in all_tree_counts if count > actual_user_trees)
    percentile = max(5, int((1 - better_than_user / len(all_tree_counts)) * 100))
    
    return {
        "user_stats": {
            "trees": actual_user_trees,
            "percentile": percentile,
            "total_focus_minutes": total_focus_minutes
        },
        "peers": peers,
        "average": {
            "trees": int(average_trees),
            "focus_minutes": int(sum(p["total_focus_minutes"] for p in peers) / len(peers))
        },
        "message": "You're falling behind..." if percentile < 50 else "Keep it up!"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
