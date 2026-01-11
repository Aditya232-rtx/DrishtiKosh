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
    ChevronLeft,
    ChevronRight,
    MessageSquare,
    Upload,
    Send,
    Image as ImageIcon,
    Layers,
    Box,
} from "lucide-react";
import BioncText from "@/components/BionicText";
import InteractiveAvatar from "@/components/InteractiveAvatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import ScrollList from "@/components/ui/ScrollList";
import MermaidDiagram from "@/components/ui/MermaidDiagram";
import ModelViewer from "@/components/ui/ModelViewer";
import { LoaderFive } from "@/components/ui/loader";
import { CanvasConfettiCursor } from "@/components/ui/confetti";
import { ToggleTheme } from "@/components/ui/ToggleTheme";

// 1. Install Dependencies: npm install @fal-ai/serverless-client
import * as fal from "@fal-ai/serverless-client";

// Configure Fal with the provided key (Note: Move to .env in production)
fal.config({
    credentials: "d1423be2-ebfd-4a20-ae52-1eed6de63f38:382daac48d43b8030d93404fd4d3fed4",
});

const DeafLearnMode = () => {
    const [searchParams] = useSearchParams();
    const userId = auth.getUserId();
    const mode = "deaf"; // Hardcoded for this page

    const [progress, setProgress] = useState(0);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [doubtInput, setDoubtInput] = useState("");
    const contentRef = useRef<HTMLDivElement>(null);

    // Quiz State
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});

    // Dynamic Content State
    const [topic, setTopic] = useState("");
    const [slides, setSlides] = useState([
        { title: "Welcome", content: "Loading your visual learning experience...", hasVideo: false }
    ]);
    const [quizQuestions, setQuizQuestions] = useState([]);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [imagePrompt, setImagePrompt] = useState<string>(""); // Store the prompt used for the image
    const [isLoading, setIsLoading] = useState(false);

    // New Visual States
    const [flashcards, setFlashcards] = useState([]);
    const [flowchart, setFlowchart] = useState("");
    const [showConfetti, setShowConfetti] = useState(false);

    // THE DEBUGGING PIPELINE STATES
    // HARDCODED FOR DEBUGGING
    const [modelUrl, setModelUrl] = useState<string | null>(null);
    const [isGenerating3D, setIsGenerating3D] = useState(false);

    useEffect(() => {
        const topicParam = searchParams.get("topic");
        const instructionParam = searchParams.get("instruction");

        if (topicParam) {
            setTopic(topicParam);
            handleLoadContent(topicParam, instructionParam);
        }
    }, [searchParams]);

    // THE DEBUGGING PIPELINE
    useEffect(() => {
        // 3D Generation Temporarily Disabled to save credits
        const generate3D = async () => {
            if (!generatedImage) return;

            // CHECKPOINT 1: Verify Gemini Image Location
            // Note: generatedImage is the raw base64 string from the backend.
            console.log("📍 [STEP 1] Gemini Image URL stored in state:", generatedImage.substring(0, 50) + "...");

            // Construct Data URI if needed, or if Fal accepts raw base64, usually needs header.
            // Fal usually accepts public URL or Data URI.
            const geminiImageUrl = `data:image/png;base64,${generatedImage}`;

            try {
                setIsGenerating3D(true);

                const logToBackend = async (message: string, level: "info" | "error" = "info") => {
                    try {
                        console.log(message); // Keep local log
                        await api.post("/api/learn/log", { message, level });
                    } catch (e) { /* ignore log errors */ }
                };

                // CHECKPOINT 2: Verify API Call Initiation
                await logToBackend("🚀 [STEP 2] Sending Image to Fal.ai (TripoSR)...");

                // ENABLED
                const result: any = await fal.subscribe("fal-ai/triposr", {
                    input: {
                        image_url: geminiImageUrl
                    },
                    logs: true,
                    onQueueUpdate: (update) => {
                        if (update.status === "IN_PROGRESS") {
                            logToBackend(`⏳ [Fal.ai] Status: ${update.status}`);
                            update.logs.map((log) => log.message).forEach(msg => logToBackend(`  > ${msg}`));
                        }
                    },
                });
                // await logToBackend("⚠️ 3D Generation DISABLED to save credits.");
                // const result: any = null; // Placeholder to avoid reference errors below

                // CHECKPOINT 3: Verify 3D Model Generation
                // Accessing property safely
                if (result && result.model_mesh && result.model_mesh.url) {
                    const remoteUrl = result.model_mesh.url;
                    await logToBackend(`✅ [STEP 3] Fal.ai Generated 3D Model URL: ${remoteUrl}`);

                    // CHECKPOINT 4: Save Model Locally
                    await logToBackend(`⬇️ [STEP 4] Saving model locally...`);
                    try {
                        const saveRes = await api.post("/api/learn/save_3d_model", { model_url: remoteUrl });
                        if (saveRes.data && saveRes.data.local_url) {
                            const localUrl = saveRes.data.local_url;
                            await logToBackend(`💾 [STEP 4] Model Saved Locally: ${localUrl}`);
                            setModelUrl(localUrl);
                        } else {
                            // Fallback to remote URL if save fails
                            await logToBackend(`⚠️ [STEP 4] Save failed (no url), using remote URL`);
                            setModelUrl(remoteUrl);
                        }
                    } catch (saveError) {
                        console.error("Failed to save model locally", saveError);
                        await logToBackend(`⚠️ [STEP 4] Save API Error, using remote URL: ${saveError}`);
                        setModelUrl(remoteUrl);
                    }

                } else {
                    await logToBackend(`❌ [STEP 3] Fal.ai response missing 'model_mesh.url': ${JSON.stringify(result)}`, "error");
                }

            } catch (error: any) {
                console.error("❌ [Fal.ai Error]:", JSON.stringify(error, null, 2));

                let errorMsg = `❌ [Fal.ai Error]: ${error.message || error}`;
                if (error.body) {
                    errorMsg += ` | Body: ${JSON.stringify(error.body)}`;
                }

                // Try logging error to backend too
                try {
                    await api.post("/api/learn/log", { message: errorMsg, level: "error" });
                } catch (e) { }
            } finally {
                setIsGenerating3D(false);
            }
        };

        generate3D();

        generate3D();
    }, [generatedImage]);

    const handleLoadContent = async (value: string, instruction: string | null = null) => {
        setIsLoading(true);
        // Reset States
        setActiveQuestionIndex(0);
        setUserAnswers({});
        setProgress(0);
        setCurrentSlide(0);
        setFlashcards([]);
        setFlowchart("");
        setModelUrl(null); // Reset 3D model
        setGeneratedImage(null); // Reset image to trigger pipeline again
        setImagePrompt(""); // Reset prompt

        try {
            // 1. Get Explanation (Slides + Quiz + Image)
            const res = await api.post("/api/learn/explain", { topic: value, mode, instruction, user_id: userId || "guest" });
            setSlides(res.data.slides);
            setQuizQuestions(res.data.quiz);
            // Image arrival will trigger the 3D model effect (ENABLED)
            if (res.data.image) setGeneratedImage(res.data.image);
            if (res.data.image_prompt) setImagePrompt(res.data.image_prompt);

            // 2. Load Visual Deep Dives (Flashcards & Flowchart)
            loadVisualAssets(value);

        } catch (e) {
            console.error("Failed to load content", e);
            setSlides([{ title: "Error", content: "Failed to generate lesson.", hasVideo: false }]);
        } finally {
            setIsLoading(false);
        }
    };

    const loadVisualAssets = async (topicValue: string) => {
        // Flashcards
        api.post("/api/learn/flashcards", { topic: topicValue, user_id: userId || "guest" })
            .then(res => setFlashcards(res.data))
            .catch(e => console.error("Flashcard error", e));

        // Flowchart
        api.post("/api/learn/flowchart", { topic: topicValue })
            .then(res => {
                console.log("📊 Flowchart API Response:", res.data);
                setFlowchart(res.data.chart);
            })
            .catch(e => console.error("Flowchart error", e));
    };

    // Issue 2: Mermaid Helper (Improved)
    // Issue 2: Mermaid Helper (Improved & Sanitized)
    const cleanMermaidString = (str: string) => {
        if (!str) return "";
        let cleaned = str.replace(/```mermaid/g, '').replace(/```/g, '').trim();

        // 1. Find start of graph definition
        const match = cleaned.match(/(graph|flowchart)\s+[a-zA-Z0-9]+/i);
        if (match && match.index !== undefined) {
            cleaned = cleaned.substring(match.index);
        } else if (!cleaned.toLowerCase().startsWith('graph') && !cleaned.toLowerCase().startsWith('flowchart')) {
            cleaned = `graph TD\n${cleaned}`;
        }

        // 2. Sanitize Node Labels: Force quotes for text inside []
        // Finds [text] where text does NOT start with "
        // Replaces with ["text"]
        // This fixes G[... Fangio (1956) ...] -> G["... Fangio (1956) ..."]
        cleaned = cleaned.replace(/\[(?!"`)([^\]]+)(?<!"`)(?!['"])\]/g, (match, p1) => {
            // Avoid double quoting if it looks like it's already quoted but regex missed it complexly
            if (p1.trim().startsWith('"') && p1.trim().endsWith('"')) return match;
            return `["${p1}"]`;
        });

        // Fix for specific case of ']' inside the text breaking the regex
        // If the AI output uses escaped brackets, this simple regex might fail, but for standard text it works.

        return cleaned;
    };

    const handleAskDoubt = () => {
        if (!doubtInput.trim()) return;
        setTopic(doubtInput);
        handleLoadContent(doubtInput);
        setDoubtInput("");
    };

    const handleNextQuestion = () => {
        if (activeQuestionIndex < quizQuestions.length - 1) setActiveQuestionIndex(prev => prev + 1);
    };

    const handleQuizOptionClick = (qIndex: number, oIndex: number) => {
        if (userAnswers[qIndex] !== undefined) return;
        setUserAnswers(prev => ({ ...prev, [qIndex]: oIndex }));
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

    // Trigger confetti when progress reaches 100%
    useEffect(() => {
        if (progress === 100 && quizQuestions.length > 0) {
            console.log("🎉 Confetti triggered! Progress:", progress);
            setShowConfetti(true);
            // Auto-hide confetti after 5 seconds
            const timer = setTimeout(() => {
                console.log("🎉 Confetti hidden");
                setShowConfetti(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [progress, quizQuestions.length]);


    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-300">
            {/* Confetti Celebration */}
            <CanvasConfettiCursor
                enabled={showConfetti}
                colors={["#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#3b82f6"]}
                particleCount={50}
                frequency={30}
                style={{ zIndex: 9999 }}
            />
            {/* Header */}
            <header className="bg-white/95 dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-800 p-4 sticky top-0 z-50 backdrop-blur-sm transition-colors duration-300">
                <div className="container mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link to="/dashboard" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <Logo />
                        <span className="text-xs font-bold px-2 py-1 bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full">Deaf Learn Mode</span>
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

                        {/* ROW 1: Content Anchors (Image + Text) - "Don't touch position/size" */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[400px]">
                            {/* Generated Image (Col Span 5) */}
                            <div className="lg:col-span-5 bg-gray-50 dark:bg-gray-900 rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-lg relative group h-full transition-colors duration-300">
                                {generatedImage ? (
                                    <img src={`data:image/png;base64,${generatedImage}`} alt="Visual" className="w-full h-full object-cover" />
                                ) : (
                                    <LoaderFive text="Generating image..." />
                                )}
                            </div>

                            {/* Slides & Explanation (Col Span 7) */}
                            <div className="lg:col-span-7 bg-gray-50 dark:bg-gray-900 rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-md flex flex-col relative h-full transition-colors duration-300">
                                <div className="flex items-center justify-between mb-2 sticky top-0 bg-gray-50 dark:bg-gray-900 z-10 pb-2 border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
                                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">{slides[currentSlide].title}</h2>
                                    <span className="text-xs bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded-md font-mono text-gray-700 dark:text-gray-300">{currentSlide + 1}/{slides.length}</span>
                                </div>

                                <div className="prose dark:prose-invert max-w-none flex-1 pr-2 leading-relaxed">
                                    {isLoading || slides.length === 0 ? (
                                        <LoaderFive text="Generating explanation..." />
                                    ) : (
                                        <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-lg">{slides[currentSlide].content}</p>
                                    )}
                                </div>

                                <div className="flex justify-between mt-4 pt-2 border-t border-gray-200 dark:border-gray-800">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                                        disabled={currentSlide === 0}
                                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="w-4 h-4 mr-1" /> Back
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
                                        disabled={currentSlide === slides.length - 1}
                                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
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
                                                <div className="text-left min-w-0 flex-1">
                                                    <span className="block font-bold text-gray-900 dark:text-gray-100 group-hover:text-purple-400 truncate">Flashcards</span>
                                                    <span className="text-xs text-gray-400 truncate block">Review concepts</span>
                                                </div>
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-4xl w-full">
                                            <DialogHeader>
                                                <DialogTitle>Topic Flashcards</DialogTitle>
                                            </DialogHeader>
                                            <div className="mt-4">
                                                {flashcards.length > 0 ? (
                                                    <ScrollList
                                                        data={flashcards}
                                                        itemHeight={180}
                                                        renderItem={(item: any, index) => {
                                                            // Dark theme color palette
                                                            const colorTheme = [
                                                                "bg-gradient-to-br from-indigo-600 to-indigo-800 text-white", // Indigo
                                                                "bg-gradient-to-br from-purple-600 to-purple-800 text-white", // Purple
                                                                "bg-gradient-to-br from-blue-600 to-blue-800 text-white", // Blue
                                                                "bg-gradient-to-br from-violet-600 to-violet-800 text-white", // Violet
                                                                "bg-gradient-to-br from-fuchsia-600 to-fuchsia-800 text-white", // Fuchsia
                                                            ][index % 5];

                                                            const tagColor = [
                                                                "bg-white/20 text-white",
                                                                "bg-white/20 text-white",
                                                                "bg-white/20 text-white",
                                                                "bg-white/20 text-white",
                                                                "bg-white/20 text-white",
                                                            ][index % 5];

                                                            return (
                                                                <div className="w-full max-w-3xl mx-auto h-[160px] group perspective-1000 cursor-pointer mb-6">
                                                                    <div className="relative w-full h-full duration-700 preserve-3d group-hover:rotate-y-180 transition-transform ease-in-out shadow-xl rounded-2xl">
                                                                        {/* FRONT */}
                                                                        <div className={`absolute inset-0 backface-hidden flex flex-col justify-between ${colorTheme} rounded-2xl p-6 shadow-md border-b-4 border-black/20`}>
                                                                            <div>
                                                                                <div className="flex justify-between items-start">
                                                                                    <h3 className="font-bold text-2xl tracking-wide drop-shadow-sm">{item.front}</h3>
                                                                                    <span className="opacity-60 font-mono text-xs bg-black/10 px-2 py-1 rounded">Q{index + 1}</span>
                                                                                </div>
                                                                                <p className="mt-2 text-white/90 text-sm font-medium line-clamp-2 pr-8 opacity-80">
                                                                                    Click to reveal the answer...
                                                                                </p>
                                                                            </div>

                                                                            <div className="flex gap-2 mt-auto">
                                                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${tagColor}`}>Flashcard</span>
                                                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${tagColor}`}>Learn</span>
                                                                            </div>
                                                                        </div>

                                                                        {/* BACK */}
                                                                        <div className="absolute inset-0 backface-hidden rotate-y-180 flex flex-col justify-center items-center bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl p-8 shadow-md border-b-4 border-gray-300 dark:border-gray-700 transition-colors duration-300">
                                                                            <div className="absolute top-4 left-4 p-2 bg-indigo-500/10 rounded-lg">
                                                                                <Layers className="w-5 h-5 text-indigo-400" />
                                                                            </div>
                                                                            <p className="font-medium text-lg text-center leading-relaxed">{item.back}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="h-32 flex items-center justify-center">
                                                        {isLoading ? <LoaderFive text="Generating flashcards..." /> : <p className="text-muted-foreground">No flashcards generated yet.</p>}
                                                    </div>
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
                                                <div className="text-left min-w-0 flex-1">
                                                    <span className="block font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-400 truncate">Flowchart</span>
                                                    <span className="text-xs text-gray-400 truncate block">Visualize logic</span>
                                                </div>
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-4xl w-full">
                                            <DialogHeader>
                                                <DialogTitle>Knowledge Flowchart</DialogTitle>
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

                                                    <Button variant="ghost" className="w-full hover:bg-black/5" onClick={handleNextQuestion} disabled={activeQuestionIndex === quizQuestions.length - 1}>
                                                        Next Question <ChevronRight className="w-4 h-4 ml-1" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* ROW 3: 3D Model (Full Width Bottom) */}
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm min-h-[500px] flex flex-col transition-colors duration-300">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                                    <Box className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl text-gray-900 dark:text-gray-100">3D Concept Model</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Interactive 3D visualization of the generated topic.</p>
                                </div>
                            </div>
                            <div className="flex-1 bg-gray-200 dark:bg-gray-800/30 rounded-2xl overflow-hidden relative border border-gray-300 dark:border-gray-700 transition-colors duration-300">
                                {isGenerating3D ? (
                                    <LoaderFive text="Generating 3D model..." />
                                ) : modelUrl ? (
                                    <ModelViewer
                                        src={modelUrl}
                                        alt="3D Model"
                                    />
                                ) : (
                                    <LoaderFive text="Waiting for 3D model..." />
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
};

export default DeafLearnMode;
