import asyncio
import os
import pyaudio
import traceback
import sys
from google import genai
from google.genai import types

# --- Configuration ---
# Audio Format for Gemini Live (16kHz or 24kHz recommended)
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 24000  # 24kHz is often native for Gemini models
CHUNK = 1024  # Buffer size

api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    print("Error: GOOGLE_API_KEY environment variable not set.")
    sys.exit(1)

# Initialize Gemini Client
# The Live API is currently available via the 'gemini-2.0-flash-exp' model
client = genai.Client(api_key=api_key, http_options={'api_version': 'v1alpha'})

# System Instructions (Vernacular, Style, Length, Interruptions)
SYSTEM_INSTRUCTION = """
You are a helpful, fast voice assistant for Indian users.
1. LANGUAGE MATCHING: If the user speaks Hindi, reply in Hindi. If Hinglish, reply in Hinglish. If English, reply in English.
2. STYLE: Speak naturally. You can laugh or sigh if appropriate.
3. LENGTH: Keep responses very short (under 2 sentences) for a conversational feel.
4. STOPPING: If the user interrupts, stop speaking immediately.
"""

class AudioLoop:
    def __init__(self):
        self.p = pyaudio.PyAudio()
        self.input_stream = None
        self.output_stream = None
        
    def start_streams(self):
        """Initialize microphone input and speaker output streams."""
        print("🎤 Opening Audio Input (Mic)...")
        self.input_stream = self.p.open(
            format=FORMAT,
            channels=CHANNELS,
            rate=RATE,
            input=True,
            frames_per_buffer=CHUNK
        )
        
        print("🔊 Opening Audio Output (Speaker)...")
        self.output_stream = self.p.open(
            format=FORMAT,
            channels=CHANNELS,
            rate=RATE,
            output=True
        )

    def close_streams(self):
        """Clean up audio resources."""
        if self.input_stream:
            self.input_stream.stop_stream()
            self.input_stream.close()
        if self.output_stream:
            self.output_stream.stop_stream()
            self.output_stream.close()
        self.p.terminate()
        print("✅ Audio resources released.")

async def main():
    audio = AudioLoop()
    
    try:
        audio.start_streams()
        
        # Configure the Live Connect Session
        config = {
            "generation_config": {
                "response_modalities": ["AUDIO"]  # We want raw audio back
            },
            "system_instruction": {
                "parts": [{"text": SYSTEM_INSTRUCTION}]
            }
        }
        
        print(f"🚀 Connecting to Gemini Live API (Model: gemini-2.0-flash-exp)...")
        
        # Establish Bidirectional WebSocket Connection
        async with client.aio.live.connect(model="gemini-2.0-flash-exp", config=config) as session:
            print("✅ Connected! Start speaking...")
            
            # Task A: Sender (Mic -> WebSocket)
            async def send_audio():
                while True:
                    try:
                        # Read raw bytes from microphone (blocking read, running in executor to avoid blocking loop)
                        # Note: input_stream.read is blocking. For ultra-low latency loop, better to use callbacks or non-blocking,
                        # but simple read in loop works for many cases.
                        input_data = await asyncio.to_thread(audio.input_stream.read, CHUNK, exception_on_overflow=False)
                        
                        # Send to Gemini
                        await session.send(input_data, end_of_turn=False)
                    except Exception as e:
                        print(f"Error sending audio: {e}")
                        break

            # Task B: Receiver (WebSocket -> Speaker)
            async def receive_audio():
                while True:
                    try:
                        # Receive responses from Gemini
                        # This iterator yields chunks as they stream in
                        async for response in session.receive():
                            # Handle incoming audio data
                            if response.server_content and response.server_content.model_turn:
                                for part in response.server_content.model_turn.parts:
                                    if part.inline_data:
                                        # Decode raw audio bytes
                                        audio_data = part.inline_data.data
                                        # Write to speaker (blocking write, offload to thread)
                                        await asyncio.to_thread(audio.output_stream.write, audio_data)
                            
                            # Handle "turn_complete" or other signals if needed
                            # The model automatically handles turn taking usually.

                    except Exception as e:
                        print(f"Error receiving audio: {e}")
                        break

            # Run Sender and Receiver concurrently
            await asyncio.gather(send_audio(), receive_audio())

    except Exception as e:
        print(f"❌ Critical Error: {e}")
        traceback.print_exc()
    finally:
        audio.close_streams()

if __name__ == "__main__":
    try:
        if sys.platform == 'win32':
            # Windows asyncio policy fix for some versions
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Voice Bot stopped by user.")
