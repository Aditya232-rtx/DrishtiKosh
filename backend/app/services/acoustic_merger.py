"""
Helper function to merge acoustic features with video transcript.
Part of the Semantic-Emotional Captioning Engine.
"""

from typing import List
import logging

logger = logging.getLogger(__name__)


async def merge_acoustic_features_with_transcript(transcript: List, video_url: str):
    """
    Extract acoustic features from video and merge with transcript segments.
    
    Args:
        transcript: List of EmotionalSegment objects
        video_url: URL of the video to analyze
        
    Returns:
        Modified transcript list with acoustic metrics added
    """
    try:
        from app.services.audio_analysis import audio_analysis_service
        
        logger.info("Extracting acoustic features for Semantic-Emotional Captioning...")
        
        # Extract audio from video
        audio_path = await audio_analysis_service.extract_audio_from_url(video_url)
        
        if not audio_path:
            logger.warning("Audio extraction failed, proceeding without acoustic features")
            return transcript
        
        # Analyze audio features
        acoustic_segments = await audio_analysis_service.analyze_audio_features(audio_path)
        
        # Merge acoustic metrics with transcript segments by index
        for i, seg in enumerate(transcript):
            if i < len(acoustic_segments):
                acoustic_data = acoustic_segments[i]
                seg.timestamp = acoustic_data.get("timestamp")
                seg.metrics = acoustic_data.get("metrics")
        
        # Cleanup temp audio file
        audio_analysis_service.cleanup_temp_file(audio_path)
        
        logger.info(f"✅ Acoustic features merged for {len(acoustic_segments)} segments")
        return transcript
        
    except Exception as audio_error:
        logger.warning(f"Acoustic feature extraction failed: {audio_error}")
        # Continue without acoustic features (graceful degradation)
        return transcript
