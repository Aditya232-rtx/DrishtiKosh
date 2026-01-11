import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen } from "lucide-react";

interface CourseCardProps {
    title: string;
    description: string;
    progress: number;
    icon?: string;
}

export const CourseCard = ({ title, description, progress, icon }: CourseCardProps) => {
    return (
        <button
            className="bg-card p-6 rounded-2xl border border-border hover:border-primary/50 hover:shadow-lg transition-all text-left w-full"
        >
            <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
            </div>
            <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
            </div>
        </button>
    );
};
