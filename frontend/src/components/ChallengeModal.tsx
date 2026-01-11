import { useState, useEffect } from "react";
import { X, Timer, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChallengeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ChallengeModal = ({ isOpen, onClose }: ChallengeModalProps) => {
    const [duration, setDuration] = useState("");
    const [isActive, setIsActive] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [showComparison, setShowComparison] = useState(false);

    // Peer forest data
    const peerForests = [
        {
            id: 1,
            image: "/brain/peer_forest_1_1768086755582.png",
            label: "Focused Mind #1",
            trees: 24
        },
        {
            id: 2,
            image: "/brain/peer_forest_2_1768086787669.png",
            label: "Focused Mind #2",
            trees: 31
        },
        {
            id: 3,
            image: "/brain/peer_forest_3_1768086811002.png",
            label: "Focused Mind #3",
            trees: 18
        },
        {
            id: 4,
            image: "/brain/peer_forest_4_1768086841464.png",
            label: "Focused Mind #4",
            trees: 27
        }
    ];

    useEffect(() => {
        if (!isActive || timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    setIsActive(false);
                    handleComplete();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isActive, timeLeft]);

    const handleStart = () => {
        const minutes = parseInt(duration);
        if (isNaN(minutes) || minutes < 5 || minutes > 120) {
            alert("Please enter a duration between 5 and 120 minutes");
            return;
        }
        setTimeLeft(minutes * 60);
        setIsActive(true);
        setShowComparison(false);
    };

    const handleGiveUp = () => {
        setIsActive(false);
        setShowComparison(true);
    };

    const handleComplete = () => {
        // Show success message
        alert("🎉 Challenge Complete! You locked in!");
        onClose();
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
                onClick={!isActive ? onClose : undefined}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl border border-border shadow-2xl max-w-3xl w-full">
                    {/* Header */}
                    <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-border p-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-500/10 flex items-center justify-center">
                                <Flame className="w-6 h-6 text-orange-500" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-foreground">Focus Challenge</h2>
                                <p className="text-sm text-muted-foreground">Lock in and build your forest</p>
                            </div>
                        </div>
                        {!isActive && (
                            <Button variant="ghost" size="icon" onClick={onClose}>
                                <X className="w-5 h-5" />
                            </Button>
                        )}
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {!isActive && !showComparison && (
                            <div className="space-y-6">
                                <div className="text-center space-y-4">
                                    <p className="text-muted-foreground">
                                        Commit to a focused session. No distractions, no excuses.
                                    </p>
                                    <div className="max-w-sm mx-auto space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">
                                                Duration (minutes)
                                            </label>
                                            <Input
                                                type="number"
                                                min="5"
                                                max="120"
                                                placeholder="25"
                                                value={duration}
                                                onChange={(e) => setDuration(e.target.value)}
                                                className="text-center text-lg"
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">5-120 minutes</p>
                                        </div>
                                        <Button
                                            variant="hero"
                                            size="lg"
                                            className="w-full"
                                            onClick={handleStart}
                                        >
                                            <Timer className="w-5 h-5 mr-2" />
                                            Start Challenge
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isActive && (
                            <div className="space-y-8">
                                {/* Timer Display */}
                                <div className="text-center space-y-4">
                                    <div className="text-7xl font-bold text-foreground tabular-nums">
                                        {formatTime(timeLeft)}
                                    </div>
                                    <div className="w-full bg-border rounded-full h-3 overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-1000"
                                            style={{
                                                width: `${((parseInt(duration) * 60 - timeLeft) / (parseInt(duration) * 60)) * 100}%`
                                            }}
                                        />
                                    </div>
                                    <p className="text-muted-foreground">Stay focused. You got this! 💪</p>
                                </div>

                                {/* Give Up Button */}
                                <div className="text-center">
                                    <Button
                                        variant="outline"
                                        onClick={handleGiveUp}
                                        className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                                    >
                                        Give Up
                                    </Button>
                                </div>
                            </div>
                        )}

                        {showComparison && (
                            <div className="space-y-4">
                                <div className="text-center space-y-2">
                                    <h3 className="text-2xl font-bold text-red-500">⚠️ You Gave Up</h3>
                                    <p className="text-muted-foreground">
                                        Look at what others are achieving while you gave up...
                                    </p>
                                </div>

                                {/* Forest Comparison - Single Composite Image */}
                                <div className="flex justify-center items-center py-4">
                                    <div className="relative animate-in fade-in zoom-in duration-700">
                                        <img
                                            src="/brain/forest_comparison_labeled_1768087899747.png"
                                            alt="Forest comparison showing your sparse forest vs thriving peer forests"
                                            className="w-full max-w-2xl h-auto"
                                        />
                                    </div>
                                </div>

                                {/* Shame Message */}
                                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center space-y-2">
                                    <p className="text-lg font-semibold text-red-500">
                                        You're falling behind...
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        While you gave up, others kept building. Their forests are thriving with an average of 25 trees.
                                    </p>
                                    <p className="text-sm font-medium text-red-500">
                                        Your forest: Only 3 trees
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3">
                                    <Button
                                        variant="hero"
                                        size="lg"
                                        className="flex-1"
                                        onClick={() => {
                                            setShowComparison(false);
                                            setDuration("");
                                        }}
                                    >
                                        <Flame className="w-5 h-5 mr-2" />
                                        Try Again
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        onClick={onClose}
                                    >
                                        Back to Dashboard
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};
