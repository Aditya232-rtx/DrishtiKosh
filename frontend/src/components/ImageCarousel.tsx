import React, { useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { Button } from "./ui/button";

interface ImageCarouselProps {
    images: string[];
    generatedVideo: string | null;
    isPollingVideo: boolean;
    showVideo: boolean;
    setShowVideo: (show: boolean) => void;
}

const ImageCarousel = ({ images, generatedVideo, isPollingVideo, showVideo, setShowVideo }: ImageCarouselProps) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleNext = () => {
        if (currentIndex < images.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    if (showVideo && generatedVideo) {
        return (
            <div className="aspect-video bg-black rounded-3xl overflow-hidden shadow-lg relative animate-in fade-in zoom-in-95 duration-300">
                <video
                    controls
                    autoPlay
                    className="w-full h-full object-contain bg-black"
                    src={`data:video/mp4;base64,${generatedVideo}`}
                >
                    Your browser doesn't support video playback.
                </video>
                <button
                    onClick={() => setShowVideo(false)}
                    className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    ← Back to Visuals
                </button>
            </div>
        )
    }

    if (!images || images.length === 0) {
        return (
            <div className="bg-card/50 backdrop-blur-sm rounded-3xl overflow-hidden border border-border/50 shadow-xl shadow-primary/5 flex-shrink-0 relative group aspect-video">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 flex flex-col items-center justify-center p-8 overflow-hidden relative">
                    <div className="flex flex-col items-center text-center animate-pulse">
                        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                            <ImageIcon className="w-10 h-10 text-primary" />
                        </div>
                        <p className="text-lg font-semibold text-foreground">Generating 4+ Visuals...</p>
                        <p className="text-sm text-muted-foreground mt-1">Our AI is painting a picture for you</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-card/50 backdrop-blur-sm rounded-3xl overflow-hidden border border-border/50 shadow-xl shadow-primary/5 flex-shrink-0 relative group aspect-video">
            <div className="absolute inset-0 bg-black/5 flex items-center justify-center overflow-hidden relative">
                <img
                    src={`data:image/png;base64,${images[currentIndex]}`}
                    alt={`AI Visual ${currentIndex + 1}`}
                    className="w-full h-full object-cover transition-transform hover:scale-105 duration-1000"
                />

                {/* Navigation Overlay */}
                <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        variant="secondary"
                        size="icon"
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className="bg-black/50 hover:bg-black/70 text-white rounded-full h-10 w-10 backdrop-blur-md border-none disabled:opacity-30"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <Button
                        variant="secondary"
                        size="icon"
                        onClick={handleNext}
                        disabled={currentIndex === images.length - 1}
                        className="bg-black/50 hover:bg-black/70 text-white rounded-full h-10 w-10 backdrop-blur-md border-none disabled:opacity-30"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </Button>
                </div>

                {/* Indicators */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-2 rounded-full transition-all duration-300 shadow-sm ${idx === currentIndex ? "w-6 bg-white" : "w-2 bg-white/50"}`}
                        />
                    ))}
                </div>

                {/* Count Badge */}
                <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded-md backdrop-blur-md">
                    {currentIndex + 1} / {images.length}
                </div>
            </div>
        </div>
    );
};

export default ImageCarousel;
