import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Logo from "@/components/Logo";
import {
  ArrowLeft,
  Plus,
  FileText,
  Sparkles,
  ChevronRight,
  Download,
} from "lucide-react";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";

import api from "@/lib/api";

const Flowchart = () => {
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic State
  const [nodes, setNodes] = useState([]); // Empty initially
  const [notes, setNotes] = useState([]);
  const [summary, setSummary] = useState("Enter a topic to generate a flowchart.");

  const handleGenerate = async () => {
    if (!topic) return;
    setIsLoading(true);
    try {
      const res = await api.post("/learn/flowchart", { topic });
      setNodes(res.data.nodes);
      setNotes(res.data.notes);
      setSummary(res.data.summary);
    } catch (e) {
      console.error("Failed to generate flowchart", e);
      alert("Failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to render dynamic nodes (replacing hardcoded structure)
  // For simplicity, we might just render levels or a list if visualisation library isn't fully set up,
  // but let's try to map the data to the existing DOM structure roughly or list it.


  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/learn"
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Logo />
            <span className="text-muted-foreground">/ Open Notebook</span>
            <ThemeToggleButton />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="hero">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex">
        {/* Left Sidebar - Notes */}
        <aside className="w-72 bg-card border-r border-border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Notes</h3>
            <Button variant="ghost" size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {notes.map((note) => (
              <button
                key={note.id}
                className="w-full text-left p-3 rounded-lg bg-background hover:bg-accent border border-border transition-colors"
              >
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      {note.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {note.content}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Flowchart Canvas */}
        <div className="flex-1 p-8 overflow-auto">
          <div className="mb-6">
            <div className="flex gap-2 max-w-xl">
              <Input
                placeholder="Enter a topic to generate flowchart..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="h-12"
              />
              <Button variant="default" size="lg" onClick={handleGenerate} disabled={isLoading}>
                {isLoading ? "Generating..." : "Generate"}
              </Button>
            </div>
          </div>

          {/* Simple Flowchart Visualization */}
          <div className="bg-card rounded-2xl border border-border p-8 min-h-[500px]">
            <div className="flex flex-col items-center">
              {/* Root Node */}
              <div className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold shadow-lg">
                Photosynthesis
              </div>

              {/* Connector */}
              <div className="w-0.5 h-8 bg-border" />

              {/* Level 1 Nodes */}
              <div className="flex items-start gap-16">
                <div className="flex flex-col items-center">
                  <div className="bg-card border-2 border-primary px-5 py-2.5 rounded-xl font-medium text-foreground">
                    Light Reactions
                  </div>
                  <div className="w-0.5 h-6 bg-border" />
                  <div className="flex gap-4">
                    <div className="bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm">
                      Thylakoid
                    </div>
                    <div className="bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm">
                      ATP
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="bg-card border-2 border-primary px-5 py-2.5 rounded-xl font-medium text-foreground">
                    Dark Reactions
                  </div>
                  <div className="w-0.5 h-6 bg-border" />
                  <div className="flex gap-4">
                    <div className="bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm">
                      Calvin Cycle
                    </div>
                    <div className="bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm">
                      Glucose
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-12 flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-primary rounded" />
                <span>Main Topic</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary rounded" />
                <span>Sub Topics</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-accent rounded" />
                <span>Details</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - AI Summary */}
        <aside className="w-80 bg-card border-l border-border p-4">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            AI Summary
          </h3>
          <div className="bg-background rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {summary}
            </p>
          </div>

          <div className="mt-6">
            <h4 className="font-medium text-foreground mb-3">Quick Actions</h4>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-between">
                Add more details
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between">
                Simplify content
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between">
                Generate quiz
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default Flowchart;
