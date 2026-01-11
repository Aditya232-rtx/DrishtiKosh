import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { auth } from "../lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import Logo from "@/components/Logo";
import {
    ArrowLeft,
    MessageSquare,
    Send,
    Layers,
    Box,
} from "lucide-react";
import InteractiveAvatar from "@/components/InteractiveAvatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ScrollList from "@/components/ui/ScrollList";
import MermaidDiagram from "@/components/ui/MermaidDiagram";
import { LoaderFive } from "@/components/ui/loader";
import { ToggleTheme } from "@/components/ui/ToggleTheme";
import { mapAcousticToCSS, AudioMetrics } from "@/utils/acousticMapping";

// TypeScript declarations for YouTube IFrame API
declare global {
    interface Window {
        YT: any;
        onYouTubeIframeAPIReady: () => void;
    }
}

// Helper function to extract YouTube video ID
const getYouTubeVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

// Helper function to determine if URL is a YouTube link
const isYouTubeUrl = (url: string): boolean => {
    return url.includes('youtube.com') || url.includes('youtu.be');
};

// Fallback emotional styling function
const getEmotionalStyle = (loudness: string, pitch: string, speed: string) => {
    const styles: any = {};
    switch (loudness?.toLowerCase()) {
        case 'high': styles.fontWeight = 800; break;
        case 'low': styles.fontWeight = 300; break;
        default: styles.fontWeight = 400;
    }
    switch (pitch?.toLowerCase()) {
        case 'high': styles.color = '#facc15'; break;
        case 'low': styles.color = '#9333ea'; break;
        default: styles.color = 'inherit';
    }
    switch (speed?.toLowerCase()) {
        case 'fast': styles.letterSpacing = '-0.05em'; break;
        case 'slow': styles.letterSpacing = '0.1em'; break;
        default: styles.letterSpacing = '0';
    }
    return styles;
};

// Helper function to get styling - uses acoustic metrics if available, falls back to emotional markers
const getCaptionStyle = (segment: any) => {
    // If acoustic metrics are available, use them for precise styling
    if (segment.metrics) {
        return mapAcousticToCSS(segment.metrics as AudioMetrics);
    }

    // Fallback to simple emotional styling if no metrics
    return getEmotionalStyle(segment.loudness, segment.pitch, segment.speed);
};

const DeafVideoMode = () => {
    const [searchParams] = useSearchParams();
    const userId = auth.getUserId();

    const [progress, setProgress] = useState(0);
    const [doubtInput, setDoubtInput] = useState("");
    const [currentTime, setCurrentTime] = useState(0);
    const contentRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const youtubePlayerRef = useRef<any>(null);
    const timeUpdateIntervalRef = useRef<any>(null);

    // Quiz State
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});

    // Dynamic Content State
    const [videoUrl, setVideoUrl] = useState("");
    const [transcript, setTranscript] = useState<any[]>([]);
    const [quizQuestions, setQuizQuestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [captionsReady, setCaptionsReady] = useState(false);

    // Visual States
    const [flashcards, setFlashcards] = useState([]);
    const [flowchart, setFlowchart] = useState("");

    useEffect(() => {
        const urlParam = searchParams.get("url");

        if (urlParam) {
            setVideoUrl(urlParam);
            handleLoadVideoContent(urlParam);
        }
    }, [searchParams]);

    // Video time tracking for caption synchronization
    useEffect(() => {
        // Load YouTube IFrame API if needed
        if (isYouTubeUrl(videoUrl) && !window.YT) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        }

        // For direct video elements
        const video = videoRef.current;
        if (video && !isYouTubeUrl(videoUrl)) {
            const handleTimeUpdate = () => {
                setCurrentTime(video.currentTime);
            };
            video.addEventListener('timeupdate', handleTimeUpdate);
            return () => video.removeEventListener('timeupdate', handleTimeUpdate);
        }

        // For YouTube videos - setup player when API is ready
        if (isYouTubeUrl(videoUrl) && captionsReady) {
            const initYouTubePlayer = () => {
                if (!window.YT || !window.YT.Player) {
                    setTimeout(initYouTubePlayer, 100);
                    return;
                }

                const videoId = getYouTubeVideoId(videoUrl);
                if (!videoId) return;

                // Create player instance
                youtubePlayerRef.current = new window.YT.Player(iframeRef.current, {
                    events: {
                        onReady: (event: any) => {
                            // Start polling for current time
                            timeUpdateIntervalRef.current = setInterval(() => {
                                if (youtubePlayerRef.current && youtubePlayerRef.current.getCurrentTime) {
                                    const time = youtubePlayerRef.current.getCurrentTime();
                                    setCurrentTime(time);
                                }
                            }, 100); // Update every 100ms for smooth caption transitions
                        },
                        onStateChange: (event: any) => {
                            // Clear interval when video is paused or ended
                            if (event.data === window.YT.PlayerState.PAUSED ||
                                event.data === window.YT.PlayerState.ENDED) {
                                if (timeUpdateIntervalRef.current) {
                                    clearInterval(timeUpdateIntervalRef.current);
                                }
                            }
                        }
                    }
                });
            };

            initYouTubePlayer();

            return () => {
                if (timeUpdateIntervalRef.current) {
                    clearInterval(timeUpdateIntervalRef.current);
                }
                if (youtubePlayerRef.current) {
                    youtubePlayerRef.current.destroy();
                }
            };
        }
    }, [videoUrl, captionsReady]);

    const handleLoadVideoContent = async (url: string) => {
        setIsLoading(true);
        setCaptionsReady(false);
        try {
            const response = await api.post("/api/learn/analyze_video_emotional", {
                url: url,
                user_id: userId
            });

            if (response.data) {
                setTranscript(response.data.transcript || []);
                setFlashcards(response.data.flashcards || []);
                setFlowchart(response.data.flowchart || "");
                setQuizQuestions(response.data.quiz || []);
                // Mark captions as ready after successful load
                setCaptionsReady(true);
            }
        } catch (error) {
            console.error("Failed to load video content:", error);
            // Fallback mock data for development
            setTranscript([
                { text: "HELLO EVERYONE!", loudness: "high", pitch: "normal", speed: "normal" },
                { text: "Today we are looking at", loudness: "normal", pitch: "normal", speed: "fast" },
                { text: "something very mysterious...", loudness: "low", pitch: "low", speed: "slow" }
            ]);
            setCaptionsReady(true); // Allow playback even with fallback
        } finally {
            setIsLoading(false);
        }
    };

    const handleAskDoubt = async () => {
        if (!doubtInput.trim()) return;
        console.log("Asking doubt:", doubtInput);
        setDoubtInput("");
    };

    const handleQuizOptionClick = (qIndex: number, oIndex: number) => {
        if (userAnswers[qIndex] !== undefined) return;
        setUserAnswers(prev => ({ ...prev, [qIndex]: oIndex }));
    };

    const cleanMermaidString = (str: string) => {
        return str.replace(/```mermaid\n?/g, "").replace(/```\n?/g, "").trim();
    };

    // Progress Calc
    useEffect(() => {
        if (quizQuestions.length === 0) return;
        let correct = 0;
        Object.entries(userAnswers).forEach(([qIdx, oIdx]) => {
            if (quizQuestions[parseInt(qIdx)].correct === oIdx) correct++;
        });
        setProgress(Math.round((correct / quizQuestions.length) * 100));
    }, [userAnswers, quizQuestions]);

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-300">
            {/* Header */}
            <header className="bg-white/95 dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-800 p-4 sticky top-0 z-50 backdrop-blur-sm transition-colors duration-300">
                <div className="container mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link to="/deaf-dashboard" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <Logo />
                        <span className="text-xs font-bold px-2 py-1 bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full">Deaf Video Mode</span>
                    </div>

                    <div className="flex items-center gap-3 w-full max-w-2xl">
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <Progress value={progress} className="flex-1 h-2.5 bg-gray-200 dark:bg-gray-700" />
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[3rem] text-right">{progress}%</span>
                            </div>
                        </div>
                        <ToggleTheme />
                    </div>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-200/20 via-white to-white dark:from-indigo-500/10 dark:via-gray-950 dark:to-gray-950 -z-10 transition-colors duration-300" />

                <div className="flex-1 p-6 h-full overflow-y-auto custom-scrollbar" ref={contentRef}>
                    <div className="max-w-[1600px] mx-auto flex flex-col gap-6">

                        {/* ROW 1: Video Player + Emotional Captions */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[400px]">
                            {/* Video Player (Col Span 5) */}
                            <div className="lg:col-span-5 bg-gray-50 dark:bg-gray-900 rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-lg relative group h-full transition-colors duration-300">
                                {videoUrl ? (
                                    isYouTubeUrl(videoUrl) ? (
                                        <div className="w-full h-full rounded-3xl" id="youtube-player-container">
                                            <iframe
                                                ref={iframeRef}
                                                id="youtube-player"
                                                src={`https://www.youtube.com/embed/${getYouTubeVideoId(videoUrl)}?enablejsapi=1&origin=${window.location.origin}`}
                                                className="w-full h-full rounded-3xl"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            />
                                        </div>
                                    ) : (
                                        <video
                                            ref={videoRef}
                                            controls
                                            src={videoUrl}
                                            className="w-full h-full rounded-3xl object-cover"
                                        />
                                    )
                                ) : (
                                    <LoaderFive text="Loading video..." />
                                )}

                                {/* Caption Generation Blocker Overlay */}
                                {!captionsReady && videoUrl && (
                                    <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-3xl">
                                        <LoaderFive text="Analyzing video and generating emotional captions..." />
                                        <p className="mt-4 text-sm text-gray-400 max-w-md text-center px-4">
                                            Please wait while Gemini analyzes the video content and audio to create synchronized emotional captions.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Emotional Captions (Col Span 7) */}
                            <div className="lg:col-span-7 bg-gray-50 dark:bg-gray-900 rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-md flex flex-col relative h-full transition-colors duration-300">
                                <div className="flex items-center justify-between mb-2 sticky top-0 bg-gray-50 dark:bg-gray-900 z-10 pb-2 border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
                                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">Emotional Transcript</h2>
                                </div>

                                <div className="prose dark:prose-invert max-w-none flex-1 pr-2 leading-relaxed overflow-y-auto flex items-center justify-center">
                                    {isLoading ? (
                                        <LoaderFive text="Analyzing video emotions..." />
                                    ) : transcript.length > 0 ? (
                                        (() => {
                                            // Find active caption based on current video time
                                            // Assuming transcript has timestamp property
                                            const activeSegment = transcript.find((seg, idx) => {
                                                const nextSeg = transcript[idx + 1];
                                                const segTime = seg.timestamp || idx * 6; // Fallback: 6 seconds per segment
                                                const nextTime = nextSeg ? (nextSeg.timestamp || (idx + 1) * 6) : Infinity;
                                                return currentTime >= segTime && currentTime < nextTime;
                                            }) || transcript[0];

                                            return (
                                                <div className="text-center max-w-4xl">
                                                    <p
                                                        className="text-3xl font-semibold leading-relaxed transition-all duration-300 px-6 py-4 bg-black/80 dark:bg-white/10 rounded-2xl backdrop-blur-sm"
                                                        style={getCaptionStyle(activeSegment)}
                                                    >
                                                        {activeSegment.text}
                                                    </p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                                                        Caption {transcript.findIndex(s => s === activeSegment) + 1} of {transcript.length}
                                                    </p>
                                                </div>
                                            );
                                        })()
                                    ) : (
                                        <p className="text-gray-600 dark:text-gray-400">No transcript available yet.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ROW 2: Interactive Grid (3 Side-by-Side Boxes) */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 min-h-[400px]">
                            {/* Box 1: Tools (Doubt + Buttons) */}
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-3xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col gap-4 h-full overflow-hidden transition-colors duration-300">
                                <div className="flex items-center gap-2 mb-2 shrink-0">
                                    <MessageSquare className="w-5 h-5 text-purple-400" />
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">Tools & Doubts</h3>
                                </div>

                                <div className="bg-gray-100 dark:bg-gray-800/50 rounded-2xl p-2 border border-gray-300 dark:border-gray-700 flex items-center gap-2 shrink-0 transition-colors duration-300">
                                    <Input
                                        placeholder="Ask a doubt..."
                                        value={doubtInput}
                                        onChange={(e) => setDoubtInput(e.target.value)}
                                        onKeyPress={(e) => e.key === "Enter" && handleAskDoubt()}
                                        className="border-none shadow-none bg-transparent h-10 min-w-0 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                                    />
                                    <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-primary/20 shrink-0" onClick={handleAskDoubt}>
                                        <Send className="w-4 h-4 text-primary" />
                                    </Button>
                                </div>

                                <div className="flex flex-col gap-3 flex-1 justify-center min-h-0">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="w-full h-16 rounded-2xl flex items-center justify-start px-4 gap-3 border-2 border-gray-300 dark:border-gray-800 bg-purple-500/10 hover:bg-purple-500/20 hover:border-purple-500/30 transition-all group overflow-hidden">
                                                <div className="p-2 bg-purple-500/10 rounded-xl group-hover:scale-110 transition-transform shrink-0">
                                                    <Layers className="w-6 h-6 text-purple-400" />
                                                </div>
                                                <div className="text-left flex-1 min-w-0">
                                                    <span className="block font-bold text-gray-900 dark:text-gray-100 group-hover:text-purple-400 truncate">Flashcards</span>
                                                    <span className="text-xs text-gray-400 truncate block">Review concepts</span>
                                                </div>
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                                            <DialogHeader>
                                                <DialogTitle className="text-gray-900 dark:text-gray-100">Flashcards</DialogTitle>
                                            </DialogHeader>
                                            <div className="flex-1 overflow-y-auto">
                                                {flashcards.length > 0 ? (
                                                    <ScrollList
                                                        data={flashcards}
                                                        renderItem={(card, index) => {
                                                            const colorTheme = [
                                                                "bg-gradient-to-br from-indigo-600 to-indigo-800",
                                                                "bg-gradient-to-br from-purple-600 to-purple-800",
                                                                "bg-gradient-to-br from-pink-600 to-pink-800",
                                                                "bg-gradient-to-br from-blue-600 to-blue-800"
                                                            ];
                                                            const tagColor = [
                                                                "bg-indigo-500/20 text-indigo-300",
                                                                "bg-purple-500/20 text-purple-300",
                                                                "bg-pink-500/20 text-pink-300",
                                                                "bg-blue-500/20 text-blue-300"
                                                            ];

                                                            return (
                                                                <div className="perspective-1000 h-64 cursor-pointer group">
                                                                    <div className="relative w-full h-full transition-transform duration-700 transform-style-preserve-3d group-hover:rotate-y-180">
                                                                        {/* FRONT */}
                                                                        <div className={`absolute inset-0 backface-hidden flex flex-col justify-center items-center ${colorTheme[index % colorTheme.length]} text-white rounded-2xl p-8 shadow-lg border-b-4 border-white/20`}>
                                                                            <div className="absolute top-4 left-4 p-2 bg-white/10 rounded-lg">
                                                                                <Layers className="w-5 h-5" />
                                                                            </div>
                                                                            <div className={`absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded-full ${tagColor[index % tagColor.length]}`}>
                                                                                #{index + 1}
                                                                            </div>
                                                                            <p className="text-2xl font-bold text-center leading-tight">{card.front}</p>
                                                                        </div>

                                                                        {/* BACK */}
                                                                        <div className="absolute inset-0 backface-hidden rotate-y-180 flex flex-col justify-center items-center bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl p-8 shadow-md border-b-4 border-gray-300 dark:border-gray-700 transition-colors duration-300">
                                                                            <div className="absolute top-4 left-4 p-2 bg-indigo-500/10 rounded-lg">
                                                                                <Layers className="w-5 h-5 text-indigo-400" />
                                                                            </div>
                                                                            <p className="font-medium text-lg text-center leading-relaxed">{card.back}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }}
                                                    />
                                                ) : (
                                                    <LoaderFive text="Generating flashcards..." />
                                                )}
                                            </div>
                                        </DialogContent>
                                    </Dialog>

                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="w-full h-16 rounded-2xl flex items-center justify-start px-4 gap-3 border-2 border-gray-300 dark:border-gray-800 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-500/30 transition-all group overflow-hidden">
                                                <div className="p-2 bg-blue-500/10 rounded-xl group-hover:scale-110 transition-transform shrink-0">
                                                    <Box className="w-6 h-6 text-blue-400" />
                                                </div>
                                                <div className="text-left flex-1 min-w-0">
                                                    <span className="block font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-400 truncate">Flowchart</span>
                                                    <span className="text-xs text-gray-400 truncate block">Visualize logic</span>
                                                </div>
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                                            <DialogHeader>
                                                <DialogTitle className="text-gray-900 dark:text-gray-100">Knowledge Flowchart</DialogTitle>
                                            </DialogHeader>
                                            <div className="mt-4 min-h-[300px] flex items-center justify-center bg-gray-200 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-4 transition-colors duration-300">
                                                {flowchart ? (
                                                    <MermaidDiagram chart={cleanMermaidString(flowchart)} />
                                                ) : (
                                                    isLoading ? <LoaderFive text="Generating flowchart..." /> : <p className="text-gray-600 dark:text-gray-400">Flowchart unavailable.</p>
                                                )}
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>

                            {/* Box 2: Avatar (Center) */}
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm h-full relative min-h-[300px] flex items-center justify-center transition-colors duration-300">
                                <InteractiveAvatar />
                            </div>

                            {/* Box 3: Quiz (Right) */}
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-3xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-center h-full overflow-hidden relative transition-colors duration-300">
                                {(() => {
                                    const q = quizQuestions[activeQuestionIndex];
                                    if (!q) return <LoaderFive text="Generating quiz..." />;

                                    const isAnswered = userAnswers[activeQuestionIndex] !== undefined;

                                    return (
                                        <div className="space-y-4 flex flex-col h-full">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-green-500/10 rounded-lg">
                                                    <MessageSquare className="w-4 h-4 text-green-600" />
                                                </div>
                                                <span className="font-bold text-green-600 uppercase tracking-wide text-sm">Knowledge Check</span>
                                            </div>

                                            <div className="flex-1 flex flex-col justify-center">
                                                <p className="text-lg font-medium leading-relaxed">{q.question}</p>
                                            </div>

                                            {!isAnswered ? (
                                                <div className="grid grid-cols-1 gap-3">
                                                    {q.options.map((opt, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => handleQuizOptionClick(activeQuestionIndex, idx)}
                                                            className="w-full text-sm p-4 rounded-xl bg-gray-200 dark:bg-gray-700/50 hover:bg-gray-300 dark:hover:bg-gray-700 text-left border border-gray-300 dark:border-transparent hover:border-indigo-400 dark:hover:border-primary/20 transition-all font-medium text-gray-900 dark:text-gray-100"
                                                        >
                                                            {opt}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className={`p-4 rounded-xl border ${userAnswers[activeQuestionIndex] === q.correct ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                                    <div className="mb-3">
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase mb-2 inline-block ${userAnswers[activeQuestionIndex] === q.correct ? 'bg-green-500/20 text-green-700' : 'bg-red-500/20 text-red-700'}`}>
                                                            {userAnswers[activeQuestionIndex] === q.correct ? "Correct" : "Incorrect"}
                                                        </span>
                                                        <p className={`text-sm leading-relaxed ${userAnswers[activeQuestionIndex] === q.correct ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                                                            {q.explanation}
                                                        </p>
                                                    </div>

                                                    {/* Show visual feedback on options */}
                                                    <div className="grid grid-cols-1 gap-2 mb-4 opacity-80 pointer-events-none">
                                                        {q.options.map((opt, idx) => {
                                                            let btnDetails = "bg-gray-200 dark:bg-gray-700/30 border-gray-300 dark:border-transparent text-gray-600 dark:text-gray-400";
                                                            let icon = null;

                                                            if (idx === q.correct) {
                                                                btnDetails = "bg-green-100 dark:bg-green-500/10 border-green-400 dark:border-green-500/50 text-green-700 dark:text-green-600 font-bold";
                                                                icon = "✅";
                                                            } else if (idx === userAnswers[activeQuestionIndex]) {
                                                                btnDetails = "bg-red-100 dark:bg-red-500/10 border-red-400 dark:border-red-500/50 text-red-700 dark:text-red-600 font-bold";
                                                                icon = "❌";
                                                            }

                                                            return (
                                                                <div key={idx} className={`text-xs p-2 rounded-lg border flex justify-between items-center ${btnDetails}`}>
                                                                    <span>{opt}</span>
                                                                    <span>{icon}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setActiveQuestionIndex((prev) => Math.min(prev + 1, quizQuestions.length - 1))}
                                                        disabled={activeQuestionIndex >= quizQuestions.length - 1}
                                                        className="w-full"
                                                    >
                                                        Next Question
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DeafVideoMode;
