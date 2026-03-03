import React from 'react';

interface TrendChartTooltipProps {
    data: {
        label: string;
        checkOut: number;
        checkIn: number;
        damage: number;
        acquisition: number;
    };
    x: number;
    y: number;
    activeSeries: ('checkOut' | 'checkIn' | 'damage' | 'acquisition')[];
    isRightAligned?: boolean;
}

export const TrendChartTooltip = ({ data, x, y, activeSeries, isRightAligned = false }: TrendChartTooltipProps) => {
    // Offset calculation based on alignment
    const tooltipX = isRightAligned ? x - 120 : x + 15;
    const tooltipY = 20;

    return (
        <g className="animate-in fade-in zoom-in duration-200 pointer-events-none">
            <defs>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.15" />
                </filter>
            </defs>

            <rect
                x={tooltipX} y={tooltipY}
                width="120" height="110"
                rx="8" fill="white"
                filter="url(#shadow)"
                stroke="#e2e8f0"
                strokeWidth="1"
            />

            <text x={tooltipX + 10} y={tooltipY + 20} className="text-[11px] font-bold fill-gray-800 uppercase tracking-wide">
                {data.label}
            </text>

            {activeSeries.includes('checkOut') && (
                <>
                    <circle cx={tooltipX + 15} cy={tooltipY + 40} r="3" fill="#3b82f6" />
                    <text x={tooltipX + 25} y={tooltipY + 43} className="text-[10px] fill-gray-600 font-medium">
                        Check Out: <tspan fontWeight="bold" fill="#1e293b">{data.checkOut}</tspan>
                    </text>
                </>
            )}

            {activeSeries.includes('checkIn') && (
                <>
                    <circle cx={tooltipX + 15} cy={tooltipY + 60} r="3" fill="#22c55e" />
                    <text x={tooltipX + 25} y={tooltipY + 63} className="text-[10px] fill-gray-600 font-medium">
                        Return: <tspan fontWeight="bold" fill="#1e293b">{data.checkIn}</tspan>
                    </text>
                </>
            )}

            {activeSeries.includes('damage') && (
                <>
                    <circle cx={tooltipX + 15} cy={tooltipY + 80} r="3" fill="#ef4444" />
                    <text x={tooltipX + 25} y={tooltipY + 83} className="text-[10px] fill-gray-600 font-medium">
                        Damage: <tspan fontWeight="bold" fill="#1e293b">{data.damage}</tspan>
                    </text>
                </>
            )}

            {activeSeries.includes('acquisition') && (
                <>
                    <circle cx={tooltipX + 15} cy={tooltipY + 100} r="3" fill="#a855f7" />
                    <text x={tooltipX + 25} y={tooltipY + 103} className="text-[10px] fill-gray-600 font-medium">
                        New: <tspan fontWeight="bold" fill="#1e293b">{data.acquisition}</tspan>
                    </text>
                </>
            )}
        </g>
    );
};
