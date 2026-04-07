import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { ArrowLeft, Mic, PhoneOff, Moon, Sun, MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { auth } from "../lib/auth";
import { useTheme } from "@/context/ThemeContext";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";

// Audio Configuration - Optimized for low latency
const SAMPLE_RATE = 24000;
const CHUNK_SIZE = 2048; // Reduced for lower latency

type Message = {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: string;
};

const BlindMode = () => {
  const userId = auth.getUserId();

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const { isDarkMode } = useTheme();
  const [status, setStatus] = useState<"IDLE" | "CONNECTING" | "LISTENING" | "SPEAKING">("IDLE");

  // Refs
  const websocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const serverFinishedRef = useRef(false);
  const recognitionRef = useRef<any>(null); // Web Speech API for user transcription
  const chatEndRef = useRef<HTMLDivElement>(null);
  const announcerRef = useRef<HTMLDivElement>(null); // Screen reader announcements
  const isUserSpeakingRef = useRef(false); // Ref for sync access to user speaking state
  const autoCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Audio queue
  const audioQueueRef = useRef<(Float32Array | string)[]>([]);
  const isPlayingRef = useRef(false);
  const nextStartTimeRef = useRef(0);

  // --- Helper Functions ---
  const announce = (message: string) => {
    if (announcerRef.current) {
      announcerRef.current.textContent = message;
    }
  };

  const addMessage = (role: "user" | "ai", text: string) => {
    setMessages((prev) => {
      const lastMsg = prev[prev.length - 1];
      // Append to last AI message if streaming
      if (lastMsg && lastMsg.role === role && role === "ai") {
        return [
          ...prev.slice(0, -1),
          { ...lastMsg, text: lastMsg.text + text }
        ];
      }
      return [...prev, {
        id: Date.now().toString() + Math.random(),
        role,
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }];
    });

    announce(`${role === "user" ? "You said" : "Drishti said"}: ${text}`);
  };

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const finishTurn = () => {
    if (isSpeaking) {
      announce("Processing...");
      setStatus("SPEAKING");

      // LATENCY OPTIMIZATION: Send immediately for sub-second response
      stopMic();
      if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
        console.log("🛑 Sending input_end signal");
        websocketRef.current.send(JSON.stringify({ type: "input_end" }));
      }
      // Start playing any buffered audio immediately
      playNextChunk();
    }
  };

  // --- Audio Playback ---
  const playNextChunk = () => {
    // Clear any pending auto-close timeout since we are attempting to play
    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
      autoCloseTimeoutRef.current = null;
    }

    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsAiSpeaking(false);
      return;
    }

    isPlayingRef.current = true;
    setIsAiSpeaking(true);
    setStatus("SPEAKING");

    const item = audioQueueRef.current.shift()!;
    console.log(`▶️ Playing chunk. Queue size: ${audioQueueRef.current.length}`);

    // CHECK FOR SENTINEL
    if (typeof item === 'string' && item === "END_OF_TURN") {
      console.log("✅ End-of-turn sentinel reached. Returning to LISTENING mode.");
      isPlayingRef.current = false;
      setIsAiSpeaking(false);
      setStatus("LISTENING");
      announce("Listening");

      if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN && !isUserSpeakingRef.current) {
        startMic();
      }
      return;
    }

    // It's an audio chunk
    const chunk = item as Float32Array;
    const ctx = audioContextRef.current;

    if (!ctx) {
      console.warn("AudioContext is null in playNextChunk");
      return;
    }

    const buffer = ctx.createBuffer(1, chunk.length, SAMPLE_RATE);
    // Use type assertion to avoid TS errors
    buffer.copyToChannel(chunk as any, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    const startTime = Math.max(now, nextStartTimeRef.current);
    source.start(startTime);

    nextStartTimeRef.current = startTime + buffer.duration;

    source.onended = () => {
      playNextChunk();
    };
  };

  const queueAudioChunk = (data: ArrayBuffer) => {
    const int16 = new Int16Array(data);
    const float32 = new Float32Array(int16.length);
    let maxAmp = 0;
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
      if (Math.abs(float32[i]) > maxAmp) maxAmp = Math.abs(float32[i]);
    }

    console.log(`📥 Queued audio chunk: ${float32.length} samples, Max Amp: ${maxAmp.toFixed(4)}`);

    audioQueueRef.current.push(float32);

    // Only start playback if NOT playing AND User is NOT speaking (strict sequentiality)
    if (!isPlayingRef.current && !isUserSpeakingRef.current) {
      if (audioContextRef.current) {
        // Ensure context is running
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        // Resync time if we drifted or started fresh
        nextStartTimeRef.current = Math.max(audioContextRef.current.currentTime, nextStartTimeRef.current);
      }
      playNextChunk();
    }
  };

  // --- WebSocket Connection ---
  const startLiveSession = async () => {
    // Safety: ensure any previous session is cleaned up
    if (websocketRef.current || audioContextRef.current) {
      console.warn("⚠️ Cleaning up lingering session before start");
      await stopLiveSession("Restarting");
      // Cool-down for resource release (not in critical latency path)
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    try {
      setStatus("CONNECTING");
      announce("Connecting to Drishti...");

      // Reset state for new session
      serverFinishedRef.current = false;
      audioQueueRef.current = [];
      isPlayingRef.current = false;
      setMessages([]); // Optional: Clear old messages or keep them based on design

      // 1. Initialize Audio Context
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
      await audioContextRef.current.resume();
      console.log(`🔊 AudioContext started. State: ${audioContextRef.current.state}, Rate: ${audioContextRef.current.sampleRate}`);

      // 2. Initialize Web Speech API for User Transcription
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        // recognitionRef.current.lang = 'en-US'; // Could be dynamic based on user profile

        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript) {
            addMessage("user", finalTranscript);
          }
        };

        try {
          recognitionRef.current.start();
        } catch (e) {
          console.log("Recognition already started");
        }
      }

      // 3. Connect WebSocket with user_id
      const wsUrl = api.defaults.baseURL?.replace("http", "ws") || "ws://localhost:8001";
      const ws = new WebSocket(`${wsUrl}/api/blind/live?user_id=${userId}`);
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        setStatus("LISTENING");
        announce("Connected. Listening for your voice.");
        startMic();
      };

      ws.onmessage = async (event) => {
        if (event.data instanceof Blob) {
          // Audio chunk
          const arrayBuffer = await event.data.arrayBuffer();
          // Debug: print every 10th chunk or just start
          queueAudioChunk(arrayBuffer);
        } else {
          // Text message (transcript or control)
          try {
            const msg = JSON.parse(event.data);
            console.log("📩 WS Text:", msg.type); // Debug log
            if (msg.type === "text" && msg.role === "ai") {
              addMessage("ai", msg.content);
            } else if (msg.type === "turn_complete") {
              console.log("🏁 Turn complete received. Pushing sentinel.");
              audioQueueRef.current.push("END_OF_TURN");

              // Trigger playback if stuck (e.g. queue was empty before this arrived)
              if (!isPlayingRef.current && !isUserSpeakingRef.current) {
                playNextChunk();
              }

              // If no audio arrived at all, immediately switch back to listening
              if (!isPlayingRef.current && audioQueueRef.current.length === 0) {
                setIsAiSpeaking(false);
                setStatus("LISTENING");
                announce("Listening");
                startMic();
              }
            }
          } catch (e) {
            // Non-JSON message, ignore
          }
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);
        setStatus("IDLE");
        announce("Disconnected");
        stopMic();
        recognitionRef.current?.stop();
      };

      ws.onerror = (err) => {
        console.error("WebSocket error", err);
      };

    } catch (e) {
      console.error("Failed to start live session", e);
      announce("Failed to connect. Please try again.");
    }
  };

  const stopLiveSession = async (reason: string = "User Request") => {
    console.log(`🛑 stopLiveSession called. Reason: ${reason}`);
    if (websocketRef.current) {
      // Remove listeners to prevent "close" event loops
      websocketRef.current.onclose = null;
      websocketRef.current.onerror = null;
      websocketRef.current.close();
      websocketRef.current = null;
    }
    stopMic();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // Explicitly close AudioContext
    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          await audioContextRef.current.close();
        }
      } catch (e) {
        console.error("Error closing AudioContext:", e);
      }
      audioContextRef.current = null;
    }

    setIsConnected(false);
    setStatus("IDLE");
    announce("Session ended");
  };

  const startMic = async () => {
    try {
      if (isUserSpeakingRef.current) {
        return;
      }
      if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
        console.warn("Cannot start mic: websocket is not open");
        return;
      }
      if (!audioContextRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true
        }
      });
      streamRef.current = stream;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(CHUNK_SIZE, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);

        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          let s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        websocketRef.current.send(pcmData.buffer);
      };

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);

      setIsSpeaking(true);
      isUserSpeakingRef.current = true;

    } catch (e) {
      console.error("Mic error", e);
      announce("Failed to access microphone");
    }
  };

  const stopMic = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsSpeaking(false);
    isUserSpeakingRef.current = false;
  };


  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault(); // Prevent scrolling
        if (!isConnected) {
          startLiveSession();
        } else {
          // Toggle speaking state while connected
          if (isSpeaking) {
            finishTurn();
          } else if (!isAiSpeaking) {
            setStatus("LISTENING");
            announce("Listening");
            startMic();
          }
        }
      } else if (e.code === "Escape" && isConnected) {
        stopLiveSession("Escape Key");
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isConnected, isSpeaking, isAiSpeaking]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopLiveSession();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isDarkMode ? "bg-slate-900 text-white" : "bg-[#F8F9FA] text-slate-800"
      } relative overflow-hidden`}>

      {/* Screen Reader Announcements */}
      <div
        ref={announcerRef}
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />

      {/* Header */}
      <header className={`${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
        } border-b p-4 transition-colors`}>
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="p-2 rounded-lg hover:bg-accent transition-colors"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Logo />
            <span className="text-xs text-slate-400 tracking-wider uppercase">
              DRISHTI AI ASSISTANT
            </span>
            {isConnected && (
              <span className="ml-4 px-3 py-1 bg-red-100 dark:bg-red-900 text-red-500 dark:text-red-300 text-[10px] font-bold tracking-widest rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                LIVE
              </span>
            )}
          </div>

          {/* Theme Toggle */}
          <ThemeToggleButton />
        </div>
      </header>

      {/* Main Content - Two Column Layout */}
      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[calc(100vh-200px)]">

          {/* LEFT SIDE: GRADIENT ORB VISUALIZER */}
          <div
            className="relative flex flex-col items-center justify-center h-[500px]"
            role="region"
            aria-label="Voice activity visualizer"
          >
            {/* Header */}
            <div className="absolute top-0 left-0 flex items-center gap-3">
              <div className={`${isDarkMode ? "bg-white text-black" : "bg-black text-white"
                } p-2 rounded-lg transition-colors`}>
                <span className="text-2xl">◉</span>
              </div>
              <div>
                <h1 className="font-bold text-lg">drishtikosh</h1>
                <span className={`text-xs tracking-wider uppercase ${isDarkMode ? "text-slate-400" : "text-slate-500"
                  }`}>
                  {status}
                </span>
              </div>
            </div>

            {/* GRADIENT ORB */}
            <div
              className={`relative w-80 h-80 rounded-full blur-3xl transition-all duration-1000 ${isConnected
                ? isAiSpeaking
                  ? "bg-gradient-to-tr from-purple-500 via-blue-500 to-cyan-400 opacity-80 animate-pulse"
                  : "bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-400 opacity-70"
                : isDarkMode
                  ? "bg-slate-700 opacity-40"
                  : "bg-slate-200 opacity-40"
                }`}
              aria-hidden="true"
            />

            {/* Status Text */}
            <div className="mt-12 text-center space-y-2">
              <h2 className="text-blue-500 font-bold tracking-[0.2em] text-sm uppercase">
                {status === "IDLE" && "READY TO START"}
                {status === "CONNECTING" && "CONNECTING..."}
                {status === "LISTENING" && "ANALYZING ENVIRONMENT"}
                {status === "SPEAKING" && "DRISHTI SPEAKING"}
              </h2>
              <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                {status === "IDLE" && "Press Space or click Start to begin"}
                {status === "CONNECTING" && "Establishing connection..."}
                {status === "LISTENING" && "Voice activity detected..."}
                {status === "SPEAKING" && "Drishti is speaking..."}
              </p>
            </div>
          </div>

          {/* RIGHT SIDE: TRANSCRIPT PANEL */}
          <div
            className={`${isDarkMode
              ? "bg-slate-800 border-slate-700"
              : "bg-white border-slate-100"
              } rounded-[2rem] p-6 md:p-8 shadow-xl h-[500px] flex flex-col border transition-colors`}
            role="region"
            aria-label="Conversation transcript"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <span className={`text-xs font-bold tracking-widest uppercase ${isDarkMode ? "text-slate-400" : "text-slate-500"
                }`}>
                Transcript Stream
              </span>
              <MoreHorizontal className={`w-5 h-5 ${isDarkMode ? "text-slate-500" : "text-slate-300"
                }`} aria-hidden="true" />
            </div>

            {/* Chat Area */}
            <div
              className="flex-1 space-y-6 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600"
              role="log"
              aria-live="polite"
            >
              {messages.length === 0 && (
                <p className={`text-center mt-20 ${isDarkMode ? "text-slate-600" : "text-slate-300"
                  }`}>
                  Start speaking to see transcript...
                </p>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`px-6 py-4 rounded-2xl max-w-[85%] ${msg.role === 'user'
                      ? isDarkMode
                        ? 'bg-white text-black rounded-tr-sm'
                        : 'bg-black text-white rounded-tr-sm'
                      : isDarkMode
                        ? 'bg-slate-700 text-slate-100 border border-slate-600 rounded-tl-sm'
                        : 'bg-slate-50 text-slate-700 border border-slate-100 rounded-tl-sm'
                      }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  </div>
                  <p className={`text-[10px] mt-1 uppercase tracking-wider ${isDarkMode ? "text-slate-600" : "text-slate-300"
                    }`}>
                    {msg.role === 'user' ? 'YOU' : 'DRISHTI'} • {msg.timestamp}
                  </p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Controls */}
            <div className={`mt-6 pt-6 border-t ${isDarkMode ? "border-slate-700" : "border-slate-100"
              }`}>
              {!isConnected ? (
                <Button
                  onClick={startLiveSession}
                  className={`w-full py-4 rounded-full font-bold transition-transform hover:scale-105 ${isDarkMode
                    ? "bg-white text-black hover:bg-slate-100"
                    : "bg-black text-white hover:bg-slate-800"
                    }`}
                  aria-label="Start voice session (or press Space)"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  START SESSION
                </Button>
              ) : (
                <Button
                  onClick={() => stopLiveSession("User Button Click")}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-full font-bold transition-colors"
                  aria-label="End voice session (or press Escape)"
                >
                  <PhoneOff className="w-4 h-4 mr-2" />
                  END SESSION
                </Button>
              )}
              <p className={`text-xs text-center mt-3 ${isDarkMode ? "text-slate-500" : "text-slate-400"
                }`}>
                Keyboard: Space to start • Esc to end
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`p-8 text-center ${isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-white/50 border-slate-200"
        } backdrop-blur-sm border-t transition-colors`}>
        <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
          Ultra-Low Latency Mode • Powered by Gemini Live
        </p>
      </footer>
    </div >
  );
};

export default BlindMode;
