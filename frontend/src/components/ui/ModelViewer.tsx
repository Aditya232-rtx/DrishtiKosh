import '@google/model-viewer';
import { useState } from 'react';
import { LoaderFive } from './loader';

declare global {
    namespace JSX {
        interface IntrinsicElements {
            'model-viewer': any;
        }
    }
}

interface ModelViewerProps {
    src: string;
    poster?: string;
    alt: string;
}

export default function ModelViewer({ src, poster, alt }: ModelViewerProps) {
    const [isLoading, setIsLoading] = useState(true);

    return (
        <div className="w-full h-full min-h-[300px] bg-gray-800/30 rounded-xl overflow-hidden relative">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-900/80">
                    <LoaderFive text="Loading 3D model..." />
                </div>
            )}
            <model-viewer
                src={src}
                ios-src=""
                poster={poster || "https://modelviewer.dev/shared-assets/models/Astronaut.png"}
                alt={alt}
                shadow-intensity="1"
                camera-controls
                auto-rotate
                ar
                className="w-full h-full"
                style={{ width: '100%', height: '100%', minHeight: '300px' }}
                onLoad={() => {
                    console.log("✅ 3D Model loaded successfully:", src);
                    setIsLoading(false);
                }}
                onError={(e: any) => {
                    console.error("❌ 3D Model failed to load:", src, e);
                    setIsLoading(false);
                }}
            >
                <div slot="progress-bar"></div>
            </model-viewer>
        </div>
    );
}
