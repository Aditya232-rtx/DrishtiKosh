# ==========================================
# SETUP INSTRUCTIONS (Run before executing)
# ==========================================
# 1. Install Library:
#    pip install -U google-genai pyaudio
#
# 2. Set Project ID (Replace with your actual ID):
#    export GOOGLE_CLOUD_PROJECT="your-project-id"
#
# 3. Authenticate:
#    gcloud auth application-default login
# ==========================================

import asyncio
import os
import sys
import traceback
from google import genai
from google.genai.types import HttpOptions

# Try importing pyaudio
try:
    import pyaudio
except ImportError:
    print("Error: pyaudio is not installed. Please run: pip install pyaudio")
    sys.exit(1)

# Configuration
PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT")
LOCATION = "us-central1"
# Specific Model ID for Live Preview
MODEL_ID = "gemini-2.0-flash-live-preview-04-09"

if not PROJECT_ID:
    print(f"❌ Error: GOOGLE_CLOUD_PROJECT environment variable is missing.")
    print("Please run: export GOOGLE_CLOUD_PROJECT=\"your-project-id\"")
    sys.exit(1)

# Audio Configuration
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 24000
CHUNK = 1024

async def main():
    print(f"🚀 Initializing Vertex AI Client (v1beta1) for project: {PROJECT_ID}...")
    try:
        client = genai.Client(
            vertexai=True,
            project=PROJECT_ID,
            location=LOCATION,
            http_options=HttpOptions(api_version="v1beta1")
        )
    except Exception as e:
        print(f"❌ Failed to initialize client: {e}")
        return

    p = pyaudio.PyAudio()

    try:
        # Open Mic Stream
        mic_stream = p.open(format=FORMAT, channels=CHANNELS, rate=RATE, input=True, frames_per_buffer=CHUNK)
        # Open Speaker Stream
        spk_stream = p.open(format=FORMAT, channels=CHANNELS, rate=RATE, output=True)

        print(f"✅ Connected to Audio Devices. Subscribing to Live model: {MODEL_ID}...")
        
        config = {
            "generation_config": {
                "response_modalities": ["AUDIO"]
            },
            "system_instruction": {
                 "parts": [{"text": "You are a helpful assistant. Reply in Hindi if spoken to in Hindi. Reply in Hinglish if spoken to in Hinglish. Keep responses under 2 sentences."}]
            }
        }

        async with client.aio.live.connect(model=MODEL_ID, config=config) as session:
            print(f"🟢 Session Established! Start speaking (Ctrl+C to stop)...")

            async def send_audio():
                while True:
                    try:
                        data = await asyncio.to_thread(mic_stream.read, CHUNK, exception_on_overflow=False)
                        await session.send(data, end_of_turn=False)
                    except Exception as e:
                        print(f"Error sending audio: {e}")
                        break

            async def receive_audio():
                try:
                    async for response in session.receive():
                        if response.server_content and response.server_content.model_turn:
                            for part in response.server_content.model_turn.parts:
                                if part.inline_data:
                                    await asyncio.to_thread(spk_stream.write, part.inline_data.data)
                except Exception as e:
                     print(f"Error receiving audio: {e}")

            await asyncio.gather(send_audio(), receive_audio())

    except asyncio.CancelledError:
        print("\nStopping...")
    except Exception as e:
        print(f"❌ Runtime Error: {e}")
        traceback.print_exc()
    finally:
        print("Cleaning up audio resources...")
        mic_stream.stop_stream()
        mic_stream.close()
        spk_stream.stop_stream()
        spk_stream.close()
        p.terminate()
        print("Done.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nExited by user.")
