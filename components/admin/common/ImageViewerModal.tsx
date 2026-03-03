import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-react';

interface ImageViewerModalProps {
    src: string | null;
    onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ src, onClose }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // Reset scale and position when opening a new image
    useEffect(() => {
        if (src) {
            setScale(1);
            setPosition({ x: 0, y: 0 });
        }
    }, [src]);

    if (!src) return null;

    const handleZoomIn = (e: React.MouseEvent) => {
        e.stopPropagation();
        setScale(prev => Math.min(prev + 0.25, 3));
    };

    const handleZoomOut = (e: React.MouseEvent) => {
        e.stopPropagation();
        setScale(prev => Math.max(prev - 0.25, 0.5));
    };

    const handleReset = (e: React.MouseEvent) => {
        e.stopPropagation();
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!src) return;

        try {
            const response = await fetch(src);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            // Extract filename from URL or default
            const filename = src.split('/').pop()?.split('?')[0] || 'evidence-image.jpg';
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
            // Fallback
            window.open(src, '_blank');
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        // Prevent default scrolling behavior (though e.preventDefault() isn't supported in React synthetic events like this,
        // we handle the zoom logic here. To fully prevent scroll of background, we'd need a ref + native listener, 
        // but since it's a fixed modal, body scroll locking is handled elsewhere or ignored as it covers screen).
        e.stopPropagation();

        const delta = e.deltaY;
        if (delta < 0) {
            // Scroll Up -> Zoom In
            setScale(prev => Math.min(prev + 0.1, 3));
        } else {
            // Scroll Down -> Zoom Out
            setScale(prev => Math.max(prev - 0.1, 0.5));
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        e.stopPropagation();
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
            onWheel={handleWheel}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Controls */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-1 flex items-center gap-1 border border-white/20">
                    <button
                        onClick={handleZoomOut}
                        className="p-2 text-white hover:bg-white/20 rounded-md transition disabled:opacity-50"
                        disabled={scale <= 0.5}
                        title="Zoom Out"
                    >
                        <ZoomOut size={20} />
                    </button>
                    <span className="text-white text-xs font-mono w-12 text-center select-none">
                        {Math.round(scale * 100)}%
                    </span>
                    <button
                        onClick={handleZoomIn}
                        className="p-2 text-white hover:bg-white/20 rounded-md transition disabled:opacity-50"
                        disabled={scale >= 3}
                        title="Zoom In"
                    >
                        <ZoomIn size={20} />
                    </button>
                    <div className="w-px h-6 bg-white/20 mx-1" />
                    <button
                        onClick={handleReset}
                        className="p-2 text-white hover:bg-white/20 rounded-md transition"
                        title="Reset Zoom"
                    >
                        <RotateCcw size={20} />
                    </button>
                </div>

                {/* Separator */}
                <div className="h-10 w-px bg-white/10 mx-1" />

                <button
                    onClick={handleDownload}
                    className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition backdrop-blur-md"
                    title="Download Image"
                >
                    <Download size={24} />
                </button>

                <button
                    onClick={onClose}
                    className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition backdrop-blur-md"
                >
                    <X size={24} />
                </button>
            </div>

            {/* Image Container */}
            <div
                className="w-full h-full flex items-center justify-center overflow-hidden p-4"
                onMouseMove={handleMouseMove}
            >
                <div
                    className={`relative transition-transform duration-75 ease-out ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                    style={{
                        transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`
                    }}
                    onMouseDown={handleMouseDown}
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
                >
                    <img
                        src={src}
                        alt="Preview"
                        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl pointer-events-none select-none"
                        draggable={false}
                    />
                </div>
            </div>
        </div>,
        document.body
    );
};
