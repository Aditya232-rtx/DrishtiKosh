/**
 * Enhanced Acoustic-to-CSS Mapping Utilities
 * 
 * Advanced version with richer visual effects:
 * - Gradient color transitions based on pitch
 * - Dynamic font weight scaling
 * - Multiple shake/vibrate intensities
 * - Smooth animations and transitions
 */

import React from 'react';

export interface AudioMetrics {
    rms: number;          // RMS amplitude (0.0-1.0) - Loudness
    pitch_f0: number;     // Fundamental frequency in Hz - Pitch
    jitter: number;       // Voice tremor (0.0-1.0) - Anxiety/Emotion
    speech_rate: number;  // Words per second - Speed
    centroid: number;     // Spectral centroid in Hz - Brightness
}

/**
 * Advanced pitch-to-color mapping with gradient transitions.
 * Creates smooth color gradients based on pitch frequency.
 */
export function getAdvancedPitchColor(f0: number, rms: number = 0.5): string {
    if (f0 === 0) return '#e0e0e0'; // Silence - Gray

    // Normalize pitch to 0-1 scale (80Hz to 400Hz range)
    const pitchNorm = Math.min(Math.max((f0 - 80) / 320, 0), 1);

    // Create color gradient: Blue → Cyan → White → Yellow → Red
    let r, g, b;

    if (pitchNorm < 0.25) {
        // Very low (80-160Hz): Deep Blue → Cyan
        const t = pitchNorm / 0.25;
        r = Math.round(0 + (0 * t));
        g = Math.round(100 + (155 * t));
        b = Math.round(200 + (55 * t));
    } else if (pitchNorm < 0.5) {
        // Low-Mid (160-240Hz): Cyan → White
        const t = (pitchNorm - 0.25) / 0.25;
        r = Math.round(0 + (255 * t));
        g = Math.round(255);
        b = Math.round(255);
    } else if (pitchNorm < 0.75) {
        // Mid-High (240-320Hz): White → Yellow
        const t = (pitchNorm - 0.5) / 0.25;
        r = Math.round(255);
        g = Math.round(255);
        b = Math.round(255 - (100 * t));
    } else {
        // High (320-400Hz): Yellow → Red
        const t = (pitchNorm - 0.75) / 0.25;
        r = Math.round(255);
        g = Math.round(255 - (155 * t));
        b = Math.round(155 - (155 * t));
    }

    // Adjust brightness based on loudness
    const brightness = 0.7 + (rms * 0.3); // 0.7-1.0
    r = Math.round(r * brightness);
    g = Math.round(g * brightness);
    b = Math.round(b * brightness);

    return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Get shake animation based on jitter intensity.
 * Returns animation name and parameters.
 */
export function getShakeAnimation(jitter: number): string {
    if (jitter < 0.2) return 'none';

    if (jitter < 0.4) {
        // Mild tremor
        return 'shake-mild 0.3s ease-in-out infinite';
    } else if (jitter < 0.7) {
        // Moderate shake
        return 'shake-moderate 0.2s ease-in-out infinite';
    } else {
        // Intense vibration
        return 'shake-intense 0.15s ease-in-out infinite';
    }
}

/**
 * Get letter spacing based on speech rate with enhanced scaling.
 */
export function getAdvancedLetterSpacing(wps: number): string {
    // Normalize: 0-5 wps → 0-1
    const speedNorm = Math.min(wps / 5, 1);

    // Enhanced range: -2px to +3px
    const spacing = 3 - (speedNorm * 5);
    return `${spacing.toFixed(1)}px`;
}

/**
 * Get advanced text shadow based on spectral centroid.
 */
export function getAdvancedTextShadow(centroid: number, rms: number = 0.5): string {
    // Normalize centroid (500-3000 Hz)
    const centroidNorm = Math.min(Math.max((centroid - 500) / 2500, 0), 1);

    if (centroidNorm > 0.7) {
        // High brightness - Sharp, crisp shadow
        const intensity = rms * 0.9;
        return `2px 2px 0px rgba(0, 0, 0, ${intensity}), 
                -1px -1px 0px rgba(255, 255, 255, ${intensity * 0.3})`;
    } else if (centroidNorm < 0.3) {
        // Low brightness - Soft, blurred shadow
        const blur = Math.round(10 * (1 - centroidNorm));
        return `0px 0px ${blur}px rgba(100, 100, 100, ${rms * 0.6})`;
    } else {
        // Mid brightness - Balanced shadow
        const blur = Math.round(4 * (1 - centroidNorm));
        return `1px 1px ${blur}px rgba(0, 0, 0, ${rms * 0.5})`;
    }
}

/**
 * Enhanced acoustic-to-CSS mapping with advanced visual effects.
 */
export function mapAcousticToCSS(metrics: AudioMetrics): React.CSSProperties {
    if (!metrics) {
        return {
            fontWeight: 400,
            fontSize: '1rem',
            color: '#ffffff',
            letterSpacing: '0px',
            textShadow: 'none',
            animation: 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        };
    }

    const {
        rms = 0,
        pitch_f0 = 0,
        jitter = 0,
        speech_rate = 0,
        centroid = 0
    } = metrics;

    // 1. Enhanced Loudness → Font Weight & Size
    const fontWeight = Math.round(300 + (rms * 600)); // 300-900 (wider range)
    const fontSize = `${0.9 + (rms * 0.8)}rem`;        // 0.9-1.7rem (more dramatic)

    // 2. Advanced Pitch → Color Gradient
    const color = getAdvancedPitchColor(pitch_f0, rms);

    // 3. Enhanced Jitter → Multi-level Shake
    const animation = getShakeAnimation(jitter);

    // 4. Advanced Speech Rate → Letter Spacing
    const letterSpacing = getAdvancedLetterSpacing(speech_rate);

    // 5. Enhanced Spectral Centroid → Advanced Shadow
    const textShadow = getAdvancedTextShadow(centroid, rms);

    // 6. Additional: Text transform based on intensity
    const textTransform = rms > 0.8 ? 'uppercase' : 'none';

    // 7. Additional: Opacity variation for emphasis
    const opacity = 0.85 + (rms * 0.15); // 0.85-1.0

    return {
        fontWeight,
        fontSize,
        color,
        animation,
        letterSpacing,
        textShadow,
        textTransform: textTransform as any,
        opacity,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', // Smooth easing
        transform: `scale(${1 + (rms * 0.05)})`, // Subtle scale effect
        filter: `brightness(${1 + (rms * 0.2)})` // Brightness boost
    };
}

/**
 * Get human-readable description of acoustic state.
 */
export function getAcousticDescription(metrics: AudioMetrics): string {
    const parts: string[] = [];

    if (metrics.rms > 0.7) parts.push('Very loud');
    else if (metrics.rms > 0.4) parts.push('Moderate volume');
    else parts.push('Quiet');

    if (metrics.pitch_f0 > 350) parts.push('high-pitched');
    else if (metrics.pitch_f0 > 150) parts.push('mid-pitched');
    else if (metrics.pitch_f0 > 0) parts.push('low-pitched');

    if (metrics.jitter > 0.7) parts.push('intense tremor');
    else if (metrics.jitter > 0.4) parts.push('moderate tremor');
    else if (metrics.jitter > 0.2) parts.push('slight tremor');

    if (metrics.speech_rate > 3) parts.push('very fast speech');
    else if (metrics.speech_rate > 2) parts.push('fast speech');
    else if (metrics.speech_rate < 1) parts.push('slow speech');

    return parts.join(', ');
}

export default mapAcousticToCSS;
