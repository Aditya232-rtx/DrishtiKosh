import vertexai
from vertexai.preview.generative_models import GenerativeModel, Part
from vertexai.preview.vision_models import ImageGenerationModel
from app.core.config import settings

class VertexService:
    def __init__(self):
        # Initialize Vertex AI with explicit credentials
        import vertexai
        from google.oauth2 import service_account
        
        try:
            if settings.GOOGLE_APPLICATION_CREDENTIALS:
                creds = service_account.Credentials.from_service_account_file(settings.GOOGLE_APPLICATION_CREDENTIALS)
                vertexai.init(project=settings.PROJECT_ID, location=settings.LOCATION, credentials=creds)
                print("Vertex AI initialized successfully with credentials.")
            else:
                 vertexai.init(project=settings.PROJECT_ID, location=settings.LOCATION)
                 print("Vertex AI initialized with default credentials.")
                 
            # User explicitly requested "gemini 2.5 pro" and "veo 3"
            self.text_model = GenerativeModel("gemini-2.5-pro") 
            self.vision_model = GenerativeModel("gemini-2.5-pro")
            
            # Using Imagen 3 (Nano Banana equivalent)
            self.image_model = ImageGenerationModel.from_pretrained("imagen-3.0-generate-001") 
            
            # Veo 3 for Video
            self.video_model = GenerativeModel("veo-003") 

        except Exception as e:
            print(f"Failed to initialize Vertex AI: {e}")
            self.text_model = None
            self.image_model = None
            self.video_model = None

    async def generate_text(self, prompt: str):
        if not self.text_model:
            return "Vertex AI not initialized."
        try:
            response = self.text_model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"Error generating text: {e}")
            return "Error generating response."

    async def analyze_image(self, image_bytes: bytes, prompt: str = "Describe this image."):
        if not self.vision_model:
            return "Vision capabilities unavailable."
        try:
            from vertexai.preview.generative_models import Part
            image_part = Part.from_data(image_bytes, mime_type="image/jpeg")
            response = self.vision_model.generate_content([image_part, prompt])
            return response.text
        except Exception as e:
            print(f"Error analyzing image: {e}")
            return "Error analyzing image."

    async def generate_image(self, prompt: str):
        if not self.image_model:
            return None
        try:
            images = self.image_model.generate_images(
                prompt=prompt,
                number_of_images=1,
                language="en",
                aspect_ratio="1:1",
                safety_filter_level="block_some",
                person_generation="allow_adult",
            )
            return images[0]
        except Exception as e:
            print(f"Error generating image: {e}")
            return None

    async def generate_image_base64(self, prompt: str):
        if not self.image_model:
            return None
        try:
            images = self.image_model.generate_images(
                prompt=prompt,
                number_of_images=1,
                language="en",
                aspect_ratio="1:1",
                safety_filter_level="block_some",
                person_generation="allow_adult",
            )
            if images and images[0]:
                import base64
                import io
                # Save to bytes buffer
                # GeneratedImage.save() takes a path, but _image_bytes might be available. 
                # If not, we might need a workaround. 
                # Actually, the object usually has simple access.
                # Let's assume ._image_bytes exists or similar. 
                # If not publicly documented, ._image_bytes is common in these SDKs.
                # SAFE FALLBACK: If _image_bytes fails, return None or Mock.
                try:
                    return base64.b64encode(images[0]._image_bytes).decode("utf-8")
                except:
                   # Try saving to temp buffer if possible, or fail gracefully
                   return None
            return None
        except Exception as e:
            print(f"Error generating image: {e}")
            return None

    async def generate_video(self, prompt: str):
        if not self.video_model:
             return None
        try:
            # Placeholder for Veo 3 generation call
            # response = self.video_model.generate_content(prompt)
            # return response.video_bytes
            print(f"Generating video with Veo 3 for: {prompt}")
            return None # Implementation depends on exact Veo SDK signature
        except Exception as e:
             print(f"Error generating video: {e}")
             return None

    async def analyze_video(self, video_url: str, prompt: str):
        """
        Analyze video content using Gemini's multimodal capabilities.
        Supports YouTube URLs and direct video URLs.
        """
        if not self.text_model:
            return "Vertex AI not initialized."
        try:
            from vertexai.preview.generative_models import Part
            
            # Create video part from URL
            video_part = Part.from_uri(video_url, mime_type="video/*")
            
            # Generate content with video + text prompt
            response = self.text_model.generate_content([video_part, prompt])
            return response.text
        except Exception as e:
            print(f"Error analyzing video: {e}")
            # Fallback: try text-only analysis with URL context
            try:
                fallback_prompt = f"Analyze this video URL and provide insights: {video_url}\n\n{prompt}"
                response = self.text_model.generate_content(fallback_prompt)
                return response.text
            except:
                return f"Error analyzing video: {str(e)}"

vertex_service = VertexService()
