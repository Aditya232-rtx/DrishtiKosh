import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { ArrowLeft, Mic, MicOff, Upload, Volume2 } from "lucide-react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { auth } from "../lib/auth";

// Audio Configuration
const SAMPLE_RATE = 24000; // Gemini Live prefers 24kHz
const CHUNK_SIZE = 4096;

const BlindMode = () => {
  const userId = auth.getUserId();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); // User speaking
  const [isAiSpeaking, setIsAiSpeaking] = useState(false); // AI speaking status

  const websocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const serverFinishedRef = useRef(false);

  // Queue for playing audio chunks
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextStartTimeRef = useRef(0);

  // --- Audio Output Logic ---
  const playNextChunk = () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsAiSpeaking(false);

      // Auto-close if server is done
      if (serverFinishedRef.current) {
        stopLiveSession();
      }
      return;
    }

    isPlayingRef.current = true;
    setIsAiSpeaking(true);

    const chunk = audioQueueRef.current.shift()!;
    const ctx = audioContextRef.current;

    // Create buffer
    const buffer = ctx.createBuffer(1, chunk.length, SAMPLE_RATE);
    // TypeScript strictness workaround
    buffer.copyToChannel(chunk as any, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    // Schedule playback
    const now = ctx.currentTime;
    // ensure we don't schedule in the past
    const startTime = Math.max(now, nextStartTimeRef.current);
    source.start(startTime);

    // Update next start time
    nextStartTimeRef.current = startTime + buffer.duration;

    source.onended = () => {
      playNextChunk();
    };
  };

  const queueAudioChunk = (data: ArrayBuffer) => {
    // Convert 16-bit PCM to Float32
    const int16 = new Int16Array(data);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }

    audioQueueRef.current.push(float32);

    if (!isPlayingRef.current) {
      if (audioContextRef.current) {
        nextStartTimeRef.current = audioContextRef.current.currentTime;
      }
      playNextChunk();
    }
  };

  // --- WebSocket & Recording Logic ---
  const startLiveSession = async () => {
    try {
      // 1. Initialize Audio Context
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });

      // 2. Connect WebSocket
      // Replace 'http' with 'ws' in base URL
      const wsUrl = api.defaults.baseURL?.replace("http", "ws") || "ws://localhost:8001";
      const ws = new WebSocket(`${wsUrl}/api/blind/live`);
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        startMic();
      };

      ws.onmessage = async (event) => {
        if (event.data instanceof Blob) {
          // Audio chunk from Gemini
          const arrayBuffer = await event.data.arrayBuffer();
          queueAudioChunk(arrayBuffer);
        } else {
          // Handle text control messages
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "turn_complete") {
              console.log("🏁 Server finished turn");
              serverFinishedRef.current = true;
              // If queue is already empty, close now
              if (audioQueueRef.current.length === 0 && !isPlayingRef.current) {
                stopLiveSession();
              }
            }
          } catch (e) {
            // Ignore non-JSON text
          }
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);
        stopMic();
      };

      ws.onerror = (err) => {
        console.error("WebSocket error", err);
      };

    } catch (e) {
      console.error("Failed to start live session", e);
    }
  };

  // Separate stopping mic from closing connection
  const stopListening = () => {
    stopMic();
    // Send end-of-input signal to backend
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({ type: "input_end" }));
    }
  };

  const stopLiveSession = () => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    stopMic();
    setIsConnected(false);
  };

  const startMic = async () => {
    try {
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

        // Convert Float32 to Int16 PCM
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          // Clamp and scale
          let s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        websocketRef.current.send(pcmData.buffer);
      };

      source.connect(processor);
      processor.connect(audioContextRef.current.destination); // Start pipeline

      setIsSpeaking(true);

    } catch (e) {
      console.error("Mic error", e);
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
  };

  // Toggle
  const toggleSession = () => {
    if (isConnected) {
      stopListening();
    } else {
      startLiveSession();
    }
  };

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        toggleSession();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isConnected]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopLiveSession();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors duration-500">
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="p-2 rounded-lg hover:bg-accent transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Logo />
            <span className="bg-red-500/10 text-red-500 text-xs px-2 py-1 rounded-full animate-pulse border border-red-500/20">
              LIVE API
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">

        {/* Dynamic Background */}
        <div className={`absolute inset-0 transition-opacity duration-1000 pointer-events-none ${isAiSpeaking ? "opacity-100" : "opacity-0"}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent animate-pulse" />
        </div>

        {/* Status Indicator */}
        <div className="mb-12 text-center z-10">
          <h2 className="text-4xl font-bold mb-4 tracking-tight">
            {isConnected ? (isAiSpeaking ? "Listening..." : "Listening...") : "Tap to Connect"}
          </h2>
          <p className="text-xl text-muted-foreground">
            {isConnected ? "Say anything. I'm listening." : "Press Space or tap the mic."}
          </p>
        </div>

        {/* Visualizer / Mic Button */}
        <div className="relative z-10">
          {/* Ripple Rings */}
          {isConnected && (
            <>
              <div className="absolute -inset-4 rounded-full bg-primary/20 animate-ping opacity-75 duration-1000" />
              <div className="absolute -inset-12 rounded-full bg-primary/10 animate-ping opacity-50 duration-2000" />
            </>
          )}

          <div
            className={`w-full h-full rounded-2xl flex items-center justify-center transition-all duration-500 cursor-pointer ${isConnected
              ? isAiSpeaking
                ? 'bg-purple-600 animate-pulse' // AI Speaking
                : 'bg-red-500' // Listening/Connected
              : 'bg-neutral-800 hover:bg-neutral-700'
              }`}
            onClick={toggleSession}
          >
            <div className="flex flex-col items-center gap-6">
              {isConnected ? (
                <>
                  <motion.div
                    className="p-8 rounded-full bg-white/10 backdrop-blur-md"
                    animate={{ scale: isAiSpeaking ? [1, 1.1, 1] : 1 }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <Mic className="w-16 h-16 text-white" />
                  </motion.div>
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-2xl font-medium text-white">
                      {isAiSpeaking ? "Drishti is speaking..." : "Listening..."}
                    </p>
                    <p className="text-white/60">Tap to stop</p>
                  </div>
                </>
              ) : (
                <>
                  <motion.div
                    className="p-8 rounded-full bg-white/10 backdrop-blur-md"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <MicOff className="w-16 h-16 text-white" />
                  </motion.div>
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-2xl font-medium text-white">Tap to connect</p>
                    <p className="text-white/60">Press Space or tap the mic</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="p-8 text-center bg-card/50 backdrop-blur-sm border-t border-border">
        <p className="text-sm text-muted-foreground">
          Ultra-Low Latency Mode • Powered by Gemini Live
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Press <kbd className="px-2 py-1 bg-background rounded border border-border mx-1">Space</kbd> to toggle
        </p>
      </footer>
    </div>
  );
};

export default BlindMode;
