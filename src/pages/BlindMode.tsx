import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { ArrowLeft, Mic, MicOff, Upload, Volume2 } from "lucide-react";

const BlindMode = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "ai"; content: string }[]
  >([
    {
      role: "ai",
      content:
        "Hello! Welcome to DrishtiKosh. I'm your AI learning assistant. What language would you prefer to communicate in?",
    },
  ]);

  // Simulate voice interaction
  const toggleListening = useCallback(() => {
    if (isListening) {
      setIsListening(false);
      // Process transcript
      if (transcript) {
        setMessages((prev) => [...prev, { role: "user", content: transcript }]);
        // Simulate AI response
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              role: "ai",
              content: `I understand you said "${transcript}". Let me help you with that. I can explain any topic you'd like to learn about. Just speak your question!`,
            },
          ]);
          setAiResponse(
            `I understand you said "${transcript}". Let me help you with that.`
          );
        }, 1000);
        setTranscript("");
      }
    } else {
      setIsListening(true);
      // Simulate speech recognition
      setTimeout(() => {
        setTranscript("Tell me about the solar system");
      }, 2000);
    }
  }, [isListening, transcript]);

  // Auto-read AI responses
  useEffect(() => {
    if (aiResponse) {
      // In production, this would use Web Speech API or TTS
      console.log("Speaking:", aiResponse);
    }
  }, [aiResponse]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="p-2 rounded-lg hover:bg-accent transition-colors"
              aria-label="Go back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Logo />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Upload file">
              <Upload className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" aria-label="Audio settings">
              <Volume2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Microphone Button with Ripple Effect */}
        <div className="relative mb-12 flex items-center justify-center">
          {/* Ripple Effects - centered around the button */}
          {isListening && (
            <>
              <div className="absolute w-56 h-56 rounded-full bg-primary/20 animate-pulse-ring" />
              <div
                className="absolute w-56 h-56 rounded-full bg-primary/15 animate-pulse-ring"
                style={{ animationDelay: "0.3s" }}
              />
              <div
                className="absolute w-56 h-56 rounded-full bg-primary/10 animate-pulse-ring"
                style={{ animationDelay: "0.6s" }}
              />
            </>
          )}

          {/* Main Button */}
          <button
            onClick={toggleListening}
            className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
              isListening
                ? "bg-destructive scale-110"
                : "bg-primary hover:bg-primary/90 hover:scale-105"
            }`}
            aria-label={isListening ? "Stop listening" : "Start listening"}
            aria-pressed={isListening}
          >
            {isListening ? (
              <MicOff className="w-12 h-12 text-destructive-foreground" />
            ) : (
              <Mic className="w-12 h-12 text-primary-foreground" />
            )}
          </button>
        </div>

        {/* Status Text */}
        <div className="text-center mb-8">
          <p className="text-xl font-medium text-foreground mb-2">
            {isListening ? "Listening..." : "Tap to speak"}
          </p>
          <p className="text-muted-foreground">
            {isListening
              ? "Speak clearly, I'm listening to you"
              : "Press the microphone button to start talking"}
          </p>
        </div>

        {/* Live Transcript */}
        {transcript && (
          <div className="bg-card p-4 rounded-xl border border-border max-w-xl w-full mb-8 animate-fade-in">
            <p className="text-sm text-muted-foreground mb-1">You said:</p>
            <p className="text-foreground font-medium">{transcript}</p>
          </div>
        )}

        {/* Conversation Display */}
        <div className="w-full max-w-2xl space-y-4 max-h-[40vh] overflow-y-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              } animate-fade-in`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-2xl ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-card border border-border text-foreground rounded-bl-md"
                }`}
              >
                <p className="text-sm font-medium mb-1">
                  {message.role === "user" ? "You" : "AI Assistant"}
                </p>
                <p>{message.content}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Keyboard Shortcut Hint */}
      <footer className="p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Press <kbd className="px-2 py-1 bg-card rounded border border-border text-xs">Space</kbd> to toggle microphone
        </p>
      </footer>
    </div>
  );
};

export default BlindMode;
