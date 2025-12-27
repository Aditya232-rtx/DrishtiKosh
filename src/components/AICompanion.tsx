import { useState, useEffect } from "react";

interface AICompanionProps {
  size?: number;
}

const AICompanion = ({ size = 80 }: AICompanionProps) => {
  const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth - 60;
      const centerY = window.innerHeight / 2;

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;

      const maxOffset = 5;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const normalizedX = (deltaX / distance) * Math.min(maxOffset, distance / 50);
      const normalizedY = (deltaY / distance) * Math.min(maxOffset, distance / 50);

      setEyePosition({
        x: isNaN(normalizedX) ? 0 : normalizedX,
        y: isNaN(normalizedY) ? 0 : normalizedY,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Face background */}
      <div
        className="absolute inset-0 rounded-full bg-gradient-to-b from-primary/30 to-primary/50 border-2 border-primary/20"
        style={{ boxShadow: "0 0 30px hsl(200 98% 39% / 0.2)" }}
      />

      {/* Eyes container */}
      <div className="absolute inset-0 flex items-center justify-center gap-3">
        {/* Left Eye */}
        <div className="relative w-5 h-7 bg-card rounded-full overflow-hidden border border-border">
          <div
            className="absolute w-3 h-3 bg-foreground rounded-full animate-blink"
            style={{
              left: `calc(50% + ${eyePosition.x}px - 6px)`,
              top: `calc(50% + ${eyePosition.y}px - 6px)`,
              transition: "left 0.1s, top 0.1s",
            }}
          />
        </div>

        {/* Right Eye */}
        <div className="relative w-5 h-7 bg-card rounded-full overflow-hidden border border-border">
          <div
            className="absolute w-3 h-3 bg-foreground rounded-full animate-blink"
            style={{
              left: `calc(50% + ${eyePosition.x}px - 6px)`,
              top: `calc(50% + ${eyePosition.y}px - 6px)`,
              transition: "left 0.1s, top 0.1s",
            }}
          />
        </div>
      </div>

      {/* Small smile */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-6 h-3 border-b-2 border-foreground/50 rounded-b-full" />

      {/* Glow effect */}
      <div className="absolute -inset-2 rounded-full bg-primary/10 blur-xl -z-10" />

      {/* Label */}
      <p className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap">
        AI Helper
      </p>
    </div>
  );
};

export default AICompanion;
