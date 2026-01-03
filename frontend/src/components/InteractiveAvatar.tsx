import { useEffect, useRef, useState } from "react";

const InteractiveAvatar = () => {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            setMousePos({
                x: event.clientX - centerX,
                y: event.clientY - centerY
            });
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    const calculateEyeOffset = (sensitivity = 10) => {
        const maxOffset = 8; // Limit movement
        const x = Math.min(Math.max(mousePos.x / sensitivity, -maxOffset), maxOffset);
        const y = Math.min(Math.max(mousePos.y / sensitivity, -maxOffset), maxOffset);
        return { x, y };
    };

    // Calculate eye offset
    const eyeOffset = calculateEyeOffset(30);

    return (
        <div
            ref={containerRef}
            className="w-full h-48 bg-blue-50/50 rounded-3xl border border-blue-100 flex items-center justify-center relative overflow-hidden group shadow-inner"
        >
            {/* Background Decor */}
            <div className="absolute top-0 w-full h-full bg-[radial-gradient(circle_at_center,_white_0%,_transparent_70%)] opacity-50"></div>

            {/* Character SVG */}
            <svg viewBox="0 0 200 200" className="w-40 h-40 drop-shadow-xl transition-transform hover:scale-105 duration-300">
                {/* 1. Body/Shirt (Yellow) */}
                <path d="M60 160 Q100 180 140 160 L140 200 L60 200 Z" fill="#FCD34D" /> {/* Yellow Shirt */}
                <path d="M75 160 L75 200 M125 160 L125 200" stroke="#F59E0B" strokeWidth="2" opacity="0.5" /> {/* Suspenders/Detail */}

                {/* 2. Neck */}
                <rect x="85" y="140" width="30" height="20" fill="#FFDFC4" />

                {/* 3. Head (Face Shape) */}
                <ellipse cx="100" cy="100" rx="45" ry="50" fill="#FFDFC4" /> {/* Skin Tone */}

                {/* 4. Cheeks (Rosy) */}
                <circle cx="75" cy="115" r="6" fill="#FF9A9A" opacity="0.4" />
                <circle cx="125" cy="115" r="6" fill="#FF9A9A" opacity="0.4" />

                {/* 5. Ears */}
                <circle cx="55" cy="105" r="8" fill="#FFDFC4" />
                <circle cx="145" cy="105" r="8" fill="#FFDFC4" />

                {/* 6. Hair (Brown, Messy) */}
                <path d="M50 80 Q60 40 100 40 Q140 40 150 80 Q155 90 150 100 C160 80 160 50 130 30 Q100 10 70 30 C40 50 40 80 50 100 Q45 90 50 80 Z" fill="#8B4513" />
                <path d="M60 50 Q80 30 100 55 Q120 30 140 50" fill="none" stroke="#8B4513" strokeWidth="3" opacity="0.5" strokeLinecap="round" />

                {/* 7. Mouth (Small smile) */}
                <path d="M90 135 Q100 140 110 135" fill="none" stroke="#C46D5E" strokeWidth="3" strokeLinecap="round" />

                {/* 8. Headphones (Blue with glowing ring) */}
                <path d="M45 100 Q40 60 100 60 Q160 60 155 100" fill="none" stroke="#1E3A8A" strokeWidth="8" strokeLinecap="round" /> {/* Band */}

                {/* Left Ear Cup */}
                <rect x="35" y="85" width="20" height="40" rx="10" fill="#1E3A8A" />
                <rect x="38" y="90" width="14" height="30" rx="5" fill="#3B82F6" /> {/* Inner Detail */}
                <circle cx="45" cy="105" r="5" fill="#60A5FA" className="animate-pulse" /> {/* Glow */}

                {/* Right Ear Cup */}
                <rect x="145" y="85" width="20" height="40" rx="10" fill="#1E3A8A" />
                <rect x="148" y="90" width="14" height="30" rx="5" fill="#3B82F6" />
                <circle cx="155" cy="105" r="5" fill="#60A5FA" className="animate-pulse" />

                {/* 9. Eyes (Interactive) */}
                <g transform={`translate(${eyeOffset.x}, ${eyeOffset.y})`} className="transition-transform duration-75 ease-out">
                    {/* Left Eye */}
                    <g>
                        <ellipse cx="80" cy="95" rx="10" ry="12" fill="white" stroke="#E5E7EB" strokeWidth="1" />
                        <circle cx="80" cy="95" r="6" fill="#3B82F6" /> {/* Iris */}
                        <circle cx="80" cy="95" r="3" fill="#1E3A8A" /> {/* Pupil */}
                        <circle cx="82" cy="92" r="1.5" fill="white" opacity="0.8" /> {/* Highlight */}
                    </g>
                    {/* Right Eye */}
                    <g>
                        <ellipse cx="120" cy="95" rx="10" ry="12" fill="white" stroke="#E5E7EB" strokeWidth="1" />
                        <circle cx="120" cy="95" r="6" fill="#3B82F6" />
                        <circle cx="120" cy="95" r="3" fill="#1E3A8A" />
                        <circle cx="122" cy="92" r="1.5" fill="white" opacity="0.8" />
                    </g>
                </g>

                {/* 10. Freckles */}
                <circle cx="70" cy="118" r="0.5" fill="#C46D5E" />
                <circle cx="78" cy="116" r="0.5" fill="#C46D5E" />
                <circle cx="122" cy="118" r="0.5" fill="#C46D5E" />
                <circle cx="130" cy="116" r="0.5" fill="#C46D5E" />
            </svg>

            <div className="absolute bottom-2 font-mono text-[10px] text-blue-400 opacity-60">
                LISTENING...
            </div>
        </div>
    );
};

export default InteractiveAvatar;
