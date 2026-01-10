import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { auth } from "../lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Logo from "@/components/Logo";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Music,
  MessageSquare,
  GitBranch,
  Video,
  HelpCircle,
  Send,
  Image as ImageIcon,
  Play,
  Upload,
  Book,
  X
} from "lucide-react";
import AICompanion from "@/components/AICompanion";
import BioncText from "@/components/BionicText";
import InteractiveAvatar from "@/components/InteractiveAvatar";

const LearnMode = () => {
  const [searchParams] = useSearchParams();
  const userId = auth.getUserId(); // Get user ID from auth
  const mode = searchParams.get("mode") || "adhd";

  const [progress, setProgress] = useState(0);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [showQuiz, setShowQuiz] = useState(false);
  const [doubtInput, setDoubtInput] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  // Quiz State
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  const handleNextQuestion = () => {
    if (activeQuestionIndex < quizQuestions.length - 1) {
      setActiveQuestionIndex(prev => prev + 1);
    }
  };

  // Dynamic State
  const [topic, setTopic] = useState("");
  const [slides, setSlides] = useState([
    {
      title: "Welcome",
      content: "Loading your personalized lesson...",
      hasVideo: false,
    }
  ]);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // Chat State
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'ai', content: string }>>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isChatLoading]);

  // Video Summary State
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isPollingVideo, setIsPollingVideo] = useState(false);

  const sessionIdParam = searchParams.get("sessionId");

  // Initialize from URL params or Session ID
  useEffect(() => {
    // Session ID Restoration
    if (sessionIdParam) {
      const fetchSession = async () => {
        setIsLoading(true);
        try {
          const res = await api.get(`/api/learn/session/${sessionIdParam}`);
          const data = res.data.data; // The actual content is nested in 'data'

          if (data) {
            setSlides(data.slides || []);
            setQuizQuestions(data.quiz || []);
            if (data.image) setGeneratedImage(data.image);
            if (data.video_summary) setGeneratedVideo(data.video_summary);
            setTopic(res.data.title);

            // Reset Progress Logic
            setCurrentSlide(0);
            setProgress(0);
            setActiveQuestionIndex(0);
            setUserAnswers({});
          }
        } catch (e) {
          console.error("Failed to restore session", e);
        } finally {
          setIsLoading(false);
        }
      };
      fetchSession();
      return;
    }

    // Normal Load (URL or Topic)
    const urlParam = searchParams.get("url");
    const topicParam = searchParams.get("topic");
    const instructionParam = searchParams.get("instruction");

    if (urlParam) {
      setYoutubeUrl(urlParam);
      handleLoadContent("video", urlParam, instructionParam);
    } else if (topicParam) {
      setTopic(topicParam);
      handleLoadContent("topic", topicParam, instructionParam);
    }
  }, [searchParams]);

  const handleLoadContent = async (type: "video" | "topic", value: string, instruction: string | null = null) => {
    setIsLoading(true);
    // CRITICAL: Reset Quiz and Progress State for new content
    setActiveQuestionIndex(0);
    setUserAnswers({});
    setProgress(0);
    setCurrentSlide(0);
    setQuizQuestions([]); // Clear old questions first

    try {
      let res;
      // Retrieve pending file context
      const fileUri = localStorage.getItem("pending_context_uri");
      const fileMime = localStorage.getItem("pending_context_mime");

      // Clear after using (optional, or keep until success)
      localStorage.removeItem("pending_context_uri");
      localStorage.removeItem("pending_context_mime");
      localStorage.removeItem("pending_context_name");

      // Unified API call for both Topic and Video (URL treated as topic)
      res = await api.post("/api/learn/explain", {
        topic: value,
        mode,
        instruction,
        user_id: userId || "guest",
        is_video: type === "video",
        file_uri: fileUri || undefined,
        file_mime: fileMime || undefined
      });

      if (res.data.image) setGeneratedImage(res.data.image);

      // NEW: Capture session_id and start polling for video
      if (res.data.session_id) {
        setSessionId(res.data.session_id);
        setIsPollingVideo(true);
        console.log("📹 Started polling for video, session:", res.data.session_id);
      }

      setSlides(res.data.slides);
      setQuizQuestions(res.data.quiz);
      // currentSlide is already 0 from reset above
    } catch (e) {
      console.error("Failed to load content", e);
      setSlides([{ title: "Error", content: "Failed to generate lesson. Please try again.", hasVideo: false }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Manual Trigger (e.g. from input box)
  const handleManualLoad = () => {
    if (topic.startsWith("http")) {
      setYoutubeUrl(topic);
      handleLoadContent("video", topic);
    } else {
      handleLoadContent("topic", topic);
    }
  };


  // Poll for video completion
  useEffect(() => {
    if (!isPollingVideo || !sessionId) return;

    console.log("🔄 Polling for video...");

    const pollForVideo = async () => {
      try {
        const res = await api.get(`/api/learn/session/${sessionId}`);
        console.log("Poll result:", res.data); // Debug

        const sessionStatus = res.data.data?.status;
        const videoData = res.data.data?.content_data?.video_summary;
        const videoStatus = res.data.data?.data?.video_status; // Check inside data.data or data.content_data depending on API

        if (videoData) {
          console.log("✅ Video ready! Stopping poll.");
          setGeneratedVideo(videoData);
          setIsPollingVideo(false);
        } else if (res.data.data?.content_data?.video_status === "failed") {
          console.log("⏹️ Video extraction failed/disabled. Stopping poll.");
          setIsPollingVideo(false);
        } else if (sessionStatus === "failed") {
          // Fallback if status logic changes back
          console.log(`⏹️ Polling stopped. Status: ${sessionStatus}`);
          setIsPollingVideo(false);
        }
      } catch (error) {
        console.error("Polling error:", error);
        setIsPollingVideo(false); // Stop on 404/500
      }
    };

    // Initial immediate poll
    pollForVideo();

    // Poll every 30 seconds
    const interval = setInterval(pollForVideo, 30000);

    // Cleanup on unmount or when polling stops
    return () => clearInterval(interval);
  }, [isPollingVideo, sessionId]);


  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});

  // Calculate progress based on correct answers
  useEffect(() => {
    if (quizQuestions.length === 0) return;

    let correctCount = 0;
    Object.entries(userAnswers).forEach(([qIndex, optionIndex]) => {
      const qIdx = parseInt(qIndex);
      if (quizQuestions[qIdx].correct === optionIndex) {
        correctCount++;
      }
    });

    const newProgress = Math.round((correctCount / quizQuestions.length) * 100);
    setProgress(newProgress);
  }, [userAnswers, quizQuestions]);


  const handleQuizOptionClick = (questionIndex: number, optionIndex: number) => {
    // Prevent changing answer if already answered
    if (userAnswers[questionIndex] !== undefined) return;

    setUserAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex,
    }));
  };

  const handleNextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePrevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileContext, setFileContext] = useState<{ uri: string, mime: string, name: string } | null>(null);
  const [isFileUploading, setIsFileUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsFileUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("user_id", userId || "guest");

      const res = await api.post("/api/upload", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setFileContext({
        uri: res.data.uri,
        mime: res.data.mime_type,
        name: res.data.name
      });

    } catch (error) {
      console.error("Upload Error", error);
    } finally {
      setIsFileUploading(false);
    }
  };

  const handleAskDoubt = async () => {
    if (!doubtInput.trim()) return;

    const input = doubtInput.trim();
    setDoubtInput(""); // Clear input immediately

    // Add User Message
    setChatHistory(prev => [...prev, { role: 'user', content: input }]);
    setIsChatLoading(true);

    try {
      // Prepare context from current slide
      const currentContext = slides[currentSlide]?.content || "General Context";

      const res = await api.post("/api/learn/chat", {
        message: input,
        context: currentContext,
        user_id: userId || "guest"
      });

      const answer = res.data.response;

      // Add AI Response
      setChatHistory(prev => [...prev, { role: 'ai', content: answer }]);

    } catch (e) {
      console.error("Chat Failed", e);
      setChatHistory(prev => [...prev, { role: 'ai', content: "Sorry, I couldn't process that. Please try again." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ... Header ... */}
      {/* ... Header ... */}
      <header className="bg-card border-b border-border p-4 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Logo />
          </div>

          <div className="flex-1 max-w-md">
            <div className="flex items-center gap-3">
              <Progress value={progress} className="flex-1" />
              <span className="text-sm font-medium text-foreground">
                {progress}%
              </span>
            </div>
          </div>

          {mode === "adhd" && (
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-muted-foreground" />
              <Switch
                checked={isMusicEnabled}
                onCheckedChange={setIsMusicEnabled}
                aria-label="Toggle background music"
              />
              <Label className="text-sm text-muted-foreground">Focus Music</Label>
              {isMusicEnabled && (
                <audio
                  autoPlay
                  loop
                  onLoadedMetadata={(e) => e.currentTarget.volume = 0.1}
                >
                  <source src="/focus_music.mp4" type="audio/mp4" />
                </audio>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/5 via-background to-background -z-10" />

        <div className="flex-1 p-6 h-full overflow-y-auto custom-scrollbar" ref={contentRef}>
          <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-[600px]">

            {/* LEFT COLUMN */}
            <div className="lg:col-span-7 flex flex-col gap-6">

              {/* ... Video/Image Display (Unchanged) ... */}
              {youtubeUrl ? (
                <div className="aspect-video bg-black rounded-3xl overflow-hidden shadow-lg relative z-0">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${youtubeUrl.split('v=')[1]?.split('&')[0] || youtubeUrl.split('/').pop()}`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  ></iframe>
                </div>
              ) : showVideo && generatedVideo ? (
                // Video Player
                <div className="aspect-video bg-black rounded-3xl overflow-hidden shadow-lg relative">
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
                    ← Back to Image
                  </button>
                </div>
              ) : (
                <div className="bg-card/50 backdrop-blur-sm rounded-3xl overflow-hidden border border-border/50 shadow-xl shadow-primary/5 flex-shrink-0 relative group aspect-video">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 flex flex-col items-center justify-center p-8 overflow-hidden relative">
                    {generatedImage ? (
                      <img src={`data:image/png;base64,${generatedImage}`} alt="AI Visual" className="w-full h-full object-cover transition-transform hover:scale-105 duration-1000" />
                    ) : (
                      <div className="flex flex-col items-center text-center animate-pulse">
                        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                          <ImageIcon className="w-10 h-10 text-primary" />
                        </div>
                        <p className="text-lg font-semibold text-foreground">Generating Visuals...</p>
                        <p className="text-sm text-muted-foreground mt-1">Our AI is painting a picture for you</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. Interactive Doubt Chat */}
              <div className="bg-card rounded-3xl border border-border shadow-sm flex flex-col overflow-hidden max-h-[250px]">
                {/* Chat Header */}
                <div className="p-3 border-b border-border/50 bg-secondary/20 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-foreground">Ask Doubts</span>
                </div>

                {/* File Context Chip */}
                {fileContext && (
                  <div className="px-3 py-2 bg-background/50 border-b border-border/50">
                    <div className="flex items-center justify-between px-3 py-2 bg-primary/10 rounded-lg border border-primary/20">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Upload className="w-3 h-3 text-primary shrink-0" />
                        <span className="text-xs text-primary truncate max-w-[150px]">{fileContext.name}</span>
                      </div>
                      <button
                        onClick={() => setFileContext(null)}
                        className="p-1 hover:bg-primary/20 rounded-full transition-colors"
                      >
                        <X className="w-3 h-3 text-primary" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Chat Messages Area */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[80px] custom-scrollbar bg-background/50">
                  {chatHistory.length === 0 && (
                    <div className="text-center text-muted-foreground text-xs py-8 opacity-50">
                      Ask anything about this topic! <br /> I'm here to help.
                    </div>
                  )}

                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`
                                max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm
                                ${msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-none'
                          : 'bg-card border border-border text-foreground rounded-bl-none'}
                            `}>
                        <BioncText text={msg.content.replace(/\*/g, '')} enabled={mode === "adhd"} />
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-card border border-border px-4 py-2 rounded-2xl rounded-bl-none flex gap-1 items-center">
                        <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-2 bg-card border-t border-border flex items-center gap-2">
                  <div
                    className="p-2.5 rounded-xl cursor-pointer hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-primary relative"
                    onClick={() => !isFileUploading && fileInputRef.current?.click()}
                  >
                    {isFileUploading ? (
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5" />
                    )}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".pdf,.txt,.md,.jpg,.png"
                  />

                  <Input
                    placeholder="Type your question..."
                    value={doubtInput}
                    onChange={(e) => setDoubtInput(e.target.value)}
                    className="border-none shadow-none focus-visible:ring-0 bg-transparent text-sm h-10 px-0"
                    onKeyPress={(e) => e.key === "Enter" && handleAskDoubt()}
                  />

                  <Button
                    size="icon"
                    className="h-9 w-9 rounded-xl shrink-0 transition-all"
                    onClick={handleAskDoubt}
                    disabled={(!doubtInput.trim() && !fileContext) || isChatLoading}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* ... Action Buttons ... */}
              <div className="flex gap-4">
                <Button variant="outline" className="flex-1 h-14 rounded-2xl flex items-center justify-center gap-3 border-2 border-transparent hover:border-purple-500/20 hover:bg-purple-500/5 transition-all group" onClick={() => window.open('http://localhost:8502', '_blank')}>
                  <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 text-purple-600 transition-colors">
                    <Book className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-foreground/80 group-hover:text-purple-700">Open Notebook</span>
                </Button>

                <Button
                  variant="outline"
                  className="flex-1 h-14 rounded-2xl flex items-center justify-center gap-3 border-2 border-transparent hover:border-blue-500/20 hover:bg-blue-500/5 transition-all group"
                  onClick={() => setShowVideo(true)}
                  disabled={!generatedVideo}
                >
                  <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 text-blue-600 transition-colors">
                    <Video className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-foreground/80 group-hover:text-blue-700">Video Summary</span>
                </Button>
              </div>

              {/* ... Bottom Section (Avatar + Insight) ... (Preserved) */}
              <div className="mt-auto grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                {/* Left: Child Avatar */}
                <div className="relative group">
                  <InteractiveAvatar />
                </div>

                {/* Right: Quiz Insights */}
                <div className="bg-card rounded-3xl p-4 border border-border shadow-sm flex flex-col justify-center min-h-[190px]">
                  {(() => {
                    const q = quizQuestions[activeQuestionIndex];
                    if (!q) return (
                      <div className="text-center text-muted-foreground text-sm opacity-50">
                        Insights will appear here
                      </div>
                    );
                    const isAnswered = userAnswers[activeQuestionIndex] !== undefined;

                    if (isAnswered) {
                      return (
                        <div className="animate-in fade-in zoom-in-95 h-full flex flex-col">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">💡</span>
                            <h4 className="font-bold text-xs text-primary uppercase tracking-wider">Smart Insight</h4>
                          </div>
                          <p className="text-sm text-foreground/80 leading-relaxed overflow-y-auto mb-2 custom-scrollbar">
                            {q.explanation || "Great work! You got it right."}
                          </p>
                          {activeQuestionIndex < quizQuestions.length - 1 ? (
                            <Button onClick={handleNextQuestion} size="sm" className="mt-auto w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20">
                              Next Question <ChevronRight className="w-3 h-3 ml-1" />
                            </Button>
                          ) : (
                            <div className="mt-auto w-full text-center py-1.5 bg-green-500/10 text-green-600 rounded-lg text-xs font-bold">
                              All Done!
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      return (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                          <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center mb-2 text-xl">🔒</div>
                          <p className="text-xs font-medium text-muted-foreground">Answer to unlock<br />the insight</p>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-5 flex flex-col gap-6 h-full overflow-hidden">
              {/* ... Slides Card ... */}
              <div className="bg-card rounded-3xl p-6 border border-border shadow-md flex-1 overflow-y-auto flex flex-col custom-scrollbar relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent opacity-50" />

                <div className="flex items-center justify-between mb-6 sticky top-0 bg-card z-10 py-2 border-b border-border/40">
                  <h2 className="text-xl font-bold text-foreground line-clamp-1">{slides[currentSlide].title}</h2>
                  <span className="text-xs font-bold text-muted-foreground bg-secondary px-2 py-1 rounded-md border border-border">
                    {currentSlide + 1} / {slides.length}
                  </span>
                </div>

                <div className="prose dark:prose-invert prose-p:leading-relaxed prose-headings:font-bold max-w-none flex-1">
                  <BioncText text={slides[currentSlide].content} enabled={mode === "adhd"} />
                </div>

                {/* Navigation at Bottom of Card */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
                  <Button variant="ghost" onClick={handlePrevSlide} disabled={currentSlide === 0} className="hover:bg-primary/5 text-muted-foreground hover:text-primary">
                    <ChevronLeft className="w-5 h-5 mr-1" /> Back
                  </Button>

                  {/* Dots Indicator */}
                  <div className="flex gap-1.5">
                    {slides.map((_, i) => (
                      <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentSlide ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"}`} />
                    ))}
                  </div>

                  <Button variant="default" onClick={handleNextSlide} disabled={currentSlide === slides.length - 1} className="pl-6 pr-4 rounded-xl shadow-lg shadow-primary/20">
                    Next <ChevronRight className="w-5 h-5 ml-1" />
                  </Button>
                </div>
              </div>

              {/* Quiz Card - Fixed Key for Re-render */}
              {quizQuestions.length > 0 && (
                <div key={activeQuestionIndex} className="bg-card rounded-3xl p-6 border border-border shadow-md">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-500/10 rounded-xl text-green-600">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">Knowledge Check</h3>
                      <p className="text-xs text-muted-foreground">Test your understanding</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {quizQuestions.map((q, qIndex) => {
                      // Only show ACTIVE question
                      if (qIndex !== activeQuestionIndex) return null;

                      const userAnswer = userAnswers[qIndex];
                      const isAnswered = userAnswer !== undefined;

                      return (
                        <div key={qIndex} className="animate-in fade-in slide-in-from-right-4 duration-300">
                          <p className="font-medium text-foreground mb-3 text-sm leading-snug">
                            <span className="text-primary font-bold mr-2">Q{qIndex + 1}.</span>
                            {q.question}
                          </p>
                          <div className="grid grid-cols-1 gap-2">
                            {q.options.map((option, oIndex) => {
                              let buttonClass = "w-full p-3 rounded-xl border text-sm font-medium transition-all duration-200 flex items-center justify-between group ";

                              if (isAnswered) {
                                if (oIndex === q.correct) {
                                  buttonClass += "bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-300";
                                } else if (oIndex === userAnswer) {
                                  buttonClass += "bg-red-500/10 border-red-500/50 text-red-700 dark:text-red-300";
                                } else {
                                  buttonClass += "bg-muted/30 border-transparent opacity-50";
                                }
                              } else {
                                buttonClass += "bg-secondary/30 border-transparent hover:bg-secondary hover:border-primary/30 text-muted-foreground hover:text-foreground";
                              }

                              return (
                                <button
                                  key={oIndex}
                                  disabled={isAnswered}
                                  onClick={() => handleQuizOptionClick(qIndex, oIndex)}
                                  className={buttonClass}
                                >
                                  <span>{option}</span>
                                  {isAnswered && oIndex === q.correct && <span className="text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded-full">Correct</span>}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LearnMode;
