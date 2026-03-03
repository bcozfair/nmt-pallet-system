import React, { useState } from 'react';
import { Pallet, Transaction } from '../../../types';
import { useTrendChartData } from '../../../hooks/charts/useTrendChartData';
import { TrendChartTooltip } from './TrendChartTooltip';

export const ActivityTrendChart = ({ transactions, pallets, period, activeSeries }: { transactions: Transaction[], pallets: Pallet[], period: 'day' | 'week' | 'month', activeSeries: ('checkOut' | 'checkIn' | 'damage' | 'acquisition')[] }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const chartData = useTrendChartData(transactions, pallets, period);

    const width = 600;
    const height = 250;
    const paddingX = 50;
    const paddingY = 30;
    const contentWidth = width - paddingX - 20;
    const contentHeight = height - paddingY - 20;

    const maxVal = Math.max(
        ...chartData.map(d => Math.max(
            activeSeries.includes('checkOut') ? d.checkOut : 0,
            activeSeries.includes('checkIn') ? d.checkIn : 0,
            activeSeries.includes('damage') ? d.damage : 0,
            activeSeries.includes('acquisition') ? d.acquisition : 0
        )),
        5
    );

    const getX = (index: number) => paddingX + (index / (chartData.length - 1)) * contentWidth;
    const getY = (value: number) => (height - paddingY) - (value / maxVal) * contentHeight;

    const getSmoothPath = (key: 'checkOut' | 'checkIn' | 'damage' | 'acquisition') => {
        if (chartData.length === 0) return "";
        const points = chartData.map((d, i) => [getX(i), getY(d[key])]);
        if (points.length === 1) return `M ${points[0][0]} ${points[0][1]} L ${points[0][0]} ${points[0][1]}`;
        let path = `M ${points[0][0]},${points[0][1]}`;
        for (let i = 0; i < points.length - 1; i++) {
            const [x0, y0] = points[i];
            const [x1, y1] = points[i + 1];
            const cp1x = x0 + (x1 - x0) * 0.4;
            const cp1y = y0;
            const cp2x = x1 - (x1 - x0) * 0.4;
            const cp2y = y1;
            path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x1},${y1}`;
        }
        return path;
    };

    return (
        <div className="w-full h-full overflow-hidden relative" onMouseLeave={() => setHoveredIndex(null)}>
            <style>{`
                @keyframes drawPath {
                    from { stroke-dashoffset: 2000; }
                    to { stroke-dashoffset: 0; }
                }
                .chart-line {
                    stroke-dasharray: 2000;
                    stroke-dashoffset: 0;
                    animation: drawPath 2s ease-out forwards;
                }
             `}</style>

            {chartData.length > 0 ? (
                <div className="relative w-full h-full">
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="xMidYMid meet">
                        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                            const y = (height - paddingY) - (contentHeight * p);
                            const val = Math.round(maxVal * p);
                            return (
                                <g key={i}>
                                    <line x1={paddingX} y1={y} x2={width} y2={y} stroke="#f3f4f6" strokeWidth="1" />
                                    <text x={paddingX - 10} y={y + 4} textAnchor="end" className="text-[10px] fill-gray-400 font-mono">{val}</text>
                                </g>
                            );
                        })}

                        {chartData.map((_, i) => (
                            <rect
                                key={`hitbox-${i}`}
                                x={getX(i) - (contentWidth / (chartData.length - 1) / 2)}
                                y={0}
                                width={contentWidth / (chartData.length - 1)}
                                height={height - paddingY}
                                fill="transparent"
                                onMouseEnter={() => setHoveredIndex(i)}
                                className="cursor-pointer z-10"
                            />
                        ))}

                        {hoveredIndex !== null && (
                            <line
                                x1={getX(hoveredIndex)}
                                y1={20}
                                x2={getX(hoveredIndex)}
                                y2={height - paddingY}
                                stroke="#cbd5e1"
                                strokeWidth="2"
                                strokeDasharray="4 4"
                                className="transition-all duration-75 ease-linear"
                            />
                        )}

                        {activeSeries.includes('checkOut') && <path d={getSmoothPath('checkOut')} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="chart-line opacity-80" />}
                        {activeSeries.includes('checkIn') && <path d={getSmoothPath('checkIn')} fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="chart-line opacity-80" style={{ animationDelay: '0.2s' }} />}
                        {activeSeries.includes('damage') && <path d={getSmoothPath('damage')} fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="chart-line opacity-80" style={{ animationDelay: '0.4s' }} />}
                        {activeSeries.includes('acquisition') && <path d={getSmoothPath('acquisition')} fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="chart-line opacity-80" style={{ animationDelay: '0.6s' }} />}

                        {chartData.map((d, i) => {
                            const x = getX(i);
                            const isHovered = hoveredIndex === i;

                            return (
                                <g key={i} className="pointer-events-none">
                                    <text
                                        x={x}
                                        y={height - 5}
                                        textAnchor="middle"
                                        className={`text-[10px] uppercase font-bold transition-colors ${isHovered ? 'fill-blue-600' : 'fill-gray-400'}`}
                                    >
                                        {d.label}
                                    </text>

                                    {activeSeries.includes('checkOut') && (
                                        <circle
                                            cx={x} cy={getY(d.checkOut)}
                                            r={isHovered ? 5 : 2}
                                            fill="white" stroke="#3b82f6" strokeWidth={isHovered ? 2.5 : 1.5}
                                            className="transition-all duration-300 ease-out"
                                        />
                                    )}
                                    {activeSeries.includes('checkIn') && (
                                        <circle
                                            cx={x} cy={getY(d.checkIn)}
                                            r={isHovered ? 5 : 2}
                                            fill="white" stroke="#22c55e" strokeWidth={isHovered ? 2.5 : 1.5}
                                            className="transition-all duration-300 ease-out delay-75"
                                        />
                                    )}
                                    {d.damage > 0 && activeSeries.includes('damage') && (
                                        <circle
                                            cx={x} cy={getY(d.damage)}
                                            r={isHovered ? 5 : 2}
                                            fill="white" stroke="#ef4444" strokeWidth={isHovered ? 2.5 : 1.5}
                                            className="transition-all duration-300 ease-out delay-100"
                                        />
                                    )}
                                    {d.acquisition > 0 && activeSeries.includes('acquisition') && (
                                        <circle
                                            cx={x} cy={getY(d.acquisition)}
                                            r={isHovered ? 5 : 2}
                                            fill="white" stroke="#a855f7" strokeWidth={isHovered ? 2.5 : 1.5}
                                            className="transition-all duration-300 ease-out delay-150"
                                        />
                                    )}
                                </g>
                            );
                        })}

                        {hoveredIndex !== null && (
                            <TrendChartTooltip
                                data={chartData[hoveredIndex]}
                                x={getX(hoveredIndex)}
                                y={20}
                                activeSeries={activeSeries}
                                isRightAligned={hoveredIndex > chartData.length - 4}
                            />
                        )}
                    </svg>
                </div>
            ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">No data available</div>
            )}
        </div>
    );
};

