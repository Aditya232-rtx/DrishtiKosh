"""
Audio Analysis Service for Semantic-Emotional Captioning Engine

Extracts acoustic features from audio to enable visual representation of sound
for deaf/hearing impaired users.

Features extracted:
1. RMS Amplitude (Loudness) → Font weight & size
2. Fundamental Frequency F0 (Pitch) → Color temperature
3. Jitter/Shimmer (Voice tremor) → Shake animation
4. Speech Rate (WPM) → Letter spacing
5. Spectral Centroid (Brightness) → Text shadow
"""

import librosa
import numpy as np
from scipy import signal
from typing import List, Dict, Optional
import logging
import os
import tempfile
import subprocess

logger = logging.getLogger(__name__)


class AudioAnalysisService:
    """Service for extracting acoustic features from audio files."""
    
    def __init__(self):
        self.sample_rate = 22050  # Standard sample rate for librosa
        self.window_size = 0.5  # 500ms windows
        
    async def extract_audio_from_url(self, url: str) -> Optional[str]:
        """
        Extract audio from YouTube or direct video URL.
        
        Args:
            url: Video URL (YouTube or direct link)
            
        Returns:
            Path to temporary audio file (WAV format)
        """
        try:
            # Create temporary file for audio
            temp_audio = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
            temp_audio.close()
            
            # Use yt-dlp to download audio
            cmd = [
                'yt-dlp',
                '-x',  # Extract audio
                '--audio-format', 'wav',
                '--audio-quality', '0',  # Best quality
                '-o', temp_audio.name.replace('.wav', '.%(ext)s'),
                url
            ]
            
            logger.info(f"Extracting audio from: {url}")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            
            if result.returncode != 0:
                logger.error(f"yt-dlp failed: {result.stderr}")
                return None
                
            # yt-dlp adds extension, find the actual file
            base_name = temp_audio.name.replace('.wav', '')
            if os.path.exists(f"{base_name}.wav"):
                return f"{base_name}.wav"
            
            logger.error("Audio file not found after extraction")
            return None
            
        except subprocess.TimeoutExpired:
            logger.error("Audio extraction timeout")
            return None
        except Exception as e:
            logger.error(f"Audio extraction failed: {e}")
            return None
    
    def extract_rms_amplitude(self, y: np.ndarray, frame_length: int) -> float:
        """
        Extract RMS (Root Mean Square) amplitude - represents loudness.
        
        Args:
            y: Audio time series
            frame_length: Number of samples in frame
            
        Returns:
            Normalized RMS value (0.0 - 1.0)
        """
        rms = librosa.feature.rms(y=y, frame_length=frame_length)[0]
        rms_mean = np.mean(rms)
        
        # Normalize to 0-1 range (typical RMS is 0-0.5 for speech)
        normalized = min(rms_mean * 2, 1.0)
        return float(normalized)
    
    def extract_pitch_f0(self, y: np.ndarray, sr: int) -> float:
        """
        Extract fundamental frequency (F0) - represents pitch.
        
        Args:
            y: Audio time series
            sr: Sample rate
            
        Returns:
            Pitch in Hz (0 if no pitch detected)
        """
        # Use pyin algorithm for pitch tracking
        f0, voiced_flag, voiced_probs = librosa.pyin(
            y,
            fmin=librosa.note_to_hz('C2'),  # ~65 Hz
            fmax=librosa.note_to_hz('C7')   # ~2093 Hz
        )
        
        # Get median pitch (ignore unvoiced frames)
        voiced_f0 = f0[voiced_flag]
        if len(voiced_f0) > 0:
            return float(np.median(voiced_f0))
        return 0.0
    
    def extract_jitter_shimmer(self, y: np.ndarray, sr: int) -> float:
        """
        Calculate jitter (pitch variation) - represents voice tremor/anxiety.
        
        Args:
            y: Audio time series
            sr: Sample rate
            
        Returns:
            Normalized jitter value (0.0 - 1.0)
        """
        # Extract pitch track
        f0, voiced_flag, _ = librosa.pyin(
            y,
            fmin=librosa.note_to_hz('C2'),
            fmax=librosa.note_to_hz('C7')
        )
        
        # Calculate jitter as coefficient of variation of pitch
        voiced_f0 = f0[voiced_flag]
        if len(voiced_f0) > 5:  # Need enough samples
            jitter = np.std(voiced_f0) / (np.mean(voiced_f0) + 1e-10)
            # Normalize (typical jitter is 0-0.1 for normal speech)
            normalized = min(jitter * 10, 1.0)
            return float(normalized)
        return 0.0
    
    def calculate_speech_rate(self, y: np.ndarray, sr: int, duration: float) -> float:
        """
        Estimate speech rate in words per second.
        
        Args:
            y: Audio time series
            sr: Sample rate
            duration: Duration in seconds
            
        Returns:
            Words per second estimate
        """
        # Detect onset events (syllable/word boundaries)
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        onsets = librosa.onset.onset_detect(
            onset_envelope=onset_env,
            sr=sr,
            units='time'
        )
        
        if len(onsets) > 0 and duration > 0:
            # Estimate: ~1.5 syllables per word, onsets ≈ syllables
            syllables_per_sec = len(onsets) / duration
            words_per_sec = syllables_per_sec / 1.5
            return float(words_per_sec)
        return 0.0
    
    def extract_spectral_centroid(self, y: np.ndarray, sr: int) -> float:
        """
        Extract spectral centroid - represents brightness/timbre.
        
        Args:
            y: Audio time series
            sr: Sample rate
            
        Returns:
            Spectral centroid in Hz
        """
        centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        centroid_mean = np.mean(centroid)
        return float(centroid_mean)
    
    async def analyze_audio_features(self, audio_path: str) -> List[Dict]:
        """
        Analyze audio file and extract features in 500ms windows.
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            List of feature dictionaries with timestamps
        """
        try:
            # Load audio file
            logger.info(f"Loading audio: {audio_path}")
            y, sr = librosa.load(audio_path, sr=self.sample_rate)
            duration = librosa.get_duration(y=y, sr=sr)
            
            logger.info(f"Audio loaded: {duration:.2f}s, sr={sr}")
            
            # Calculate window parameters
            window_samples = int(self.window_size * sr)
            hop_samples = window_samples  # No overlap
            
            segments = []
            
            # Process audio in windows
            for i in range(0, len(y), hop_samples):
                window_y = y[i:i + window_samples]
                
                # Skip if window too short
                if len(window_y) < window_samples // 2:
                    break
                
                timestamp = i / sr
                
                # Extract all features for this window
                try:
                    rms = self.extract_rms_amplitude(window_y, len(window_y))
                    pitch = self.extract_pitch_f0(window_y, sr)
                    jitter = self.extract_jitter_shimmer(window_y, sr)
                    speech_rate = self.calculate_speech_rate(window_y, sr, self.window_size)
                    centroid = self.extract_spectral_centroid(window_y, sr)
                    
                    segments.append({
                        "timestamp": round(timestamp, 2),
                        "metrics": {
                            "rms": round(rms, 3),
                            "pitch_f0": round(pitch, 2),
                            "jitter": round(jitter, 3),
                            "speech_rate": round(speech_rate, 2),
                            "centroid": round(centroid, 2)
                        }
                    })
                    
                except Exception as e:
                    logger.warning(f"Feature extraction failed for window at {timestamp}s: {e}")
                    continue
            
            logger.info(f"Extracted features for {len(segments)} segments")
            return segments
            
        except Exception as e:
            logger.error(f"Audio analysis failed: {e}")
            raise
    
    def cleanup_temp_file(self, file_path: str):
        """Remove temporary audio file."""
        try:
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Cleaned up temp file: {file_path}")
        except Exception as e:
            logger.warning(f"Failed to cleanup temp file: {e}")


# Singleton instance
audio_analysis_service = AudioAnalysisService()
