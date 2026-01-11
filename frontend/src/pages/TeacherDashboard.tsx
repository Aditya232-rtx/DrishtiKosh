import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { Upload, FileText, User, Activity, Clock, LogOut, Loader2, BarChart3 } from "lucide-react";
import { auth } from "../lib/auth";
import api from "../lib/api";
import { toast } from "@/hooks/use-toast";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";
import { TeacherAnalytics } from "@/components/TeacherAnalytics";

const TeacherDashboard = () => {
    const navigate = useNavigate();
    const userName = auth.getUserName() || "Teacher";
    const [isUploading, setIsUploading] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSignOut = () => {
        auth.logout();
        navigate("/login");
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setIsUploading(true);
            try {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("user_id", auth.getUserId() || "guest");

                await api.post("/api/upload", formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                toast({
                    title: "File Uploaded Successfully",
                    description: `${file.name} has been added to your class materials.`,
                });

            } catch (err: any) {
                console.error("Upload failed", err);
                toast({
                    title: "Upload Failed",
                    description: err.response?.data?.detail || "Could not upload file. Please try again.",
                    variant: "destructive",
                });
            } finally {
                setIsUploading(false);
            }
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Logo />
                        <span className="text-sm font-medium text-muted-foreground ml-2 border-l pl-2 border-border">
                            Teacher Dashboard
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAnalytics(true)}
                            className="hidden sm:flex items-center gap-2"
                        >
                            <BarChart3 className="w-4 h-4" />
                            Analytics
                        </Button>
                        <div className="text-sm text-right hidden sm:block">
                            <p className="font-medium text-foreground">{userName}</p>
                            <p className="text-xs text-muted-foreground">Instructor</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleSignOut}>
                            <LogOut className="w-5 h-5 text-muted-foreground hover:text-red-500 transition-colors" />
                        </Button>
                        <ThemeToggleButton />
                    </div>
                </div>
            </header >

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Section 1: Magic Uploader */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Upload className="w-6 h-6 text-primary" />
                        Class Materials
                    </h2>
                    <div
                        className="bg-card border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors group cursor-pointer relative"
                        onClick={handleUploadClick}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".pdf,.ppt,.pptx,.doc,.docx"
                        />

                        {isUploading ? (
                            <div className="flex flex-col items-center animate-pulse">
                                <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
                                <h3 className="text-lg font-semibold text-foreground">Uploading...</h3>
                                <p className="text-muted-foreground">Processing your material for accessibility</p>
                            </div>
                        ) : (
                            <>
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <FileText className="w-8 h-8 text-primary" />
                                </div>
                                <h3 className="text-lg font-semibold text-foreground mb-1">
                                    Magic Uploader
                                </h3>
                                <p className="text-muted-foreground mb-4">
                                    Drag & drop PDF notes or PPT slides here
                                </p>
                                <Button variant="outline" onClick={(e) => { e.stopPropagation(); handleUploadClick(); }}>
                                    Select Files
                                </Button>
                                <p className="text-xs text-muted-foreground mt-4">
                                    Automatically generates accessible content for blind & disabled students
                                </p>
                            </>
                        )}
                    </div>
                </section>

                {/* Section 2: Live Struggle Heatmap */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Activity className="w-6 h-6 text-orange-500" />
                        Live Struggle Heatmap
                    </h2>
                    <div className="bg-card border border-border rounded-xl p-6">
                        <p className="text-sm text-muted-foreground mb-6">
                            Real-time monitoring of student comprehension status
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {Array.from({ length: 12 }).map((_, i) => {
                                // Mock status: 0=green, 1=yellow, 2=red
                                const status = Math.random() > 0.7 ? 2 : Math.random() > 0.4 ? 1 : 0;
                                const colors = {
                                    0: "bg-green-500/10 border-green-500/20 text-green-700",
                                    1: "bg-yellow-500/10 border-yellow-500/20 text-yellow-700",
                                    2: "bg-red-500/10 border-red-500/20 text-red-700 animate-pulse",
                                };

                                return (
                                    <div
                                        key={i}
                                        className={`p-4 rounded-lg border flex flex-col items-center justify-center gap-2 ${colors[status as keyof typeof colors]}`}
                                    >
                                        <User className="w-8 h-8 opacity-80" />
                                        <span className="text-xs font-semibold">Student {i + 1}</span>
                                        {status === 2 && (
                                            <span className="text-[10px] font-bold bg-background/50 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                                Struggling
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-6 flex gap-6 justify-center text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <span className="text-muted-foreground">On Track</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <span className="text-muted-foreground">Needs Review</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                                <span className="text-muted-foreground">Struggling</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 3: Analytics */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Clock className="w-6 h-6 text-blue-500" />
                        Class Analytics
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-card border border-border rounded-xl p-6 h-64 flex flex-col items-center justify-center relative overflow-hidden">
                            <h3 className="text-sm font-semibold text-muted-foreground absolute top-4 left-4">Focus Time</h3>
                            {/* Mock Chart Visual */}
                            <div className="flex items-end gap-2 h-32 w-full px-8 justify-between opacity-80">
                                {[40, 60, 30, 80, 50, 90, 70].map((h, i) => (
                                    <div key={i} className="w-full bg-blue-500/20 hover:bg-blue-500/40 transition-colors rounded-t-sm relative group">
                                        <div className="absolute bottom-0 w-full bg-blue-500 rounded-t-sm" style={{ height: `${h}%` }}></div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-4">Average focus time: 45m / session</p>
                        </div>

                        <div className="bg-card border border-border rounded-xl p-6 h-64 flex flex-col items-center justify-center relative overflow-hidden">
                            <h3 className="text-sm font-semibold text-muted-foreground absolute top-4 left-4">Content Interaction</h3>
                            <div className="flex items-center justify-center h-full w-full gap-8">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-foreground">85%</div>
                                    <div className="text-xs text-muted-foreground">Course Material</div>
                                </div>
                                <div className="h-16 w-px bg-border"></div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-foreground">15%</div>
                                    <div className="text-xs text-muted-foreground">External Sources</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Teacher Analytics Modal */}
            <TeacherAnalytics isOpen={showAnalytics} onClose={() => setShowAnalytics(false)} />
        </div >
    );
};

export default TeacherDashboard;
