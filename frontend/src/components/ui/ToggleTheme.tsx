"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";

export const ToggleTheme = ({
    className,
    duration = 400,
    ...props
}: React.ComponentPropsWithoutRef<"button"> & { duration?: number }) => {
    const [isDark, setIsDark] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Sync state with DOM and initialize theme
    useEffect(() => {
        // Initialize theme from localStorage or default to dark
        const savedTheme = localStorage.getItem("theme");
        const prefersDark = savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);

        if (prefersDark) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }

        const updateTheme = () => setIsDark(document.documentElement.classList.contains("dark"));
        updateTheme();

        const observer = new MutationObserver(updateTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => observer.disconnect();
    }, []);

    const toggleTheme = useCallback(async () => {
        if (!buttonRef.current) return;

        // Check if View Transition API is supported
        if (!document.startViewTransition) {
            // Fallback for browsers that don't support View Transitions
            const newTheme = !isDark;
            setIsDark(newTheme);
            document.documentElement.classList.toggle("dark");
            localStorage.setItem("theme", newTheme ? "dark" : "light");
            return;
        }

        // 1. View Transition
        await document.startViewTransition(() => {
            flushSync(() => {
                const newTheme = !isDark;
                setIsDark(newTheme);
                document.documentElement.classList.toggle("dark");
                localStorage.setItem("theme", newTheme ? "dark" : "light");
            });
        }).ready;

        // 2. Geometry for Circle Spread
        const { top, left, width, height } = buttonRef.current.getBoundingClientRect();
        const x = left + width / 2;
        const y = top + height / 2;
        const maxRadius = Math.hypot(
            Math.max(left, window.innerWidth - left),
            Math.max(top, window.innerHeight - top)
        );

        // 3. Execute ONLY Circle Spread Animation
        document.documentElement.animate(
            {
                clipPath: [
                    `circle(0px at ${x}px ${y}px)`,
                    `circle(${maxRadius}px at ${x}px ${y}px)`,
                ],
            },
            {
                duration,
                easing: "ease-in-out",
                pseudoElement: "::view-transition-new(root)",
            }
        );
    }, [isDark, duration]);

    return (
        <>
            <button
                ref={buttonRef}
                onClick={toggleTheme}
                className={cn(
                    "p-2 rounded-full transition-colors duration-300 hover:bg-gray-800",
                    isDark ? "hover:text-amber-400" : "hover:text-blue-500",
                    className
                )}
                aria-label="Toggle theme"
                {...props}
            >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Disable default fade so custom clip-path works */}
            <style
                dangerouslySetInnerHTML={{
                    __html: `
                        ::view-transition-old(root),
                        ::view-transition-new(root) {
                            animation: none;
                            mix-blend-mode: normal;
                        }
                    `,
                }}
            />
        </>
    );
};
