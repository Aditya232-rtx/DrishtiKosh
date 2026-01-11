/**
 * EmotionalCaption Component
 * 
 * Renders video captions with dynamic CSS styling based on real-time acoustic analysis.
 * Consumes emotion_metadata.json from the enhanced audio processor.
 * 
 * Features:
 * - Real-time synchronization with video playback
 * - Dynamic CSS mutations based on 5 acoustic features
 * - AI emotion labels from DistilHuBERT
 * - Smooth transitions between states
 * - Debug mode for development
 */

import React, { useState, useEffect, useRef } from 'react';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Interpolate color based on pitch frequency.
 * Low pitch (<150Hz) → Blue (Serious, Calm)
 * Mid pitch (150-350Hz) → White (Neutral)
 * High pitch (>350Hz) → Red (Excited, Urgent)
 */
const getPitchColor = (pitchHz: number): string => {
    if (pitchHz === 0) return '#ffffff'; // No pitch detected

    if (pitchHz < 150) {
        // Low pitch → Blue
        const intensity = Math.max(0, (150 - pitchHz) / 70); // 80-150Hz range
        return `rgb(${Math.round(100 * (1 - intensity))}, ${Math.round(150 * (1 - intensity))}, 255)`;
    } else if (pitchHz > 350) {
        // High pitch → Red
        const intensity = Math.min(1, (pitchHz - 350) / 100); // 350-450Hz range
        return `rgb(255, ${Math.round(100 * (1 - intensity))}, ${Math.round(100 * (1 - intensity))})`;
    } else {
        // Mid pitch → White with slight tint
        const position = (pitchHz - 150) / 200; // 0 = blue side, 1 = red side
        if (position < 0.5) {
            // Closer to blue
            return `rgb(200, 220, 255)`;
        } else {
            // Closer to red
            return `rgb(255, 220, 200)`;
        }
    }
};

/**
 * Get dynamic styles based on acoustic metrics.
 * This is the core "Visual Translation" function.
 */
const getDynamicStyles = (metrics: any): React.CSSProperties => {
    if (!metrics) {
        return {
            fontWeight: 400,
            fontSize: '1rem',
            color: '#ffffff',
            letterSpacing: '0px',
            textShadow: 'none',
            transition: 'all 0.2s ease'
        };
    }

    const {
        rms = 0,           // Loudness (0-1)
        pitch_f0 = 0,      // Pitch in Hz
        jitter = 0,        // Voice tremor (0-1)
        speech_rate = 0,   // Words per second
        centroid = 0       // Spectral centroid in Hz
    } = metrics;

    // 1. Loudness → Font Weight & Size
    const fontWeight = Math.round(400 + (rms * 500)); // 400-900
    const fontSize = `${1 + (rms * 0.5)}rem`;          // 1-1.5rem

    // 2. Pitch → Color
    const color = getPitchColor(pitch_f0);

    // 3. Jitter → Animation
    // Normalize jitter to 0-1 scale (it's already normalized in backend)
    const animation = jitter > 0.4 ? 'tremble 0.2s infinite' : 'none';

    // 4. Speech Rate → Letter Spacing
    // Normalize speech_rate (0-5 wps) to 0-1 scale
    const speedNormalized = Math.min(speech_rate / 5, 1);
    // High speed (1.0) → -1px, Low speed (0.0) → 2px
    const letterSpacing = `${2 - (speedNormalized * 3)}px`;

    // 5. Spectral Centroid → Text Shadow
    // Normalize centroid (typical range 500-3000 Hz)
    const centroidNormalized = Math.min(Math.max((centroid - 500) / 2500, 0), 1);
    let textShadow;
    if (centroidNormalized > 0.7) {
        // High (Sharp, Bright)
        textShadow = '1px 1px 0px rgba(0, 0, 0, 0.8)';
    } else if (centroidNormalized < 0.3) {
        // Low (Muffled, Dull)
        textShadow = '0px 0px 8px rgba(128, 128, 128, 0.6)';
    } else {
        // Mid
        const blur = Math.round(4 * (1 - centroidNormalized));
        textShadow = `0px 0px ${blur}px rgba(0, 0, 0, 0.5)`;
    }

    return {
        fontWeight,
        fontSize,
        color,
        animation,
        letterSpacing,
        textShadow,
        transition: 'all 0.2s ease' // Smooth transitions
    };
};

// ============================================================================
// COMPONENT
// ============================================================================

interface EmotionalCaptionProps {
    videoUrl: string;
    metadata: any; // The emotion_metadata.json data
    debugMode?: boolean;
}

const EmotionalCaption: React.FC<EmotionalCaptionProps> = ({
    videoUrl,
    metadata,
    debugMode = false
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [currentSegment, setCurrentSegment] = useState<any>(null);
    const [currentTime, setCurrentTime] = useState(0);

    // Find the active segment based on current video time
    useEffect(() => {
        if (!metadata || !metadata.segments) return;

        const segments = metadata.segments;
        const activeSegment = segments.find((seg: any, idx: number) => {
            const nextSeg = segments[idx + 1];
            const segTime = seg.timestamp;
            const nextTime = nextSeg ? nextSeg.timestamp : Infinity;
            return currentTime >= segTime && currentTime < nextTime;
        });

        setCurrentSegment(activeSegment || segments[0]);
    }, [currentTime, metadata]);

    // Handle video time updates
    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    // Get dynamic styles for current segment
    const captionStyle = getDynamicStyles(currentSegment?.metrics);

    return (
        <div className="emotional-caption-container">
            {/* Custom CSS for tremble animation */}
            <style>{`
                @keyframes tremble {
                    0%, 100% { transform: translateX(0) translateY(0); }
                    25% { transform: translateX(-2px) translateY(1px); }
                    50% { transform: translateX(2px) translateY(-1px); }
                    75% { transform: translateX(-1px) translateY(2px); }
                }
            `}</style>

            {/* Video Player */}
            <video
                ref={videoRef}
                src={videoUrl}
                controls
                onTimeUpdate={handleTimeUpdate}
                className="w-full rounded-lg"
            />

            {/* Caption Display */}
            <div className="caption-display mt-4 p-6 bg-black/80 rounded-2xl backdrop-blur-sm">
                {currentSegment ? (
                    <p
                        className="text-3xl font-semibold leading-relaxed text-center"
                        style={captionStyle}
                    >
                        {currentSegment.text || 'Processing...'}
                    </p>
                ) : (
                    <p className="text-gray-400 text-center">No caption available</p>
                )}

                {/* Emotion Badge */}
                {currentSegment?.emotion && (
                    <div className="flex justify-center mt-3">
                        <span className="text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-300">
                            {currentSegment.emotion.label}
                            {' '}
                            ({Math.round(currentSegment.emotion.confidence * 100)}%)
                        </span>
                    </div>
                )}
            </div>

            {/* Debug Mode */}
            {debugMode && currentSegment && (
                <div className="debug-panel fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs font-mono max-w-xs">
                    <div className="font-bold mb-2 text-purple-400">🔍 Debug Info</div>
                    <div className="space-y-1">
                        <div>Time: {currentTime.toFixed(2)}s</div>
                        <div>Loudness: {currentSegment.metrics?.rms?.toFixed(3) || 'N/A'}</div>
                        <div>Pitch: {currentSegment.metrics?.pitch_f0?.toFixed(1) || 'N/A'} Hz</div>
                        <div>Jitter: {currentSegment.metrics?.jitter?.toFixed(3) || 'N/A'}</div>
                        <div>Speed: {currentSegment.metrics?.speech_rate?.toFixed(2) || 'N/A'} wps</div>
                        <div>Centroid: {currentSegment.metrics?.centroid?.toFixed(0) || 'N/A'} Hz</div>
                        <div className="pt-2 border-t border-gray-700">
                            Emotion: <span className="text-purple-300">{currentSegment.emotion?.label || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmotionalCaption;
