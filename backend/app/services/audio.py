# from transformers import AutoTokenizer, AutoModelForSpeechSeq2Seq, AutoProcessor
# import torch
import soundfile as sf
import os
from google.cloud import texttospeech

class AudioService:
    def __init__(self):
        self.device = "cpu"
        self.supports_fp16 = False
        print(f"Device selected: {self.device} (Whisper STT disabled)")
        self.models_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "models_data")
        self.stt_path = os.path.join(self.models_dir, "whisper-small")
        
        # Setup Google Cloud Credentials
        # Use the known path if environment variable is not set
        if "GOOGLE_APPLICATION_CREDENTIALS" not in os.environ:
            known_key_path = "/Users/adityajadhav/Drishtii/DrishtiKosh/backend/secrets/gigshield-0a6ad93e326a.json"
            if os.path.exists(known_key_path):
                os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = known_key_path
                print(f"✅ Set GCP Credentials from: {known_key_path}")
            else:
                print("⚠️  GCP Credentials not found. TTS will fail.")

        # Initialize GCP TTS Client
        try:
            self.tts_client = texttospeech.TextToSpeechClient()
            print("✅ Google Cloud TTS Client Initialized")
        except Exception as e:
            print(f"❌ Failed to initialize Google Cloud TTS: {e}")
            self.tts_client = None

        # Vernacular Voice Mappings (best available Indian voices)
        self.VOICE_MAPPING = {
            'en': 'en-IN-Wavenet-D',    # Female
            'hi': 'hi-IN-Neural2-A',    # Female
            'mr': 'mr-IN-Wavenet-A',    # Female
            'bn': 'bn-IN-Wavenet-A',    # Female
            'gu': 'gu-IN-Wavenet-A',    # Female
            'kn': 'kn-IN-Wavenet-A',    # Female
            'ml': 'ml-IN-Wavenet-A',    # Female
            'pa': 'pa-IN-Wavenet-A',    # Female
            'ta': 'ta-IN-Wavenet-A',    # Female
            'te': 'te-IN-Standard-A',   # Female (Neural not always avail)
            'or': 'bn-IN-Wavenet-A',    # FALLBACK: Odia not supported in standard GCP TTS yet, use Bengali
            'as': 'bn-IN-Wavenet-A',    # Fallback to Bengali
        }

        # Whisper STT Removed as per user request
        self.stt_model = None
        print("ℹ️ Whisper STT is disabled.")
        
        # EXPLICIT LANGUAGE SUPPORT - Only these 12 languages are targeted
        self.SUPPORTED_LANGUAGES = {
            'hi': {'name': 'Hindi', 'script': 'Devanagari', 'font_hint': 'Mukta'},
            'en': {'name': 'English', 'script': 'Latin', 'font_hint': 'Inter'},
            'bn': {'name': 'Bengali', 'script': 'Bengali', 'font_hint': 'Hind Siliguri'},
            'ta': {'name': 'Tamil', 'script': 'Tamil', 'font_hint': 'Mukta Malar'},
            'te': {'name': 'Telugu', 'script': 'Telugu', 'font_hint': 'Mandali'},
            'kn': {'name': 'Kannada', 'script': 'Kannada', 'font_hint': 'Nunc'},
            'ml': {'name': 'Malayalam', 'script': 'Malayalam', 'font_hint': 'Manjari'},
            'mr': {'name': 'Marathi', 'script': 'Devanagari', 'font_hint': 'Mukta'},
            'gu': {'name': 'Gujarati', 'script': 'Gujarati', 'font_hint': 'Mukta Vaani'},
            'pa': {'name': 'Punjabi', 'script': 'Gurmukhi', 'font_hint': 'Mukta Mahee'},
            'as': {'name': 'Assamese', 'script': 'Bengali', 'font_hint': 'Hind Siliguri'},
            'or': {'name': 'Odia', 'script': 'Odia', 'font_hint': 'Baloo 2'},
        }
        
        self.LANGUAGE_CODES = list(self.SUPPORTED_LANGUAGES.keys())

    async def text_to_speech(self, text: str, language_code: str = 'en', user_id: str = None, db_session = None):
        """Generate speech using Google Cloud TTS"""
        if not self.tts_client:
            print("ERROR: GCP TTS Client not available")
            return None
        
        print(f"DEBUG: TTS - Starting GCP generation for: '{text[:30]}...' (lang: {language_code})")
        
        try:
            import io
            
            # Select voice based on language code or default to Hindi/English
            voice_name = self.VOICE_MAPPING.get(language_code, 'en-IN-Wavenet-D')
            
            # Parse language code from voice name (e.g. "en-IN")
            lang_entry = "-".join(voice_name.split("-")[:2])

            input_text = texttospeech.SynthesisInput(text=text)

            voice = texttospeech.VoiceSelectionParams(
                language_code=lang_entry,
                name=voice_name
            )

            # Get interest-based speaking rate
            speaking_rate = 1.0  # Default
            if user_id and db_session:
                try:
                    from app.core.utils import get_tts_rate_for_interest
                    speaking_rate = get_tts_rate_for_interest(user_id, db_session)
                    print(f"DEBUG: Using interest-based TTS rate: {speaking_rate}")
                except Exception as e:
                    print(f"DEBUG: Could not fetch interest rate, using default: {e}")

            # Optimizing audio config for natural speed and quality
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.LINEAR16, # Return WAV-ready bytes
                speaking_rate=speaking_rate,  # Interest-based rate
                pitch=0.0
            )

            response = self.tts_client.synthesize_speech(
                input=input_text, voice=voice, audio_config=audio_config
            )

            # Return BytesIO buffer
            buffer = io.BytesIO(response.audio_content)
            buffer.seek(0)
            
            print(f"DEBUG: TTS - GCP generation complete, size: {len(response.audio_content)} bytes")
            return buffer

        except Exception as e:
            print(f"ERROR: GCP TTS generation failed: {e}")
            import traceback
            traceback.print_exc()
            return None

    async def speech_to_text(self, audio_bytes: bytes, language_hint: str = None):
        """Transcribe audio with automatic language detection and multilingual support"""
        return {"text": "STT Disabled", "language": "unknown", "error": "Whisper is disabled"}

audio_service = AudioService()
