import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Logo from "@/components/Logo";
import {
  Plus,
  History,
  Search,
  MessageSquare,
  ChevronRight,
  Eye,
  Ear,
  Brain,
  LogOut,
} from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

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

  const learningModes = [
    {
      id: "blind",
      title: "Voice Learning",
      description: "Voice-operated interface for visually impaired",
      icon: Eye,
      path: "/blind",
    },
    {
      id: "deaf",
      title: "Visual Learning",
      description: "Caption-based learning for hearing impaired",
      icon: Ear,
      path: "/learn?mode=deaf",
    },
    {
      id: "adhd",
      title: "Focus Learning",
      description: "Enhanced focus mode for ADHD learners",
      icon: Brain,
      path: "/learn?mode=adhd",
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
            onClick={() => navigate("/learn")}
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
          <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-12 animate-fade-in">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Welcome Back! 👋
            </h1>
            <p className="text-muted-foreground">
              Choose a learning mode or continue where you left off
            </p>
          </div>

          {/* Learning Modes */}
          <div className="mb-12">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Learning Modes
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {learningModes.map((mode, index) => (
                <Link
                  key={mode.id}
                  to={mode.path}
                  className="bg-card p-6 rounded-2xl border border-border hover:border-primary/50 hover:shadow-lg transition-all group animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <mode.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">
                    {mode.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {mode.description}
                  </p>
                  <div className="flex items-center text-primary text-sm font-medium">
                    Start Learning
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
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
              <Input
                placeholder="What would you like to learn today?"
                className="h-12 text-base"
              />
              <Button variant="hero" size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Start
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
