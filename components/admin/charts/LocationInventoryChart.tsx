import React, { useMemo } from 'react';
import { Pallet } from '../../../types';

export const LocationInventoryChart = ({ pallets, onSelectLocation }: { pallets: Pallet[], onSelectLocation?: (location: string) => void }) => {
    const chartData = useMemo(() => {
        const counts: Record<string, number> = {};
        pallets.forEach(p => {
            if (p.current_location === 'Warehouse') return;
            counts[p.current_location] = (counts[p.current_location] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count);
    }, [pallets]);

    const maxVal = Math.max(...chartData.map(d => d.count), 5);
    const hasData = chartData.length > 0;

    return (
        <div className="w-full flex-1 min-h-[250px] pt-14 pb-2 relative flex">
            <div className="flex flex-col justify-between items-end pr-3 pb-[5.5rem] h-full text-[10px] text-gray-400 font-mono select-none w-10 shrink-0 border-r border-gray-100/50 mr-2">
                <span>{maxVal}</span>
                <span>{Math.round(maxVal * 0.75)}</span>
                <span>{Math.round(maxVal * 0.5)}</span>
                <span>{Math.round(maxVal * 0.25)}</span>
                <span>0</span>
            </div>

            <div className="flex-1 relative flex flex-col justify-end h-full min-w-0">
                <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                        <div
                            key={i}
                            className="absolute w-full border-t border-gray-100 border-dashed"
                            style={{ bottom: `calc(5.5rem + (100% - 5.5rem) * ${p})` }}
                        ></div>
                    ))}
                </div>

                {!hasData && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs italic z-10">
                        No active location data available (outside Warehouse)
                    </div>
                )}

                <div className={`w-full h-full flex items-end justify-between gap-1 relative z-10 ${!hasData ? 'opacity-20' : ''} `}>
                    {chartData.map((d, idx) => (
                        <div
                            key={idx}
                            onClick={() => onSelectLocation && onSelectLocation(d.label)}
                            className="flex-1 flex flex-col items-center gap-2 group/bar h-full justify-end min-w-0 cursor-pointer transition-all duration-300 hover:-translate-y-2"
                        >
                            <div className="w-full flex-1 flex items-end justify-center relative">
                                <div className="w-full max-w-[24px] bg-gray-50/50 rounded-t-full h-full relative overflow-visible flex items-end group-hover/bar:bg-indigo-50/50 transition-colors">
                                    <div
                                        style={{ height: `${(d.count / maxVal) * 100}%` }}
                                        className="w-full bg-indigo-400 group-hover/bar:bg-indigo-600 rounded-t-md min-h-[4px] transition-all duration-300 ease-out relative shadow-[0_4px_6px_-1px_rgba(99,102,241,0.1)] group-hover/bar:shadow-[0_0_20px_rgba(79,70,229,0.4)]"
                                    >
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/bar:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50">
                                            <div className="bg-gray-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-xl relative">
                                                {d.count} Units
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-gray-900"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="h-20 w-full flex justify-center pt-2">
                                <span
                                    className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-tight text-left whitespace-nowrap group-hover/bar:text-indigo-600 group-hover/bar:font-black transition-colors duration-300"
                                    style={{ writingMode: 'vertical-rl' }}
                                >
                                    {d.label}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
