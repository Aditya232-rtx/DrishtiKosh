import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { ArrowLeft, Mic, MicOff, Upload, Volume2 } from "lucide-react";
import api from "@/lib/api";
import { auth } from "../lib/auth";

const BlindMode = () => {
  const userId = auth.getUserId(); // Get authenticated user ID
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const initialTopic = searchParams.get("topic");
  const pendingContext = searchParams.get("pending_context");
  const [isListening, setIsListening] = useState(false);
  // Status for logic, but we'll stick to isListening for UI mostly or map it
  const [status, setStatus] = useState<"idle" | "listening" | "processing" | "speaking">("idle");
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);

  // Restore Chat History state
  const [messages, setMessages] = useState<
    { role: "user" | "ai"; content: string }[]
  >([
    {
      role: "ai",
      content:
        "Hi there! I'm Drishti, your AI companion. I'm here to see the world with you. When you're ready, just press the Space bar to talk, and press it again to send. I'm listening.",
    },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // --- Logic: Audio Cues (New Feature, Hidden from UI) ---
  const playCue = (type: "start" | "stop" | "processing") => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === "start") { // High Beep
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === "stop") { // Low Beep
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else { // Processing Hum
        osc.frequency.setValueAtTime(220, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (e) {
      console.error("Audio Context Error", e);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("File selected:", file.name);
      setMessages((prev) => [...prev, { role: "ai", content: `Analyzing ${file.name}...` }]);
      setStatus("processing");
      playCue("processing");

      const formData = new FormData();
      formData.append('image', file);
      if (userId) formData.append('user_id', userId); // Add authenticated user

      try {
        const response = await api.post('/api/blind/interact', formData);
        const data = response.data;

        if (data.ai_response) {
          setMessages((prev) => [...prev, { role: "ai", content: data.ai_response }]);
          setAiResponse(data.ai_response);
        }

        if (data.audio_base64) {
          setStatus("speaking");
          const audioUrl = `data:audio/wav;base64,${data.audio_base64}`;
          if (audioRef.current) {
            audioRef.current.src = audioUrl;
            audioRef.current.play();
            setIsPlaying(true);
          }
        } else {
          setStatus("idle");
        }
      } catch (err) {
        console.error("Analysis failed", err);
        setMessages((prev) => [...prev, { role: "ai", content: "Sorry, I encountered an error." }]);
        setStatus("idle");
      }
    }
  };

  // Logic: Process Audio
  const processAudio = async (audioBlob: Blob) => {
    console.log(`[DEBUG] processAudio called with blob: ${audioBlob.size} bytes`);

    setMessages((prev) => [...prev, { role: "ai", content: "Thinking..." }]);
    setStatus("processing");
    playCue("processing");

    const formData = new FormData();
    formData.append("audio", audioBlob, "voice_input.webm");
    if (userId) formData.append("user_id", userId); // Add authenticated user

    console.log(`[DEBUG] FormData created. Audio field value:`, formData.get('audio'));
    console.log(`[DEBUG] Sending to /api/blind/interact...`);

    try {
      const response = await api.post("/api/blind/interact", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const data = response.data;

      console.log(`[DEBUG] Response received:`, data);

      setMessages(prev => prev.filter(msg => msg.content !== "Thinking..."));

      const userText = data.user_transcript || "(No speech detected)";
      setMessages((prev) => [...prev, { role: "user", content: userText }]); // Always show user bubble

      if (data.ai_response) {
        setMessages((prev) => [...prev, { role: "ai", content: data.ai_response }]);
        setAiResponse(data.ai_response);
      } else if (!data.user_transcript) {
        // If no transcript and no AI response, show error
        setMessages((prev) => [...prev, { role: "ai", content: "I couldn't hear that. Please try again." }]);
      }

      if (data.audio_base64) {
        setStatus("speaking");
        const audioUrl = `data:audio/wav;base64,${data.audio_base64}`;
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play();
          setIsPlaying(true);
        }
      } else {
        setStatus("idle");
      }

    } catch (error) {
      console.error("Error processing audio:", error);
      setMessages(prev => prev.filter(msg => msg.content !== "Thinking..."));
      setMessages((prev) => [...prev, { role: "ai", content: "Sorry, I couldn't hear that." }]);
      setStatus("idle");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        // Use webm as it is the standard browser recording format
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log(`[DEBUG] Audio blob created: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
        console.log(`[DEBUG] Audio chunks collected: ${audioChunksRef.current.length}`);

        if (audioBlob.size === 0) {
          console.error('[ERROR] Audio blob is empty! No data was recorded.');
          alert('No audio was recorded. Please try again and speak closer to the microphone.');
          setStatus("idle");
          return;
        }

        processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
      setStatus("listening");
      playCue("start");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsListening(false);
      playCue("stop");
    }
  };

  const toggleListening = useCallback(() => {
    if (status === "speaking" || status === "processing") return;
    if (isListening) stopRecording();
    else startRecording();
  }, [isListening, status]);

  // Logic: Keyboard Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        toggleListening();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleListening]);
  // Speak Welcome Message on Mount
  // Speak Welcome Message OR Restore Session
  useEffect(() => {
    const initSession = async () => {
      if (sessionId) {
        // Restore History
        try {
          const sessionRes = await api.get(`/api/learn/session/${sessionId}`);
          const data = sessionRes.data.data;
          if (data.blind_conversation_id) {
            const msgsRes = await api.get(`/api/blind/messages/${data.blind_conversation_id}`);
            const restored = msgsRes.data.map((m: any) => ({
              role: m.role,
              content: m.content
            }));
            if (restored.length > 0) setMessages(restored);
          }
        } catch (e) {
          console.error("Failed to restore blind session", e);
        }
      } else if (initialTopic) {
        // Start with Context
        setMessages(prev => [...prev, { role: "user", content: initialTopic }]);

        const formData = new FormData();
        formData.append('text', initialTopic);
        if (userId) formData.append('user_id', userId);

        try {
          const res = await api.post('/api/blind/interact', formData);
          if (res.data.ai_response) {
            setMessages(prev => [...prev, { role: "ai", content: res.data.ai_response }]);
            // Play audio
            if (res.data.audio_base64) {
              setStatus("speaking");
              const audioUrl = `data:audio/wav;base64,${res.data.audio_base64}`;
              if (audioRef.current) {
                audioRef.current.src = audioUrl;
                audioRef.current.play();
                setIsPlaying(true);
              }
            }
          }
        } catch (e) {
          console.error("Failed to start context session", e);
        }
      } else {
        // Default Welcome (Only if no session/topic)
        const speakWelcome = () => {
          const welcomeText = messages[0].content;
          const utterance = new SpeechSynthesisUtterance(welcomeText);
          utterance.rate = 0.9;

          // Try to find a female/pleasant voice
          const voices = window.speechSynthesis.getVoices();
          const preferredVoice = voices.find(v =>
            v.name.includes("Samantha") ||
            v.name.includes("Google US English") ||
            v.name.includes("Zira") ||
            v.name.includes("Female")
          );
          if (preferredVoice) utterance.voice = preferredVoice;

          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
        };

        if (window.speechSynthesis.getVoices().length > 0) {
          speakWelcome();
        } else {
          window.speechSynthesis.onvoiceschanged = speakWelcome;
        }
        // Play subtle cue
        playCue("start");
      }
    };

    initSession();

    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

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
            <Button
              variant="outline"
              size="icon"
              aria-label="Upload file"
              onClick={handleUploadClick}
            >
              <Upload className="w-4 h-4" />
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx"
            />
            <Button variant="outline" size="icon" aria-label="Audio settings">
              <Volume2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Microphone Button with Ripple Effect - RESTORED */}
        <div className="relative mb-12 flex items-center justify-center">
          {/* Ripple Effects */}
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
            className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${isListening
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

        {/* Status Text - RESTORED */}
        <div className="text-center mb-8">
          <p className="text-xl font-medium text-foreground mb-2">
            {status === "processing" ? "Thinking..." : (isListening ? "Listening..." : "Tap to speak")}
          </p>
          <p className="text-muted-foreground">
            {isListening
              ? "Listening... Press Space again to send."
              : "Press Space to speak"}
          </p>
        </div>

        {/* Conversation Display - RESTORED */}
        <div className="w-full max-w-2xl space-y-4 max-h-[40vh] overflow-y-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"
                } animate-fade-in`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-2xl ${message.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border text-foreground rounded-bl-md"
                  }`}
              >
                <p className="text-sm font-medium mb-1">
                  {message.role === "user" ? "You" : "Drishti"}
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
      <audio
        ref={audioRef}
        onEnded={() => { setIsPlaying(false); setStatus("idle"); }}
        onPlay={() => { setIsPlaying(true); setStatus("speaking"); }}
        className="hidden"
      />
    </div>
  );
};

export default BlindMode;
