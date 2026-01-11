import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { ZoomIn, ZoomOut, RotateCcw, Move } from 'lucide-react';
import { Button } from './button';

interface MermaidDiagramProps {
    chart: string;
}

mermaid.initialize({
    startOnLoad: true,
    theme: 'base',
    themeVariables: {
        primaryColor: '#8b5cf6', // Violet
        primaryTextColor: '#fff',
        primaryBorderColor: '#7c3aed',
        lineColor: '#64748b',
        secondaryColor: '#f3e8ff',
        tertiaryColor: '#fff',
    },
    securityLevel: 'loose',
});

export default function MermaidDiagram({ chart }: MermaidDiagramProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (containerRef.current) {
            mermaid.contentLoaded();
            const render = async () => {
                try {
                    // Reset zoom on new chart
                    setScale(1);
                    setPosition({ x: 0, y: 0 });

                    containerRef.current!.innerHTML = "";
                    const { svg } = await mermaid.render(`mermaid-${Date.now()}`, chart);
                    containerRef.current!.innerHTML = svg;

                    // Allow SVG to scale to container
                    const svgElement = containerRef.current!.querySelector('svg');
                    if (svgElement) {
                        svgElement.style.width = '100%';
                        svgElement.style.height = '100%';
                        svgElement.style.maxWidth = 'none';
                    }
                } catch (e: any) {
                    console.error("❌ Mermaid Render Error", e);
                    console.error("📉 Failed Chart String:", chart);
                    containerRef.current!.innerHTML = `
                        <div class="text-red-500 text-xs p-2 border border-red-500/20 rounded bg-red-500/5">
                            <p class="font-bold">Failed to render diagram</p>
                            <p class="mt-1 opacity-75">${e.message || "Unknown error"}</p>
                            <pre class="mt-2 text-[10px] overflow-auto max-h-20 bg-black/10 p-1 rounded">${chart.replace(/</g, '&lt;')}</pre>
                        </div>
                    `;
                }
            };
            render();
        }
    }, [chart]);

    const handleWheel = (e: React.WheelEvent) => {
        // Zoom with Ctrl key or if it's a dedicated zoom action
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            e.stopPropagation();

            const rect = e.currentTarget.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const offsetY = e.clientY - rect.top;

            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = Math.min(Math.max(0.2, scale * delta), 5);

            // Calculate new position to keep mouse point stable:
            // The point under the mouse before zoom was: (offsetX - oldPos) / oldScale
            // We want that same point to be at offsetX after zoom: offsetX = newPos + point * newScale
            // So: newPos = offsetX - point * newScale

            const pointX = (offsetX - position.x) / scale;
            const pointY = (offsetY - position.y) / scale;

            const newX = offsetX - pointX * newScale;
            const newY = offsetY - pointY * newScale;

            setScale(newScale);
            setPosition({ x: newX, y: newY });
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    return (
        <div className="flex flex-col gap-2 w-full h-[600px] border rounded-xl overflow-hidden bg-white/50 backdrop-blur-sm relative">

            {/* Controls */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-white/80 p-1 rounded-lg shadow-sm border backdrop-blur-md">
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-black/5" onClick={() => setScale(s => Math.min(s + 0.2, 4))}>
                    <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-black/5" onClick={() => setScale(s => Math.max(s - 0.2, 0.5))}>
                    <ZoomOut className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-black/5" onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); }}>
                    <RotateCcw className="w-4 h-4" />
                </Button>
            </div>

            {/* Instruction overlay */}
            <div className="absolute top-4 left-4 z-10 pointer-events-none opacity-50 text-[10px] bg-white/60 p-1 rounded px-2">
                Scroll/Drag to Navigate
            </div>

            {/* Viewport */}
            <div
                className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <div
                    ref={containerRef}
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        transformOrigin: '0 0',
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                        width: '100%',
                        height: '100%'
                    }}
                    className="flex items-center justify-center p-8 origin-center"
                />
            </div>
        </div>
    );
}
