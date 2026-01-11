from google import genai
from google.genai import types
import os
import base64
from typing import Optional
import time
import asyncio

class VideoService:
    def __init__(self):
        """Initialize Google Gen AI for Veo 3 video generation"""
        # Credentials should already be set via GOOGLE_APPLICATION_CREDENTIALS env var
        self.project_id = os.getenv("PROJECT_ID", "gigshield")
        self.location = os.getenv("LOCATION", "us-central1")
        
        # Initialize the client
        self.client = genai.Client(
            vertexai=True,
            project=self.project_id,
            location=self.location
        )
        print(f"✅ VideoService (Veo 3) initialized for project: {self.project_id}, location: {self.location}")
    
    async def generate_video_summary(
        self,
        topic: str,
        content_summary: str,
        user_interest: str = "default",
        duration: int = 30
    ) -> Optional[str]:
        """
        Generate a 30-second video summary using Google Veo 3
        
        Args:
            topic: The topic/title of the content
            content_summary: A brief text summary to visualize
            user_interest: User's field of interest for styling
            duration: Video duration in seconds (default 30)
        
        Returns:
            Base64-encoded video string or None if generation fails
        """
        try:
            from app.core.utils import INTEREST_STYLES
            
            # Get interest-based video theme
            if user_interest != "default":
                style = INTEREST_STYLES.get(user_interest.lower(), INTEREST_STYLES["default"])
                video_theme = style.get("video_theme", "clean educational presentation")
                visual_style = style.get("visual_style", "simple, straightforward")
            else:
                video_theme = "clean educational presentation"
                visual_style = "simple, straightforward"
            
            # Construct Veo 3 prompt
            # Keep it concise and clear for best results
            prompt = f"""Educational video about {topic} ({duration} seconds).

Visual style: {visual_style}
Theme: {video_theme}

Content to visualize:
{content_summary[:500]}

Style: Clean, professional, {user_interest}-oriented educational content with text overlays."""

            print(f"DEBUG: Generating Veo 3 video...")
            print(f"  Topic: {topic}")
            print(f"  Interest: {user_interest}")
            print(f"  Theme: {video_theme}")
            print(f"  Duration: {duration}s")
            
            # Generate video using Veo 3
            # Using async generation for better performance
            response = await asyncio.to_thread(
                self.client.models.generate_videos,
                model="veo-3.1-generate-001",  # Veo 3.1 (better quality, 8s max)
                prompt=prompt,
                config=types.GenerateVideosConfig(
                    duration_seconds=duration,
                    aspect_ratio="16:9"
                )
            )
            
            
            # generate_videos returns an operation that must be polled
            operation = response
            print(f"DEBUG: Video generation operation started: {operation.name if hasattr(operation, 'name') else 'unknown'}")
            print(f"  Polling for completion (this may take 30-90 seconds)...")
            
            # Poll for completion (async)
            # The operation object from google-genai behaves like a Pydantic model
            max_wait = 300  # 5 minutes max
            elapsed = 0
            poll_interval = 5
            
            while elapsed < max_wait:
                # Check status
                is_done = False
                if hasattr(operation, 'done'):
                    is_done = operation.done() if callable(operation.done) else operation.done
                
                if is_done:
                    print(f"✅ Video generation complete ({elapsed}s elapsed)")
                    break
                    
                await asyncio.sleep(poll_interval)
                elapsed += poll_interval
                
                if elapsed % 15 == 0:
                    print(f"  ... still generating video ({elapsed}s elapsed)")
                
                # Refresh operation status
                try:
                    # Pass the operation object itself
                    operation = await asyncio.to_thread(self.client.operations.get, operation)
                except Exception as e:
                    if elapsed % 15 == 0:
                        print(f"⚠️ Error refreshing operation: {e}")
            
            # Final check
            final_done = False
            if hasattr(operation, 'done'):
                final_done = operation.done() if callable(operation.done) else operation.done
                
            if not final_done:
                print(f"⚠️  Video generation timed out after {max_wait} seconds")
                return None
            
            # Check for errors
            if hasattr(operation, 'error') and operation.error:
                print(f"ERROR: Video generation failed: {operation.error}")
                return None
            
            # Extract video from result
            if hasattr(operation, 'result') and operation.result and hasattr(operation.result, 'generated_videos'):
                generated_videos = operation.result.generated_videos
                if generated_videos and len(generated_videos) > 0:
                    video_obj = generated_videos[0].video
                    
                    # Debug: see what's actually in the video object
                    print(f"DEBUG: Video object attributes: {dir(video_obj)}")
                    print(f"DEBUG: Video object type: {type(video_obj)}")
                    
                    # Debug: see what's actually in the video object
                    print(f"DEBUG: Has video_bytes: {hasattr(video_obj, 'video_bytes')}")
                    print(f"DEBUG: Has uri: {hasattr(video_obj, 'uri')}")
                    
                    # Veo returns video data in .video_bytes field
                    if hasattr(video_obj, 'video_bytes') and video_obj.video_bytes:
                        video_bytes = video_obj.video_bytes
                        video_b64 = base64.b64encode(video_bytes).decode('utf-8')
                        print(f"✅ Video extracted successfully ({len(video_bytes)} bytes)")
                        return video_b64
                    elif hasattr(video_obj, 'uri') and video_obj.uri:
                        # Fallback: if URI is provided, download from GCS
                        video_uri = video_obj.uri
                        print(f"  Video URI: {video_uri}")
                        import requests
                        video_response = await asyncio.to_thread(requests.get, video_uri)
                        if video_response.status_code == 200:
                            video_bytes = video_response.content
                            video_b64 = base64.b64encode(video_bytes).decode('utf-8')
                            print(f"  Downloaded {len(video_bytes)} bytes")
                            return video_b64
                        else:
                            print(f"ERROR: Failed to download video: {video_response.status_code}")
                            return None
                    else:
                        print("⚠️  No video_bytes or URI in response")
                        return None
                else:
                    print("⚠️  No videos in operation result")
                    return None
            else:
                print("⚠️  Invalid operation result structure")
                return None
            
        except Exception as e:
            print(f"ERROR: Video generation failed: {e}")
            import traceback
            traceback.print_exc()
            
            # Check if it's an auth or quota error
            error_str = str(e).lower()
            if "permission" in error_str or "auth" in error_str:
                print("❌ Authentication error - check GOOGLE_APPLICATION_CREDENTIALS")
            elif "quota" in error_str or "exceeded" in error_str:
                print("❌ Quota exceeded - check Vertex AI quota limits")
            elif "not found" in error_str or "404" in error_str:
                print("❌ Veo 3 model not available in this region - try us-central1")
            
            return None

# Singleton instance
video_service = VideoService()
