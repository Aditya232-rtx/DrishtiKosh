"""
Enhanced Audio Processing with Acoustic Physics + AI Emotion Recognition
Combines librosa-based acoustic analysis with DistilHuBERT emotion detection.

Features:
1. RMS Amplitude (Loudness) → font-weight
2. Pitch F0 → color
3. Jitter (Voice Tremor) → shake animation
4. Speech Rate (WPM) → letter-spacing
5. Spectral Centroid (Timbre) → text-shadow
6. AI Emotion Labels (DistilHuBERT) → emotion tags

Output: JSON metadata for React frontend
"""

import librosa
import numpy as np
import json
import warnings
from typing import List, Dict, Optional
from pathlib import Path

# Suppress warnings for cleaner output
warnings.filterwarnings('ignore')


class EnhancedAudioProcessor:
    """
    Processes audio files to extract acoustic features and AI-based emotion labels.
    """
    
    def __init__(self, window_size: float = 0.5, sample_rate: int = 16000):
        """
        Initialize the audio processor.
        
        Args:
            window_size: Window size in seconds (default: 0.5s)
            sample_rate: Target sample rate for processing (default: 16000 Hz)
        """
        self.window_size = window_size
        self.sample_rate = sample_rate
        self.emotion_pipeline = None
        
    def load_emotion_model(self):
        """
        Load DistilHuBERT emotion recognition model from Hugging Face.
        Uses a lightweight fine-tuned model for emotion recognition.
        """
        try:
            from transformers import pipeline
            
            # Load emotion recognition pipeline
            # Using a lightweight emotion recognition model
            self.emotion_pipeline = pipeline(
                "audio-classification",
                model="superb/hubert-base-superb-er",  # Emotion Recognition
                device=-1  # CPU (use 0 for GPU)
            )
            print("✅ DistilHuBERT emotion model loaded successfully")
            return True
        except Exception as e:
            print(f"⚠️ Failed to load emotion model: {e}")
            print("   Continuing with acoustic features only...")
            return False
    
    def normalize_value(self, value: float, min_val: float, max_val: float) -> float:
        """
        Normalize a value to 0.0-1.0 range.
        
        Args:
            value: Input value
            min_val: Minimum expected value
            max_val: Maximum expected value
            
        Returns:
            Normalized value between 0.0 and 1.0
        """
        if max_val == min_val:
            return 0.5
        normalized = (value - min_val) / (max_val - min_val)
        return float(np.clip(normalized, 0.0, 1.0))
    
    def extract_rms_amplitude(self, y: np.ndarray) -> float:
        """
        Extract RMS amplitude (loudness).
        
        Args:
            y: Audio time series
            
        Returns:
            Normalized RMS value (0.0-1.0)
        """
        if len(y) == 0:
            return 0.0
            
        rms = librosa.feature.rms(y=y, frame_length=len(y))[0]
        rms_mean = np.mean(rms)
        
        # Normalize: typical speech RMS is 0.0-0.5, we map to 0.0-1.0
        normalized = self.normalize_value(rms_mean, 0.0, 0.5)
        return round(normalized, 3)
    
    def extract_pitch_f0(self, y: np.ndarray, sr: int) -> float:
        """
        Extract fundamental frequency (pitch).
        
        Args:
            y: Audio time series
            sr: Sample rate
            
        Returns:
            Pitch in Hz (0 if silence)
        """
        if len(y) < sr // 10:  # Too short
            return 0.0
            
        try:
            f0, voiced_flag, _ = librosa.pyin(
                y,
                fmin=librosa.note_to_hz('C2'),  # ~65 Hz
                fmax=librosa.note_to_hz('C7'),  # ~2093 Hz
                sr=sr
            )
            
            # Get median pitch from voiced frames
            voiced_f0 = f0[~np.isnan(f0) & voiced_flag]
            if len(voiced_f0) > 0:
                return round(float(np.median(voiced_f0)), 2)
            return 0.0
        except Exception:
            return 0.0
    
    def extract_jitter(self, y: np.ndarray, sr: int) -> float:
        """
        Calculate jitter (pitch variation / voice tremor).
        
        Args:
            y: Audio time series
            sr: Sample rate
            
        Returns:
            Normalized jitter value (0.0-1.0)
        """
        if len(y) < sr // 10:
            return 0.0
            
        try:
            f0, voiced_flag, _ = librosa.pyin(
                y,
                fmin=librosa.note_to_hz('C2'),
                fmax=librosa.note_to_hz('C7'),
                sr=sr
            )
            
            # Calculate coefficient of variation
            voiced_f0 = f0[~np.isnan(f0) & voiced_flag]
            if len(voiced_f0) > 5:
                jitter = np.std(voiced_f0) / (np.mean(voiced_f0) + 1e-10)
                # Normalize: typical jitter is 0.0-0.1
                normalized = self.normalize_value(jitter, 0.0, 0.1)
                return round(normalized, 3)
            return 0.0
        except Exception:
            return 0.0
    
    def calculate_speech_rate(self, y: np.ndarray, sr: int, duration: float) -> float:
        """
        Estimate speech rate (words per second).
        
        Args:
            y: Audio time series
            sr: Sample rate
            duration: Duration in seconds
            
        Returns:
            Words per second estimate
        """
        if len(y) == 0 or duration == 0:
            return 0.0
            
        try:
            # Detect onset events (syllable/word boundaries)
            onset_env = librosa.onset.onset_strength(y=y, sr=sr)
            onsets = librosa.onset.onset_detect(
                onset_envelope=onset_env,
                sr=sr,
                units='time'
            )
            
            if len(onsets) > 0:
                # Estimate: ~1.5 syllables per word
                syllables_per_sec = len(onsets) / duration
                words_per_sec = syllables_per_sec / 1.5
                return round(float(words_per_sec), 2)
            return 0.0
        except Exception:
            return 0.0
    
    def extract_spectral_centroid(self, y: np.ndarray, sr: int) -> float:
        """
        Extract spectral centroid (timbre/brightness).
        
        Args:
            y: Audio time series
            sr: Sample rate
            
        Returns:
            Spectral centroid in Hz
        """
        if len(y) == 0:
            return 0.0
            
        try:
            centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
            centroid_mean = np.mean(centroid)
            return round(float(centroid_mean), 2)
        except Exception:
            return 0.0
    
    def detect_emotion(self, audio_chunk: np.ndarray, sr: int) -> Dict[str, any]:
        """
        Detect emotion using DistilHuBERT model.
        
        Args:
            audio_chunk: Audio time series
            sr: Sample rate
            
        Returns:
            Dictionary with emotion label and confidence
        """
        if self.emotion_pipeline is None:
            return {"label": "neutral", "confidence": 0.0}
            
        try:
            # Resample if needed (model expects 16kHz)
            if sr != 16000:
                audio_chunk = librosa.resample(audio_chunk, orig_sr=sr, target_sr=16000)
            
            # Run emotion detection
            result = self.emotion_pipeline(audio_chunk, sampling_rate=16000)
            
            if result and len(result) > 0:
                top_emotion = result[0]
                return {
                    "label": top_emotion['label'],
                    "confidence": round(top_emotion['score'], 3)
                }
            return {"label": "neutral", "confidence": 0.0}
        except Exception as e:
            print(f"⚠️ Emotion detection failed: {e}")
            return {"label": "neutral", "confidence": 0.0}
    
    def process_audio_file(self, audio_path: str, output_path: str = "emotion_metadata.json") -> List[Dict]:
        """
        Process audio file and generate emotion metadata JSON.
        
        Args:
            audio_path: Path to input audio file
            output_path: Path to output JSON file
            
        Returns:
            List of metadata dictionaries for each window
        """
        print(f"🎵 Loading audio: {audio_path}")
        
        # Load audio file
        y, sr = librosa.load(audio_path, sr=self.sample_rate)
        duration = librosa.get_duration(y=y, sr=sr)
        
        print(f"   Duration: {duration:.2f}s, Sample Rate: {sr} Hz")
        
        # Calculate window parameters
        window_samples = int(self.window_size * sr)
        hop_samples = window_samples  # No overlap
        
        metadata = []
        
        # Process audio in windows
        for i in range(0, len(y), hop_samples):
            window_y = y[i:i + window_samples]
            
            # Skip if window too short
            if len(window_y) < window_samples // 2:
                break
            
            timestamp = i / sr
            
            # Check if window is silence
            is_silence = np.max(np.abs(window_y)) < 0.01
            
            if is_silence:
                # Zero out metrics for silence
                segment = {
                    "timestamp": round(timestamp, 2),
                    "metrics": {
                        "rms": 0.0,
                        "pitch_f0": 0.0,
                        "jitter": 0.0,
                        "speech_rate": 0.0,
                        "centroid": 0.0
                    },
                    "emotion": {
                        "label": "silence",
                        "confidence": 1.0
                    }
                }
            else:
                # Extract acoustic features
                rms = self.extract_rms_amplitude(window_y)
                pitch = self.extract_pitch_f0(window_y, sr)
                jitter = self.extract_jitter(window_y, sr)
                speech_rate = self.calculate_speech_rate(window_y, sr, self.window_size)
                centroid = self.extract_spectral_centroid(window_y, sr)
                
                # Detect emotion
                emotion = self.detect_emotion(window_y, sr)
                
                segment = {
                    "timestamp": round(timestamp, 2),
                    "metrics": {
                        "rms": rms,
                        "pitch_f0": pitch,
                        "jitter": jitter,
                        "speech_rate": speech_rate,
                        "centroid": centroid
                    },
                    "emotion": emotion
                }
            
            metadata.append(segment)
            
            # Progress indicator
            if len(metadata) % 10 == 0:
                print(f"   Processed {len(metadata)} segments ({timestamp:.1f}s)...")
        
        print(f"✅ Extracted features for {len(metadata)} segments")
        
        # Save to JSON
        output_data = {
            "audio_file": str(Path(audio_path).name),
            "duration": round(duration, 2),
            "sample_rate": sr,
            "window_size": self.window_size,
            "segments": metadata
        }
        
        with open(output_path, 'w') as f:
            json.dump(output_data, f, indent=2)
        
        print(f"💾 Saved metadata to: {output_path}")
        
        return metadata


def main():
    """
    Main execution function.
    """
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python process_audio.py <audio_file_path> [output_json_path]")
        print("Example: python process_audio.py speech.wav emotion_metadata.json")
        sys.exit(1)
    
    audio_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else "emotion_metadata.json"
    
    # Initialize processor
    processor = EnhancedAudioProcessor(window_size=0.5, sample_rate=16000)
    
    # Load emotion model
    processor.load_emotion_model()
    
    # Process audio
    metadata = processor.process_audio_file(audio_path, output_path)
    
    print(f"\n🎯 Processing complete!")
    print(f"   Total segments: {len(metadata)}")
    print(f"   Output file: {output_path}")


if __name__ == "__main__":
    main()
