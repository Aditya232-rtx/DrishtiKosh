import { X, TrendingUp, Clock, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/lightswind/chart";
import { Area, AreaChart, Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts";

interface AnalyticsProps {
    isOpen: boolean;
    onClose: () => void;
}

export const Analytics = ({ isOpen, onClose }: AnalyticsProps) => {
    if (!isOpen) return null;

    // Sample data for adhdy@mail.com
    const focusSpanData = [
        { date: "Mon", minutes: 45 },
        { date: "Tue", minutes: 60 },
        { date: "Wed", minutes: 30 },
        { date: "Thu", minutes: 75 },
        { date: "Fri", minutes: 90 },
        { date: "Sat", minutes: 120 },
        { date: "Sun", minutes: 85 }
    ];

    const hardworkData = [
        { subject: "Physics", intensity: 8 },
        { subject: "Chemistry", intensity: 6 },
        { subject: "History", intensity: 4 }
    ];

    const timelineData = [
        { week: "Week 1", sessions: 5 },
        { week: "Week 2", sessions: 7 },
        { week: "Week 3", sessions: 6 },
        { week: "Week 4", sessions: 9 }
    ];

    const chartConfig = {
        minutes: {
            label: "Focus Time",
            color: "hsl(var(--chart-1))",
        },
        intensity: {
            label: "Intensity",
            color: "hsl(var(--chart-2))",
        },
        sessions: {
            label: "Sessions",
            color: "hsl(var(--chart-3))",
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
                <div className="bg-card rounded-3xl border border-border shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border p-6 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">Analytics Dashboard</h2>
                            <p className="text-sm text-muted-foreground">Your learning insights and progress</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-8">
                        {/* Focus Span Chart */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-semibold text-foreground">Focus Span</h3>
                            </div>
                            <div className="bg-background/50 rounded-2xl p-6 border border-border">
                                <ChartContainer config={chartConfig} className="h-64 w-full">
                                    <AreaChart data={focusSpanData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Area
                                            type="monotone"
                                            dataKey="minutes"
                                            stroke="hsl(var(--chart-1))"
                                            fill="hsl(var(--chart-1))"
                                            fillOpacity={0.2}
                                        />
                                    </AreaChart>
                                </ChartContainer>
                            </div>
                        </div>

                        {/* Hardwork Intensity Chart */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-semibold text-foreground">Hardwork Intensity</h3>
                            </div>
                            <div className="bg-background/50 rounded-2xl p-6 border border-border">
                                <ChartContainer config={chartConfig} className="h-64 w-full">
                                    <BarChart data={hardworkData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="subject" />
                                        <YAxis />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Bar dataKey="intensity" fill="hsl(var(--chart-2))" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ChartContainer>
                            </div>
                        </div>

                        {/* Timeline Chart */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Target className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-semibold text-foreground">Study Timeline</h3>
                            </div>
                            <div className="bg-background/50 rounded-2xl p-6 border border-border">
                                <ChartContainer config={chartConfig} className="h-64 w-full">
                                    <LineChart data={timelineData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="week" />
                                        <YAxis />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Line
                                            type="monotone"
                                            dataKey="sessions"
                                            stroke="hsl(var(--chart-3))"
                                            strokeWidth={2}
                                            dot={{ r: 4 }}
                                        />
                                    </LineChart>
                                </ChartContainer>
                            </div>
                        </div>

                        {/* Summary Stats */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-2xl p-6 border border-blue-500/20">
                                <p className="text-sm text-muted-foreground mb-1">Total Focus Time</p>
                                <p className="text-3xl font-bold text-foreground">505 min</p>
                                <p className="text-xs text-muted-foreground mt-1">This week</p>
                            </div>
                            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-2xl p-6 border border-emerald-500/20">
                                <p className="text-sm text-muted-foreground mb-1">Avg Intensity</p>
                                <p className="text-3xl font-bold text-foreground">6/10</p>
                                <p className="text-xs text-muted-foreground mt-1">Across subjects</p>
                            </div>
                            <div className="bg-gradient-to-br from-violet-500/10 to-violet-500/5 rounded-2xl p-6 border border-violet-500/20">
                                <p className="text-sm text-muted-foreground mb-1">Weekly Growth</p>
                                <p className="text-3xl font-bold text-foreground">+80%</p>
                                <p className="text-xs text-muted-foreground mt-1">From week 1</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
