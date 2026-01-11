import json
import numpy as np
import librosa
import torch
from transformers import pipeline
import sys
import warnings
import os

# Suppress warnings
warnings.filterwarnings("ignore")

class AudioProcessor:
    def __init__(self):
        print("⏳ Loading AI Emotion Model (DistilHuBERT)...")
        # Use a lightweight, high-performance model for emotion
        # "superb/hubert-base-superb-er" is a good standard for Emotion Recognition
        self.emotion_classifier = pipeline(
            "audio-classification", 
            model="superb/hubert-base-superb-er",
            device=0 if torch.cuda.is_available() else -1
        )
        print("✅ Model Loaded.")

    def normalize(self, value, min_val, max_val):
        """Map value to 0.0-1.0 range"""
        return np.clip((value - min_val) / (max_val - min_val), 0.0, 1.0)

    def process_file(self, file_path):
        print(f"📂 Processing: {file_path}")
        
        # 1. Load Audio
        # Load with librosa (resample to 16kHz for Hubert)
        y, sr = librosa.load(file_path, sr=16000)
        duration = librosa.get_duration(y=y, sr=sr)
        
        # 2. Windowing (500ms chunks)
        window_size = 0.5 # seconds
        samples_per_window = int(window_size * sr)
        total_windows = int(len(y) / samples_per_window)
        
        results = []
        
        print(f"📊 Analyzing {total_windows} windows...")
        
        for i in range(total_windows):
            start_sample = i * samples_per_window
            end_sample = start_sample + samples_per_window
            y_chunk = y[start_sample:end_sample]
            
            # Handle Silence/Empty Chunk
            if len(y_chunk) < samples_per_window or np.max(np.abs(y_chunk)) < 0.001:
                results.append({
                    "timestamp": round(i * window_size, 2),
                    "loudness": 0.0,
                    "pitch": 0.0,
                    "jitter": 0.0,
                    "speed": 0.0,
                    "timbre": 0.0,
                    "emotion": "neutral",
                    "confidence": 1.0
                })
                continue

            # --- A. Acoustic Physics (Librosa) ---
            
            # 1. Loudness (RMS) -> CSS font-weight
            rms = float(np.sqrt(np.mean(y_chunk**2)))
            # Normalization: Typical speech RMS 0.01 to 0.1
            norm_loudness = self.normalize(rms, 0.005, 0.1)

            # 2. Pitch (F0) -> CSS color
            # Use pyin for robust F0 estimation
            f0, voiced_flag, voiced_probs = librosa.pyin(
                y_chunk, 
                fmin=librosa.note_to_hz('C2'), 
                fmax=librosa.note_to_hz('C7'),
                sr=sr
            )
            # Get mean of voiced F0s
            valid_f0 = f0[~np.isnan(f0)]
            avg_pitch = np.mean(valid_f0) if len(valid_f0) > 0 else 0
            # Normalization: 80Hz - 400Hz
            norm_pitch = self.normalize(avg_pitch, 80, 400)

            # 3. Jitter (Voice Tremor) -> CSS animation: shake
            # Jitter as std dev of pitch
            jitter = np.std(valid_f0) if len(valid_f0) > 1 else 0
            # Normalization: 0 to 20Hz deviation
            norm_jitter = self.normalize(jitter, 0, 20)
            
            # 4. Speech Rate (Onset Density) -> CSS letter-spacing
            onset_env = librosa.onset.onset_strength(y=y_chunk, sr=sr)
            # Sum of onset strength indicates activity/speed
            speed_val = np.mean(onset_env)
            # Normalization: 0 to 2.0
            norm_speed = self.normalize(speed_val, 0.1, 2.0)

            # 5. Timbre (Spectral Centroid) -> CSS text-shadow
            centroid = librosa.feature.spectral_centroid(y=y_chunk, sr=sr)
            avg_centroid = np.mean(centroid)
            # Normalization: 500Hz - 3000Hz
            norm_timbre = self.normalize(avg_centroid, 500, 3000)

            # --- B. AI Emotion Label (DistilHuBERT) ---
            # Transformers pipeline expects numpy array
            try:
                # Run inference on chunk
                # Note: pipeline handles raw audio
                ai_out = self.emotion_classifier(y_chunk)
                # Format: [{'score': 0.9, 'label': 'hap'}, ...]
                top_emotion = ai_out[0]
                emotion_label = top_emotion['label']
                emotion_conf = top_emotion['score']
            except Exception as e:
                emotion_label = "neutral"
                emotion_conf = 0.0

            results.append({
                "timestamp": round(i * window_size, 2),
                "loudness": round(float(norm_loudness), 3),
                "pitch": round(float(norm_pitch), 3),
                "jitter": round(float(norm_jitter), 3),
                "speed": round(float(norm_speed), 3),
                "timbre": round(float(norm_timbre), 3),
                "emotion": emotion_label,
                "confidence": round(float(emotion_conf), 3)
            })

        return {
            "duration": duration,
            "segments": results
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python process_audio.py <path_to_audio_file>")
        sys.exit(1)

    file_path = sys.argv[1]
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        sys.exit(1)

    processor = AudioProcessor()
    metadata = processor.process_file(file_path)
    
    # Save to JSON
    output_path = "emotion_metadata.json"
    with open(output_path, "w") as f:
        json.dump(metadata, f, indent=2)
    
    print(f"✅ Metadata saved to {output_path}")
