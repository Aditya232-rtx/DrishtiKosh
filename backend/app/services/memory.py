from memori import Memori
import os
from app.core.config import settings

# Initialize Memori with Postgres configuration
# Note: Actual initialization might vary based on Memori's exact API for Postgres factory
# This is a placeholder structure assuming standard SDK usage

class MemoryService:
    def __init__(self):
        # Initialize Memori with Postgres (assuming Memori supports this via db_url or similar)
        # If Memori is a custom wrapper or specific lib, this adapts to it.
        # For now, initializing with local state or DB connection as per request.
        try:
            # Create a connection factory for Memori using psycopg (v3) as expected by the library
            # Ensure psycopg is installed
            import psycopg
            
            def db_connection_factory():
                return psycopg.connect(settings.DATABASE_URL)
            
            self.memori = Memori(
                conn=db_connection_factory
            )
            # API Key is picked up from env MEMORI_API_KEY by Memori internals
            
            # Setup attribution/session
            self.memori.attribution(entity_id="drishtikosh_agent")
            
            print("Memori initialized with Postgres connection.")
        except ImportError:
            print("Failed to init Memori: 'psycopg' module not found. Please install 'psycopg[binary]'.")
            self.memori = None
        except Exception as e:
            print(f"Failed to init Memori: {e}")
            self.memori = None

    async def add_memory(self, user_id: str, content: str):
        if self.memori:
            # Assuming memori.add(key, value) or similar. 
            # Adapting to common pattern: add(text, metadata)
            try:
                # self.memori.add(user_id, content) # Placeholder signature
                pass 
            except Exception as e:
                print(f"Error adding memory: {e}")

    async def retrieve_context(self, user_id: str, query: str) -> str:
        if not self.memori:
            return ""
        try:
            # results = self.memori.search(query, user_id=user_id)
            # return "\n".join([r.text for r in results])
            return "" # Returning empty context for now to strictly avoid halting on library mismatch
        except Exception as e:
            print(f"Error retrieving context: {e}")
            return ""

memory_service = MemoryService()
