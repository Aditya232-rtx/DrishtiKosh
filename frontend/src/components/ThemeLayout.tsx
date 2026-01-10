import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import { ReactNode } from "react";

export const ThemeLayout = ({ children }: { children: ReactNode }) => {
    const { isDarkMode, themeTransitionActive } = useTheme();

    return (
        <div className={`min-h-screen transition-colors duration-500 ${isDarkMode ? "bg-slate-900 text-white" : "bg-[#F8F9FA] text-slate-800"
            } relative overflow-hidden`}
        >
            {/* Global Circle Spread Animation */}
            <AnimatePresence>
                {themeTransitionActive && (
                    <motion.div
                        className={`fixed inset-0 z-[9999] pointer-events-none ${
                            // The color of the spreading circle should be the TARGET theme color
                            // If we are currently dark (switching to light), circle should be white.
                            // If we are currently light (switching to dark), circle should be slate-900.
                            // Wait, logic in toggleTheme: 
                            // 1. setTransitionActive(true) -> Circle starts growing. 
                            // 2. setTimeout -> Toggle isDarkMode.
                            // So while growing, isDarkMode is still OLD value.
                            // If OLD is dark, we are going to light, so circle must be white.
                            isDarkMode ? "bg-[#F8F9FA]" : "bg-slate-900"
                            }`}
                        initial={{ clipPath: "circle(0% at 95% 5%)" }} // Top-right corner origin
                        animate={{ clipPath: "circle(150% at 95% 5%)" }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                    />
                )}
            </AnimatePresence>

            {children}
        </div>
    );
};
