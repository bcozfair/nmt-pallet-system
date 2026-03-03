import React, { useEffect, useState, useMemo } from 'react';

export const StatusDonutChart = ({ stats }: { stats: { available: number, in_use: number, damaged: number, total: number } }) => {
    const size = 200;
    const strokeWidth = 20;
    const center = size / 2;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const [hoveredKey, setHoveredKey] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoaded(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const segments = useMemo(() => {
        const total = stats.total || 1;
        return [
            { key: 'available', label: 'Available', value: stats.available, color: 'text-emerald-500', stroke: '#10B981', percent: (stats.available / total) * 100 },
            { key: 'in_use', label: 'In Use', value: stats.in_use, color: 'text-blue-500', stroke: '#3B82F6', percent: (stats.in_use / total) * 100 },
            { key: 'damaged', label: 'Damaged', value: stats.damaged, color: 'text-red-500', stroke: '#EF4444', percent: (stats.damaged / total) * 100 }
        ];
    }, [stats]);

    const activeSegment = hoveredKey ? segments.find(s => s.key === hoveredKey) : null;
    const centerLabel = activeSegment ? activeSegment.label : 'Total Fleet';
    const centerValue = activeSegment ? `${activeSegment.percent.toFixed(1)}%` : stats.total;
    const centerSub = activeSegment ? `${activeSegment.value} Units` : 'Assets';
    const centerColorClass = activeSegment ? activeSegment.color : 'text-gray-800';

    let accumulatedPercent = 0;

    return (
        <div className="flex flex-row items-center justify-center gap-4 md:gap-8 h-full w-full">
            <div className="relative shrink-0 w-32 h-32 sm:w-40 sm:h-40 md:w-[200px] md:h-[200px]">
                <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full drop-shadow-lg transform -rotate-90">
                    <circle cx={center} cy={center} r={radius} fill="transparent" stroke="#f3f4f6" strokeWidth={strokeWidth} />
                    {segments.map((seg) => {
                        const strokeDasharray = `${(seg.percent / 100) * circumference} ${circumference}`;
                        const rotation = (accumulatedPercent / 100) * 360;
                        accumulatedPercent += seg.percent;

                        if (seg.value === 0) return null;

                        const isHovered = hoveredKey === seg.key;

                        return (
                            <circle
                                key={seg.key}
                                cx={center}
                                cy={center}
                                r={radius}
                                fill="transparent"
                                stroke={seg.stroke}
                                strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                                strokeDasharray={isLoaded ? strokeDasharray : `0 ${circumference}`}
                                strokeDashoffset={0}
                                style={{
                                    transition: 'stroke-dasharray 1s ease-out, stroke-width 0.2s ease',
                                    transformBox: 'fill-box',
                                    transformOrigin: 'center',
                                    transform: `rotate(${rotation}deg)`
                                }}
                                onMouseEnter={() => setHoveredKey(seg.key)}
                                onMouseLeave={() => setHoveredKey(null)}
                                className="cursor-pointer"
                            />
                        );
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">{centerLabel}</span>
                    <span className={`text-xl sm:text-2xl md:text-3xl font-black ${centerColorClass} transition-colors duration-300`}>{centerValue}</span>
                    <span className="text-[10px] md:text-xs font-medium text-gray-400 mt-1">{centerSub}</span>
                </div>
            </div>

            <div className="flex flex-col gap-2 md:gap-3 w-full max-w-[140px] md:max-w-[200px]">
                {segments.map((seg) => (
                    <div
                        key={seg.key}
                        className={`flex items-center justify-between p-1.5 md:p-2 rounded-lg cursor-pointer transition border border-transparent ${hoveredKey === seg.key ? 'bg-gray-50 border-gray-100 shadow-sm transform scale-105' : 'hover:bg-gray-50'}`}
                        onMouseEnter={() => setHoveredKey(seg.key)}
                        onMouseLeave={() => setHoveredKey(null)}
                    >
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="relative w-2.5 h-2.5 md:w-3 md:h-3">
                                <span className={`absolute inset-0 rounded-full opacity-30 ${seg.color.replace('text-', 'bg-')}`}></span>
                                <span className={`absolute inset-0.5 rounded-full ${seg.color.replace('text-', 'bg-')}`}></span>
                            </div>
                            <div className="flex flex-col leading-none">
                                <span className="text-xs md:text-sm font-bold text-gray-600">{seg.label}</span>
                                <span className="text-[9px] md:text-[10px] text-gray-400 font-medium">{seg.percent.toFixed(1)}%</span>
                            </div>
                        </div>
                        <span className="font-bold text-gray-800 bg-gray-100 px-1.5 md:px-2 py-0.5 rounded-md text-[10px] md:text-xs">{seg.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
