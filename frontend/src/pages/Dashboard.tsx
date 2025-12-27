import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [userType, setUserType] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Student User");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Get user details from localStorage
    const storedUserType = localStorage.getItem("userType");
    const storedUserName = localStorage.getItem("userName");

    setUserType(storedUserType);
    if (storedUserName) {
      setUserName(storedUserName);
    }
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("File uploaded:", file.name);
      // Handle the file upload logic here
    }
  };

  const handleNewSession = () => {
    // Navigate to learn page with user's mode
    if (userType === "deaf") {
      navigate("/learn?mode=deaf");
    } else if (userType === "adhd") {
      navigate("/learn?mode=adhd");
    } else {
      navigate("/learn");
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("userType");
    navigate("/");
  };

  // Mock chat history
  const chatHistory = [
    {
      id: 1,
      title: "Introduction to Physics",
      date: "Today",
      preview: "Learned about Newton's laws of motion...",
    },
    {
      id: 2,
      title: "World History - Ancient Civilizations",
      date: "Yesterday",
      preview: "Explored the Egyptian pyramids...",
    },
    {
      id: 3,
      title: "Mathematics - Algebra Basics",
      date: "2 days ago",
      preview: "Solved quadratic equations...",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-72 bg-card border-r border-border flex flex-col">
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
        <div className="flex-1 overflow-y-auto px-2">
          <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
            <History className="w-4 h-4" />
            History
          </div>
          <div className="space-y-1">
            {chatHistory.map((chat) => (
              <button
                key={chat.id}
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

            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              <User className="w-5 h-5" />
            </Button>
          </div>

          {/* Recent Sessions */}
          <div className="mb-12">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Recent Sessions
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {chatHistory.map((chat, index) => (
                <button
                  key={chat.id}
                  onClick={handleNewSession}
                  className="bg-card p-6 rounded-2xl border border-border hover:border-primary/50 hover:shadow-lg transition-all text-left animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
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
          </div>

          {/* Quick Start */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-8 border border-primary/20">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Ask Anything
            </h2>
            <p className="text-muted-foreground mb-6">
              Start a new learning session by asking a question or entering a topic
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 shrink-0"
                onClick={handleUploadClick}
              >
                <Upload className="w-5 h-5" />
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
              />
              <Button variant="hero" size="lg" onClick={handleNewSession}>
                <Plus className="w-5 h-5 mr-2" />
                Start
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Right Profile Sidebar */}
      <aside
        className={`
          fixed top-0 right-0 h-full w-80 bg-card border-l border-border p-6 
          flex flex-col gap-8 transition-transform duration-300 z-50 shadow-2xl
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
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{userName}</h3>
            <p className="text-sm text-muted-foreground capitalize">{userType || "Student"} Plan</p>
          </div>
          <Button variant="ghost" size="icon">
            <Bell className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>

        {/* Stats */}
        <div className="space-y-4">
          <h4 className="font-medium text-foreground">Learning Stats</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-background p-3 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">Streak</span>
              </div>
              <p className="text-lg font-bold">5 Days</p>
            </div>
            <div className="bg-background p-3 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Goal</span>
              </div>
              <p className="text-lg font-bold">85%</p>
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
