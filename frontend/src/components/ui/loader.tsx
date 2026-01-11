import React from "react";

interface LoaderFiveProps {
    text?: string;
}

export const LoaderFive: React.FC<LoaderFiveProps> = ({ text = "Loading..." }) => {
    return (
        <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="relative inline-block">
                <style>{`
                    @keyframes shimmer {
                        0% {
                            background-position: -200% 0;
                        }
                        100% {
                            background-position: 200% 0;
                        }
                    }
                    @keyframes bounce {
                        0%, 100% {
                            transform: translateY(0);
                        }
                        50% {
                            transform: translateY(-8px);
                        }
                    }
                    .shimmer-text {
                        background: linear-gradient(
                            90deg,
                            #9CA3AF 0%,
                            #9CA3AF 40%,
                            #FFFFFF 50%,
                            #9CA3AF 60%,
                            #9CA3AF 100%
                        );
                        background-size: 200% 100%;
                        background-clip: text;
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        animation: shimmer 2s linear infinite, bounce 1.5s ease-in-out infinite;
                    }
                `}</style>
                <p className="shimmer-text text-lg font-semibold tracking-wide">
                    {text}
                </p>
            </div>
        </div>
    );
};
