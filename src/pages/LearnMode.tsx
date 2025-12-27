import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
} from "lucide-react";
import AICompanion from "@/components/AICompanion";
import BioncText from "@/components/BionicText";

const LearnMode = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "adhd";

  const [progress, setProgress] = useState(0);
  const [isMusicEnabled, setIsMusicEnabled] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [showQuiz, setShowQuiz] = useState(false);
  const [doubtInput, setDoubtInput] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  // Sample learning content
  const slides = [
    {
      title: "Introduction to Photosynthesis",
      content:
        "Photosynthesis is the process by which green plants and some other organisms use sunlight to synthesize foods with carbon dioxide and water. This process generates oxygen as a byproduct and is fundamental to life on Earth.",
      hasVideo: true,
    },
    {
      title: "The Light Reactions",
      content:
        "The light reactions occur in the thylakoid membranes of chloroplasts. During these reactions, light energy is captured by chlorophyll and converted into chemical energy in the form of ATP and NADPH.",
      hasVideo: false,
    },
    {
      title: "The Calvin Cycle",
      content:
        "The Calvin Cycle, also known as the dark reactions, takes place in the stroma of the chloroplast. It uses ATP and NADPH from the light reactions to convert carbon dioxide into glucose.",
      hasVideo: true,
    },
  ];

  // Quiz questions
  const quizQuestions = [
    {
      question: "What is the primary product of photosynthesis?",
      options: ["Oxygen", "Carbon Dioxide", "Glucose", "Water"],
      correct: 2,
    },
    {
      question: "Where do the light reactions occur?",
      options: ["Stroma", "Thylakoid", "Mitochondria", "Nucleus"],
      correct: 1,
    },
  ];

  // Simulate progress increase
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 1;
      });
    }, 500);

    return () => clearInterval(timer);
  }, []);

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

  const handleAskDoubt = () => {
    if (doubtInput.trim()) {
      // In production, this would call the AI API
      console.log("Asked:", doubtInput);
      setDoubtInput("");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
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

          {/* Progress Bar */}
          <div className="flex-1 max-w-md">
            <div className="flex items-center gap-3">
              <Progress value={progress} className="flex-1" />
              <span className="text-sm font-medium text-foreground">
                {progress}%
              </span>
            </div>
          </div>

          {/* Music Toggle (ADHD mode) */}
          {mode === "adhd" && (
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-muted-foreground" />
              <Switch
                checked={isMusicEnabled}
                onCheckedChange={setIsMusicEnabled}
                aria-label="Toggle background music"
              />
              <Label className="text-sm text-muted-foreground">Focus Music</Label>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex">
        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto" ref={contentRef}>
          <div className="max-w-4xl mx-auto">
            {/* Video/Image Section */}
            <div className="bg-card rounded-2xl overflow-hidden mb-6 border border-border">
              {youtubeUrl ? (
                <div className="aspect-video bg-secondary flex items-center justify-center">
                  <p className="text-secondary-foreground">
                    YouTube video would embed here
                  </p>
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex flex-col items-center justify-center p-8">
                  <ImageIcon className="w-16 h-16 text-primary/50 mb-4" />
                  <p className="text-foreground font-medium mb-2">
                    Generated Learning Visual
                  </p>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    AI-generated images based on your topic will appear here
                  </p>
                </div>
              )}

              {/* Caption Bar (for deaf mode) */}
              {mode === "deaf" && (
                <div className="bg-secondary p-4">
                  <p className="text-secondary-foreground text-center">
                    [Captions will appear here during video playback]
                  </p>
                </div>
              )}
            </div>

            {/* URL Input */}
            <div className="mb-6">
              <div className="flex gap-2">
                <Input
                  placeholder="Paste YouTube URL or enter a topic..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="h-12"
                />
                <Button variant="default" size="lg">
                  <Play className="w-4 h-4 mr-2" />
                  Load
                </Button>
              </div>
            </div>

            {/* Explanation Section */}
            <div className="bg-card rounded-2xl p-6 border border-border mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                {slides[currentSlide].title}
              </h2>
              <BioncText text={slides[currentSlide].content} enabled={mode === "adhd"} />
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="outline"
                onClick={handlePrevSlide}
                disabled={currentSlide === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      index === currentSlide
                        ? "bg-primary"
                        : "bg-muted hover:bg-muted-foreground"
                    }`}
                  />
                ))}
              </div>

              <Button
                variant="outline"
                onClick={handleNextSlide}
                disabled={currentSlide === slides.length - 1}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Ask Doubt Section */}
            <div className="bg-card rounded-2xl p-6 border border-border mb-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                Ask a Doubt
              </h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Type your question here..."
                  value={doubtInput}
                  onChange={(e) => setDoubtInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAskDoubt()}
                  className="flex-1"
                />
                <Button onClick={handleAskDoubt}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                variant="outline"
                onClick={() => setShowQuiz(!showQuiz)}
                className="h-auto py-4 flex flex-col gap-2"
              >
                <MessageSquare className="w-6 h-6" />
                <span>Generated Quiz</span>
              </Button>

              <Link to="/flowchart" className="contents">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-2"
                >
                  <GitBranch className="w-6 h-6" />
                  <span>Flowcharts</span>
                </Button>
              </Link>

              {progress >= 100 && (
                <Button
                  variant="hero"
                  className="h-auto py-4 flex flex-col gap-2 col-span-2"
                >
                  <Video className="w-6 h-6" />
                  <span>Video Summary</span>
                </Button>
              )}
            </div>

            {/* Quiz Section */}
            {showQuiz && (
              <div className="mt-6 bg-card rounded-2xl p-6 border border-border animate-fade-in">
                <h3 className="font-semibold text-foreground mb-4">
                  Quick Quiz
                </h3>
                {quizQuestions.map((q, qIndex) => (
                  <div key={qIndex} className="mb-6">
                    <p className="font-medium text-foreground mb-3">
                      {qIndex + 1}. {q.question}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((option, oIndex) => (
                        <button
                          key={oIndex}
                          className="p-3 rounded-lg border border-border hover:bg-accent hover:border-primary text-left transition-colors"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* AI Companion Sidebar */}
        {progress < 100 && (
          <div className="w-24 bg-card border-l border-border flex flex-col items-center justify-center p-4">
            <AICompanion />
          </div>
        )}
      </main>
    </div>
  );
};

export default LearnMode;
