import React, { useState, useEffect, useRef } from 'react';

// Interfaces matching the output of process_audio.py
export interface EmotionSegment {
    timestamp: number;
    loudness: number; // 0.0 - 1.0
    pitch: number;    // 0.0 - 1.0 (Normalized 80Hz - 400Hz)
    jitter: number;   // 0.0 - 1.0
    speed: number;    // 0.0 - 1.0
    timbre: number;   // 0.0 - 1.0
    emotion: string;
    confidence: number;
    text?: string;    // Optional transcript text if available
}

export interface EmotionMetadata {
    duration: number;
    segments: EmotionSegment[];
}

interface EmotionalCaptionProps {
    videoUrl: string;
    metadata: EmotionMetadata;
    className?: string;
}

const EmotionalCaption: React.FC<EmotionalCaptionProps> = ({ videoUrl, metadata, className }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [currentSegment, setCurrentSegment] = useState<EmotionSegment | null>(null);
    const [debugMode, setDebugMode] = useState(true);

    // Function to interpolate color based on Pitch (Hz)
    // Backend normalizes Pitch (0.0 = 80Hz, 1.0 = 400Hz)
    const getPitchColor = (normPitch: number) => {
        // Reverse map normalized pitch to Hz estimate for logic
        const hz = normPitch * (400 - 80) + 80;

        if (hz < 150) {
            // Low -> Blueish
            // Interpolate towards White as it approaches 150
            return `rgb(${100 + normPitch * 155}, ${100 + normPitch * 155}, 255)`;
        } else if (hz > 350) {
            // High -> Reddish
            return `rgb(255, ${255 - (normPitch * 100)}, ${255 - (normPitch * 100)})`;
        } else {
            // Mid -> White dominant
            return "white";
        }
    };

    const getDynamicStyles = (metrics: EmotionSegment): React.CSSProperties => {
        // 1. Loudness -> Font Weight (400-900) & Size (1rem-1.5rem)
        const weight = 400 + Math.round(metrics.loudness * 500); // 400 to 900
        const size = 1 + (metrics.loudness * 0.5); // 1rem to 1.5rem

        // 2. Pitch -> Color
        const color = getPitchColor(metrics.pitch);

        // 3. Jitter -> Animation (Tremble)
        const animation = metrics.jitter > 0.4 ? 'tremble 0.2s infinite' : 'none';

        // 4. Speed -> Letter Spacing
        // High Speed (1.0) -> -1px. Low Speed (0.0) -> 2px.
        const letterSpacing = `${2 - (metrics.speed * 3)}px`;

        // 5. Timbre -> Text Shadow (Blur)
        // High (1.0, Sharp) -> 1px 1px 0px black
        // Low (0.0, Blur) -> 0px 0px 8px gray
        const shadowBlur = (1 - metrics.timbre) * 8;
        const shadowColor = metrics.timbre > 0.5 ? 'black' : 'gray';
        const textShadow = metrics.timbre > 0.5
            ? '1px 1px 0px black'
            : `0px 0px ${shadowBlur}px ${shadowColor}`;

        return {
            fontWeight: weight,
            fontSize: `${size}rem`,
            color: color,
            animation: animation,
            letterSpacing: letterSpacing,
            textShadow: textShadow,
            transition: 'all 0.2s ease', // Liquid smoothing
            display: 'inline-block',
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: 'rgba(0,0,0,0.5)',
            marginBottom: '20px'
        };
    };

    const handleTimeUpdate = () => {
        if (!videoRef.current || !metadata?.segments) return;
        const currentTime = videoRef.current.currentTime;

        // Find segment matching current time
        // Segments are 0.5s chunks. 
        const segment = metadata.segments.find(seg =>
            currentTime >= seg.timestamp && currentTime < seg.timestamp + 0.5
        );

        if (segment) {
            setCurrentSegment(segment);
        }
    };

    return (
        <div className={`relative ${className}`}>
            {/* Styles Injection for Keyframes */}
            <style>
                {`
                    @keyframes tremble {
                        0% { transform: translate(0px, 0px); }
                        25% { transform: translate(1px, 1px); }
                        50% { transform: translate(-1px, 0px); }
                        75% { transform: translate(0px, -1px); }
                        100% { transform: translate(0px, 0px); }
                    }
                `}
            </style>

            <video
                ref={videoRef}
                src={videoUrl}
                controls
                className="w-full rounded-2xl shadow-lg"
                onTimeUpdate={handleTimeUpdate}
                crossOrigin="anonymous"
            />

            {/* Overlay Caption Area */}
            <div className="absolute bottom-16 left-0 w-full text-center pointer-events-none">
                {currentSegment ? (
                    <div style={getDynamicStyles(currentSegment)}>
                        {currentSegment.text || `[${currentSegment.emotion.toUpperCase()}] Content...`}
                    </div>
                ) : (
                    <div className="text-white bg-black/50 p-2 inline-block rounded">
                        Waiting for audio...
                    </div>
                )}
            </div>

            {/* Debug Overlay */}
            {debugMode && currentSegment && (
                <div className="absolute top-4 right-4 bg-black/80 text-green-400 font-mono text-xs p-3 rounded-lg border border-green-500/30 shadow-xl backdrop-blur-sm transition-opacity opacity-70 hover:opacity-100 pointer-events-auto cursor-pointer" onClick={() => setDebugMode(false)}>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <span className="text-gray-400">Time:</span>
                        <span>{currentSegment.timestamp}s</span>

                        <span className="text-gray-400">Emotion:</span>
                        <span className="font-bold text-white">{currentSegment.emotion.toUpperCase()}</span>

                        <span className="text-gray-400">Loudness:</span>
                        <div className="flex items-center gap-1">
                            <div className="w-8 h-1 bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500" style={{ width: `${currentSegment.loudness * 100}%` }} />
                            </div>
                            {currentSegment.loudness.toFixed(2)}
                        </div>

                        <span className="text-gray-400">Pitch:</span>
                        <div className="flex items-center gap-1">
                            <div className="w-8 h-1 bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-400" style={{ width: `${currentSegment.pitch * 100}%` }} />
                            </div>
                            {currentSegment.pitch.toFixed(2)}
                        </div>

                        <span className="text-gray-400">Jitter:</span>
                        <span className={currentSegment.jitter > 0.4 ? "text-red-400 animate-pulse" : "text-gray-300"}>{currentSegment.jitter.toFixed(2)}</span>

                        <span className="text-gray-400">Speed:</span>
                        <span>{currentSegment.speed.toFixed(2)}</span>
                    </div>
                    <div className="mt-2 text-[10px] text-gray-500 text-center">Click to hide</div>
                </div>
            )}
            {!debugMode && (
                <button
                    onClick={() => setDebugMode(true)}
                    className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded hover:bg-black/70 transition-colors"
                >
                    Show Debug
                </button>
            )}
        </div>
    );
};

export default EmotionalCaption;
