import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type ThemeContextType = {
    isDarkMode: boolean;
    themeTransitionActive: boolean;
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    // Initialize from localStorage or system preference
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("theme");
            if (saved) return saved === "dark";
            return window.matchMedia("(prefers-color-scheme: dark)").matches;
        }
        return false;
    });

    const [themeTransitionActive, setThemeTransitionActive] = useState(false);

    useEffect(() => {
        const root = window.document.documentElement;
        if (isDarkMode) {
            root.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            root.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    }, [isDarkMode]);

    const toggleTheme = () => {
        setThemeTransitionActive(true);
        // Delay actual theme change to sync with animation coverage
        setTimeout(() => {
            setIsDarkMode((prev) => !prev);
            // Clean up animation state after it completes
            setTimeout(() => setThemeTransitionActive(false), 500);
        }, 300); // Wait for circle to cover screen
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, themeTransitionActive, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};
