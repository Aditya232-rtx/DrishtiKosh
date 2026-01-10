from transformers import AutoTokenizer, AutoModelForSpeechSeq2Seq, AutoProcessor
# Parler TTS removed
import torch
import soundfile as sf
import os
from google.cloud import texttospeech

class AudioService:
    def __init__(self):
        # Improved device detection for macOS support
        if torch.cuda.is_available():
            self.device = "cuda:0"
            self.supports_fp16 = True
        elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            # Apple Silicon Mac with Metal Performance Shaders
            self.device = "mps"
            self.supports_fp16 = False  # MPS doesn't support fp16 in Whisper well
        else:
            self.device = "cpu"
            self.supports_fp16 = False
        
        print(f"Device selected: {self.device} (fp16 support: {self.supports_fp16})")
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

        # Load STT (Whisper - OpenAI Implementation)
        print(f"DEBUG: resolving STT path: {self.stt_path}")
        
        # Check if the path points to a file (small.pt) or directory
        # If directory, look for small.pt inside
        self.stt_model_file = self.stt_path
        if os.path.isdir(self.stt_path):
             self.stt_model_file = os.path.join(self.stt_path, "small.pt")

        if os.path.exists(self.stt_model_file):
            try:
                import whisper
                print(f"Loading Whisper Model from: {self.stt_model_file}")
                # Load the model directly from the .pt file
                self.stt_model = whisper.load_model(self.stt_model_file, device=self.device)
                print("✅ STT Model loaded successfully (OpenAI Whisper).")
            except Exception as e:
                print(f"❌ Failed to load Whisper model: {e}")
                self.stt_model = None
        else:
            print(f"❌ CRITICAL: Whisper model file not found at: {self.stt_model_file}")
            self.stt_model = None
        
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
        if not self.stt_model:
            return {"text": "STT Model not available", "language": "unknown"}
        
        import io
        import soundfile as sf
        import numpy as np
        import tempfile
        import re
        
        print(f"DEBUG: Received audio bytes: {len(audio_bytes)} bytes")
        
        temp_path = None
        try:
            # Try to detect if this is WebM format (browsers often record in WebM)
            is_webm = audio_bytes[:4] == b'\x1a\x45\xdf\xa3'
            
            # Convert to WAV format and save to temp file
            if is_webm:
                print("DEBUG: Detected WebM format, converting to WAV...")
                try:
                    from pydub import AudioSegment
                    audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format="webm")
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
                        audio.export(temp_audio.name, format="wav")
                        temp_path = temp_audio.name
                except Exception as conv_error:
                    print(f"DEBUG: WebM conversion failed: {conv_error}")
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
                        temp_audio.write(audio_bytes)
                        temp_path = temp_audio.name
            else:
                with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
                    temp_audio.write(audio_bytes)
                    temp_path = temp_audio.name
            
            # WHISPER TRANSCRIBE
            print("DEBUG: Starting Whisper transcription...")
            result = self.stt_model.transcribe(
                temp_path,
                language=None, # Auto-detect
                task="transcribe",
                fp16=False,
                beam_size=5,
                best_of=5,
                temperature=0.0,
                condition_on_previous_text=False # Prevent hallucination loops from prev context
            )
            
            transcription = result["text"].strip()
            detected_language = result.get("language", "unknown")
            
            # --- HALLUCINATION & REPETITION FILTER ---
            
            # 1. Filter Repetitive Loops (e.g. "To subscribe...", "Copyright...", "Amara.org")
            hallucinations = [
                "subscribe", "copyright", "amara.org", "thank you", "watching"
            ]
            if any(h in transcription.lower() for h in hallucinations) and len(transcription) < 40:
                 print(f"DEBUG: Filtered known hallucination: '{transcription}'")
                 transcription = ""

            # 2. Filter Character Repetition (e.g. "विविविवि...")
            if len(transcription) > 10:
                # Check if > 50% of the string is just one repeated character
                most_common_char = max(set(transcription), key=transcription.count)
                if transcription.count(most_common_char) / len(transcription) > 0.5:
                     print(f"DEBUG: Filtered repetitive garbage: '{transcription}'")
                     transcription = ""

            print(f"DEBUG: Transcription result: '{transcription}'")
            print(f"DEBUG: Language detected: {detected_language}")
            
            return {
                "text": transcription,
                "language": detected_language,
                "language_name": self.SUPPORTED_LANGUAGES.get(detected_language, {}).get('name', detected_language.title()),
                "script": self.SUPPORTED_LANGUAGES.get(detected_language, {}).get('script', 'Unknown'),
                "font_hint": self.SUPPORTED_LANGUAGES.get(detected_language, {}).get('font_hint', 'Roboto')
            }
            
        except Exception as e:
            print(f"STT Error: {e}")
            import traceback
            traceback.print_exc()
            return {"text": "Error transcribing audio", "language": "unknown", "error": str(e)}
        finally:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except Exception:
                    pass

audio_service = AudioService()
