import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { auth } from "../lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Logo from "@/components/Logo";
import {
  Plus,
  History,
  Search,
  MessageSquare,
  LogOut,
  Upload,
  Bell,
  User,
  Trophy,
  Flame,
  Target,
  X,
  BookOpen,
  Brain,
  TrendingUp,
  Clock,
  Award,
  Settings
} from "lucide-react";

import { ThemeToggleButton } from "@/components/ThemeToggleButton";

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [inputMessage, setInputMessage] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [streak, setStreak] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);

  const [learningHistory, setLearningHistory] = useState<any[]>([]);
  const [uploadContext, setUploadContext] = useState<{ uri: string, mime: string, name: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [message, setMessage] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [mode, setMode] = useState<"adhd" | "blind">("adhd");

  const fileInputRef = useRef<HTMLInputElement>(null);
  // const { sendMessage, loading } = useChat(); // Removed inline chat
  const userId = auth.getUserId();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const res = await api.get("/api/auth/me", {
          params: { user_id: auth.getUserId() }
        });

        const user = res.data;
        setUserName(user.full_name || user.username);
        setUserEmail(user.email);
        setUserType(user.learning_preference || "student");

        // Sync fresh data to session
        auth.setSession(auth.getToken() || "", {
          id: user.id,
          name: user.full_name || user.username,
          type: user.learning_preference
        });
      } catch (e) {
        console.error("Failed to fetch user profile", e);
        // Fallback to local storage using standardized auth helper
        setUserName(auth.getUserName());
        setUserType(auth.getUserType());
        // Email is not critical, can stay null if not found
      } finally {
        setIsLoading(false);
      }
    };


    fetchUserProfile();
  }, [navigate]);

  useEffect(() => {
    const fetchHistory = async () => {
      const userId = auth.getUserId();
      if (!userId) return;

      try {
        const res = await api.get("/api/learn/history", {
          params: { user_id: userId }
        });
        setChatHistory(res.data);
      } catch (e) {
        console.error("Failed to fetch history", e);
      }
    };
    fetchHistory();
  }, []); // Fetch history on mount

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("File uploaded:", file.name);
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("user_id", userId || "guest");

        const res = await api.post("/api/upload", formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const { uri, mime_type, name } = res.data;
        setUploadContext({ uri, mime: mime_type, name });

      } catch (err) {
        console.error("Upload failed", err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleNewSession = () => {
    // If we have upload context, save it before navigation
    if (uploadContext) {
      localStorage.setItem("pending_context_uri", uploadContext.uri);
      localStorage.setItem("pending_context_mime", uploadContext.mime);
      localStorage.setItem("pending_context_name", uploadContext.name);
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage && !uploadContext) return;

    // Detect URL in message
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urlMatch = trimmedMessage.match(urlRegex);

    // Determine Navigation
    const modeParam = `&mode=${mode}`;

    if (userType === "blind") {
      if (uploadContext) {
        navigate(`/blind?pending_context=true${trimmedMessage ? `&topic=${encodeURIComponent(trimmedMessage)}` : ""}`);
      } else {
        navigate(`/blind${trimmedMessage ? `?topic=${encodeURIComponent(trimmedMessage)}` : ""}`);
      }
      return;
    }

    if (urlMatch) {
      // Extracted URL logic
      const extractedUrl = urlMatch[0];
      const instruction = trimmedMessage.replace(extractedUrl, "").trim();

      const encodedUrl = encodeURIComponent(extractedUrl);
      const encodedInstruction = instruction ? `&instruction=${encodeURIComponent(instruction)}` : "";

      // localStorage.setItem("pending_context_text", uploadContext ? uploadContext.text : ""); // Removed legacy

      navigate(`/learn?url=${encodedUrl}${encodedInstruction}${modeParam}${uploadContext ? "&pending_context=true" : ""}`);
    } else {
      // Topic logic
      const encodedTopic = encodeURIComponent(trimmedMessage);
      if (uploadContext) {
        navigate(`/learn?pending_context=true${trimmedMessage ? `&topic=${encodedTopic}` : ""}${modeParam}`);
      } else {
        navigate(`/learn?topic=${encodedTopic}${modeParam}`);
      }
    }
  };



  const handleSignOut = () => {
    auth.logout();
    navigate("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-72 bg-card border-r border-border flex flex-col sticky top-0 h-screen">
        <div className="p-4 border-b border-border">
          <Logo />
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <Button
            variant="hero"
            className="w-full justify-start gap-2"
            onClick={handleNewSession}
          >
            <Plus className="w-4 h-4" />
            New Learning Session
          </Button>
        </div>

        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* History */}
        <div className="flex-1 overflow-y-auto px-2 custom-scrollbar">
          <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
            <History className="w-4 h-4" />
            History
          </div>
          <div className="space-y-1 pb-4">
            {(isHistoryExpanded ? chatHistory : chatHistory.slice(0, 5)).map((chat) => (
              <button
                key={chat.id}
                onClick={() => {
                  if (chat.type === "blind") {
                    navigate(`/blind?sessionId=${chat.id}`);
                  } else {
                    navigate(`/learn?sessionId=${chat.id}`);
                  }
                }}
                className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {chat.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {chat.preview}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {chat.date}
                    </p>
                  </div>
                </div>
              </button>
            ))}

            {chatHistory.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              >
                {isHistoryExpanded ? "Show Less" : `Show ${chatHistory.length - 5} More`}
              </Button>
            )}

            {chatHistory.length === 0 && (
              <div className="px-4 py-8 text-center text-muted-foreground text-xs">
                No history yet
              </div>
            )}
          </div>
        </div>

        {/* User Actions */}
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {/* Header Area with Profile Toggle */}
          <div className="flex items-center justify-between mb-8">
            <div className="animate-fade-in">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Welcome Back, {userName}! 👋
              </h1>
              <p className="text-muted-foreground">
                Continue where you left off or start a new learning session
              </p>
            </div>

            <div className="flex gap-4 items-center">
              <ThemeToggleButton />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
              >
                <User className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Recent Sessions */}
          <div className="mb-12">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Recent Sessions
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {chatHistory.slice(0, 3).map((chat, index) => (
                <button
                  key={chat.id}
                  onClick={() => navigate(`/learn?sessionId=${chat.id}`)}
                  className="bg-card p-6 rounded-2xl border border-border hover:border-primary/50 hover:shadow-lg transition-all text-left animate-fade-in"
                  style={{ animationDelay: `${index * 0.1} s` }}
                >
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        {chat.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {chat.preview}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {chat.date}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {chatHistory.length === 0 && (
              <div className="text-center text-muted-foreground py-8 bg-card/50 rounded-2xl border border-border/50 border-dashed">
                No recent sessions found. Start a new learning journey above!
              </div>
            )}
          </div>

          {/* Quick Start */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-8 border border-primary/20">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Ask Anything
            </h2>
            <p className="text-muted-foreground mb-6">
              Start a new learning session by asking a question or entering a topic
            </p>
            <div className="flex gap-3 items-center">
              {uploadContext && (
                <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20 text-xs text-primary animate-in fade-in slide-in-from-left-2">
                  <span className="truncate max-w-[100px]">{uploadContext.name}</span>
                  <button
                    onClick={() => setUploadContext(null)}
                    className="hover:bg-primary/20 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 shrink-0 relative"
                onClick={handleUploadClick}
              >
                <Upload className="w-5 h-5" />
                {isUploading && (
                  <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-md">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <Input
                placeholder="What would you like to learn today?"
                className="h-12 text-base"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNewSession()}
              />
              <Button variant="hero" size="lg" onClick={handleNewSession} disabled={isUploading}>
                <Plus className="w-5 h-5 mr-2" />
                Start
              </Button>
            </div>
            {/* Response Section Removed - Redirects to LearnMode */}

          </div>
        </div>
      </main>

      {/* Right Profile Sidebar */}
      <aside
        className={`
          fixed top-0 right-0 h-full w-80 bg-background/95 backdrop-blur-md border-l border-border p-6 
          flex flex-col gap-6 transition-transform duration-300 z-50 shadow-2xl
          ${isProfileOpen ? "translate-x-0" : "translate-x-full"}
`}
      >
        {/* Close Button */}
        <div className="flex justify-end mb-2">
          <Button variant="ghost" size="icon" onClick={() => setIsProfileOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* User Profile Header */}
        <div className="flex flex-col items-center text-center p-6 bg-card rounded-3xl border border-border shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 ring-4 ring-background shadow-xl">
            <User className="w-8 h-8 text-primary" />
          </div>

          <h3 className="font-bold text-foreground text-xl mb-1">{userName || "Guest User"}</h3>
          <p className="text-sm text-muted-foreground mb-3">{userEmail || "No email linked"}</p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 capitalize">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            {userType || "Student"} Mode
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-4">
          <h4 className="font-medium text-foreground">Learning Stats</h4>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-orange-500/10 rounded-2xl border border-orange-500/20 flex flex-col items-center justify-center text-center">
              <div className="mb-2 p-2 bg-background rounded-full shadow-sm">
                <Flame className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-xl font-bold text-foreground">{streak?.current_streak || 0}</div>
              <div className="text-xs text-muted-foreground font-medium">Day Streak</div>
            </div>

            <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 flex flex-col items-center justify-center text-center">
              <div className="mb-2 p-2 bg-background rounded-full shadow-sm">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-xl font-bold text-foreground">{learningHistory.length}</div>
              <div className="text-xs text-muted-foreground font-medium">Sessions</div>
            </div>

            <div className="p-4 bg-green-500/10 rounded-2xl border border-green-500/20 flex flex-col items-center justify-center text-center">
              <div className="mb-2 p-2 bg-background rounded-full shadow-sm">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-xl font-bold text-foreground">{goals.length}</div>
              <div className="text-xs text-muted-foreground font-medium">Goals</div>
            </div>

            <div className="p-4 bg-yellow-500/10 rounded-2xl border border-yellow-500/20 flex flex-col items-center justify-center text-center">
              <div className="mb-2 p-2 bg-background rounded-full shadow-sm">
                <Trophy className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="text-xl font-bold text-foreground">{achievements.length}</div>
              <div className="text-xs text-muted-foreground font-medium">Trophies</div>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-foreground">Achievements</h4>
            <Button variant="link" className="h-auto p-0 text-xs">View All</Button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
              <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Fast Learner</p>
                <p className="text-xs text-muted-foreground">Completed 5 lessons</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
              <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Science Whiz</p>
                <p className="text-xs text-muted-foreground">Aced Physics test</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile when sidebar is open */}
      {isProfileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsProfileOpen(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
