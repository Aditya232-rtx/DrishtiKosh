import os
import aiohttp
import asyncio
import logging

logger = logging.getLogger(__name__)

class MeshyService:
    def __init__(self):
        self.api_key = os.getenv("MESHY_API_KEY")
        self.base_url = "https://api.meshy.ai/v2"
        
    async def generate_3d_model_from_image(self, image_url: str):
        """
        Generate a 3D model from an image URL using Meshy AI.
        Returns the GLB model URL or None/Mock on failure.
        """
        if not self.api_key:
            logger.warning("MESHY_API_KEY not set. Returning mock 3D model.")
            # Return a generic educational GLB (e.g. from a public cdn or local)
            # For now, return a placeholder that the frontend can handle or a real sample
            return "https://modelviewer.dev/shared-assets/models/Astronaut.glb"

        headers = {
            "Authorization": f"Bearer {self.api_key}"
        }
        
        # 1. Start Task
        payload = {
            "image_url": image_url,
            "enable_pbr": True,
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                # Create Task
                async with session.post(f"{self.base_url}/image-to-3d", json=payload, headers=headers) as resp:
                    if resp.status != 202:
                        logger.error(f"Meshy API Error: {await resp.text()}")
                        return None
                    data = await resp.json()
                    task_id = data.get("result")
                
                # 2. Poll for completion
                for _ in range(60): # Poll for up to 2 minutes
                    await asyncio.sleep(2)
                    async with session.get(f"{self.base_url}/image-to-3d/{task_id}", headers=headers) as resp:
                        res_data = await resp.json()
                        status = res_data.get("status")
                        
                        if status == "SUCCEEDED":
                            return res_data.get("model_urls", {}).get("glb")
                        elif status == "FAILED":
                            logger.error(f"Meshy Task Failed: {res_data}")
                            return None
                            
                logger.error("Meshy Task Timed Out")
                return None
                
        except Exception as e:
            logger.error(f"Meshy Service Exception: {e}")
            return None

    async def generate_3d_model_from_text(self, prompt: str):
        """
        Generate a 3D model from a text prompt using Meshy AI.
        """
        if not self.api_key:
            logger.warning("MESHY_API_KEY not set. Returning mock 3D model.")
            return "https://modelviewer.dev/shared-assets/models/Astronaut.glb"

        headers = {"Authorization": f"Bearer {self.api_key}"}
        payload = {
            "mode": "preview",
            "prompt": prompt,
            "art_style": "realistic",
            "negative_prompt": "low quality, low resolution"
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{self.base_url}/text-to-3d", json=payload, headers=headers) as resp:
                    if resp.status != 202:
                        logger.error(f"Meshy API Error: {await resp.text()}")
                        return None
                    data = await resp.json()
                    task_id = data.get("result")
                
                for _ in range(60): 
                    await asyncio.sleep(2)
                    async with session.get(f"{self.base_url}/text-to-3d/{task_id}", headers=headers) as resp:
                        res_data = await resp.json()
                        status = res_data.get("status")
                        if status == "SUCCEEDED":
                            return res_data.get("model_urls", {}).get("glb")
                        elif status == "FAILED":
                            return None
                return None
        except Exception as e:
            logger.error(f"Meshy Service Exception: {e}")
            return None

meshy_service = MeshyService()
