import { X, TrendingUp, Users, AlertCircle, BookOpen, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/lightswind/chart";
import { Area, AreaChart, Bar, BarChart, Line, LineChart, Pie, PieChart, Cell, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

interface TeacherAnalyticsProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TeacherAnalytics = ({ isOpen, onClose }: TeacherAnalyticsProps) => {
    if (!isOpen) return null;

    // Sample data for teacher analytics

    // 1. Student Engagement Over Time (Line Chart)
    const engagementData = [
        { week: "Week 1", engagement: 65, activeStudents: 18 },
        { week: "Week 2", engagement: 72, activeStudents: 21 },
        { week: "Week 3", engagement: 68, activeStudents: 19 },
        { week: "Week 4", engagement: 85, activeStudents: 24 },
        { week: "Week 5", engagement: 90, activeStudents: 26 },
        { week: "Week 6", engagement: 88, activeStudents: 25 }
    ];

    // 2. Performance Distribution (Bar Chart)
    const performanceData = [
        { range: "90-100%", students: 8 },
        { range: "80-89%", students: 12 },
        { range: "70-79%", students: 6 },
        { range: "60-69%", students: 3 },
        { range: "Below 60%", students: 1 }
    ];

    // 3. Struggle Patterns (Area Chart)
    const struggleData = [
        { topic: "Thermodynamics", struggling: 12, total: 30 },
        { topic: "Calculus", struggling: 8, total: 30 },
        { topic: "Organic Chem", struggling: 15, total: 30 },
        { topic: "Physics Laws", struggling: 5, total: 30 },
        { topic: "History", struggling: 3, total: 30 }
    ];

    // 4. Content Source Distribution (Pie Chart)
    const contentData = [
        { name: "Course Materials", value: 850, color: "#3b82f6" },
        { name: "External Videos", value: 150, color: "#10b981" },
        { name: "Practice Tests", value: 200, color: "#f59e0b" },
        { name: "Peer Discussion", value: 100, color: "#8b5cf6" }
    ];

    // 5. Session Completion Rates (Bar Chart)
    const completionData = [
        { day: "Mon", completed: 85, abandoned: 15 },
        { day: "Tue", completed: 90, abandoned: 10 },
        { day: "Wed", completed: 78, abandoned: 22 },
        { day: "Thu", completed: 92, abandoned: 8 },
        { day: "Fri", completed: 88, abandoned: 12 },
        { day: "Sat", completed: 95, abandoned: 5 },
        { day: "Sun", completed: 80, abandoned: 20 }
    ];

    const chartConfig = {
        engagement: {
            label: "Engagement %",
            color: "hsl(var(--chart-1))",
        },
        activeStudents: {
            label: "Active Students",
            color: "hsl(var(--chart-2))",
        },
        students: {
            label: "Students",
            color: "hsl(var(--chart-3))",
        },
        struggling: {
            label: "Struggling",
            color: "hsl(var(--chart-4))",
        },
        completed: {
            label: "Completed",
            color: "hsl(var(--chart-1))",
        },
        abandoned: {
            label: "Abandoned",
            color: "hsl(var(--chart-5))",
        },
    };

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-card rounded-3xl border border-border shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border p-6 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">Teacher Analytics Dashboard</h2>
                            <p className="text-sm text-muted-foreground">Comprehensive insights into class performance and engagement</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-8">
                        {/* Row 1: Engagement and Performance */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* 1. Student Engagement Trends */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-primary" />
                                    <h3 className="text-lg font-semibold text-foreground">Student Engagement Trends</h3>
                                </div>
                                <div className="bg-background/50 rounded-2xl p-6 border border-border">
                                    <ChartContainer config={chartConfig} className="h-64 w-full">
                                        <LineChart data={engagementData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="week" />
                                            <YAxis />
                                            <ChartTooltip content={<ChartTooltipContent />} />
                                            <Line
                                                type="monotone"
                                                dataKey="engagement"
                                                stroke="hsl(var(--chart-1))"
                                                strokeWidth={2}
                                                dot={{ r: 4 }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="activeStudents"
                                                stroke="hsl(var(--chart-2))"
                                                strokeWidth={2}
                                                dot={{ r: 4 }}
                                            />
                                        </LineChart>
                                    </ChartContainer>
                                </div>
                            </div>

                            {/* 2. Performance Distribution */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-primary" />
                                    <h3 className="text-lg font-semibold text-foreground">Performance Distribution</h3>
                                </div>
                                <div className="bg-background/50 rounded-2xl p-6 border border-border">
                                    <ChartContainer config={chartConfig} className="h-64 w-full">
                                        <BarChart data={performanceData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="range" />
                                            <YAxis />
                                            <ChartTooltip content={<ChartTooltipContent />} />
                                            <Bar dataKey="students" fill="hsl(var(--chart-3))" radius={[8, 8, 0, 0]} />
                                        </BarChart>
                                    </ChartContainer>
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Struggle Patterns and Content Distribution */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* 3. Struggle Patterns by Topic */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-orange-500" />
                                    <h3 className="text-lg font-semibold text-foreground">Struggle Patterns by Topic</h3>
                                </div>
                                <div className="bg-background/50 rounded-2xl p-6 border border-border">
                                    <ChartContainer config={chartConfig} className="h-64 w-full">
                                        <AreaChart data={struggleData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="topic" />
                                            <YAxis />
                                            <ChartTooltip content={<ChartTooltipContent />} />
                                            <Area
                                                type="monotone"
                                                dataKey="struggling"
                                                stroke="hsl(var(--chart-4))"
                                                fill="hsl(var(--chart-4))"
                                                fillOpacity={0.3}
                                            />
                                        </AreaChart>
                                    </ChartContainer>
                                </div>
                            </div>

                            {/* 4. Content Source Distribution */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-primary" />
                                    <h3 className="text-lg font-semibold text-foreground">Content Source Distribution</h3>
                                </div>
                                <div className="bg-background/50 rounded-2xl p-6 border border-border">
                                    <ChartContainer config={chartConfig} className="h-64 w-full">
                                        <PieChart>
                                            <Pie
                                                data={contentData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {contentData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <ChartTooltip content={<ChartTooltipContent />} />
                                        </PieChart>
                                    </ChartContainer>
                                </div>
                            </div>
                        </div>

                        {/* Row 3: Session Completion Rates (Full Width) */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                <h3 className="text-lg font-semibold text-foreground">Session Completion Rates</h3>
                            </div>
                            <div className="bg-background/50 rounded-2xl p-6 border border-border">
                                <ChartContainer config={chartConfig} className="h-80 w-full">
                                    <BarChart data={completionData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="day" />
                                        <YAxis />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Legend />
                                        <Bar dataKey="completed" fill="hsl(var(--chart-1))" radius={[8, 8, 0, 0]} />
                                        <Bar dataKey="abandoned" fill="hsl(var(--chart-5))" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ChartContainer>
                            </div>
                        </div>

                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-2xl p-6 border border-blue-500/20">
                                <p className="text-sm text-muted-foreground mb-1">Avg Engagement</p>
                                <p className="text-3xl font-bold text-foreground">78%</p>
                                <p className="text-xs text-green-500 mt-1">↑ 12% from last month</p>
                            </div>
                            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-2xl p-6 border border-emerald-500/20">
                                <p className="text-sm text-muted-foreground mb-1">Top Performers</p>
                                <p className="text-3xl font-bold text-foreground">8</p>
                                <p className="text-xs text-muted-foreground mt-1">90%+ scores</p>
                            </div>
                            <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-2xl p-6 border border-orange-500/20">
                                <p className="text-sm text-muted-foreground mb-1">Need Support</p>
                                <p className="text-3xl font-bold text-foreground">4</p>
                                <p className="text-xs text-orange-500 mt-1">Require intervention</p>
                            </div>
                            <div className="bg-gradient-to-br from-violet-500/10 to-violet-500/5 rounded-2xl p-6 border border-violet-500/20">
                                <p className="text-sm text-muted-foreground mb-1">Completion Rate</p>
                                <p className="text-3xl font-bold text-foreground">87%</p>
                                <p className="text-xs text-green-500 mt-1">↑ 5% this week</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
