import React, { useMemo } from 'react';
import { Pallet } from '../../../types';
import { CircleCheck, ClockAlert, Hammer } from 'lucide-react';

export const LocationRiskMatrix = ({ pallets, threshold, onLocationSelect }: { pallets: Pallet[], threshold: number, onLocationSelect: (loc: string) => void }) => {
    const locationData = useMemo(() => {
        const locs: Record<string, { total: number, overdue: number, damaged: number }> = {};

        pallets.forEach(p => {
            if (p.current_location === 'Warehouse') return;
            if (!locs[p.current_location]) locs[p.current_location] = { total: 0, overdue: 0, damaged: 0 };

            locs[p.current_location].total++;
            if (p.status === 'damaged') locs[p.current_location].damaged++;

            if (p.status === 'in_use' && p.last_checkout_date) {
                const days = (new Date().getTime() - new Date(p.last_checkout_date).getTime()) / (1000 * 3600 * 24);
                if (days > threshold) locs[p.current_location].overdue++;
            }
        });

        return Object.entries(locs)
            .map(([name, stats]) => {
                const riskScore = stats.overdue + (stats.damaged * 2);
                const riskRatio = stats.total > 0 ? (stats.overdue + stats.damaged) / stats.total : 0;
                return { name, ...stats, riskScore, riskRatio };
            })
            .sort((a, b) => b.riskRatio - a.riskRatio)
            .filter(l => l.riskScore > 0);
    }, [pallets, threshold]);

    return (
        <div className="flex-1 min-h-0 flex flex-col">
            {locationData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 italic bg-gray-50 rounded-xl border border-dashed border-gray-200 py-8">
                    <CircleCheck size={32} className="text-green-500 mb-2 opacity-50" />
                    <span className="text-sm">All systems normal.</span>
                </div>
            ) : (
                <div className="space-y-2 overflow-y-auto pr-2 -mr-2 styled-scrollbar h-full pt-2">
                    {locationData.map((loc, idx) => (
                        <div
                            key={loc.name}
                            onClick={() => onLocationSelect(loc.name)}
                            className="group p-3 rounded-lg border border-transparent hover:border-gray-200 hover:bg-blue-50/50 hover:shadow-sm transition-all duration-200 cursor-pointer relative overflow-hidden bg-gray-50/40"
                        >
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>

                            <div className="flex items-center justify-between gap-3 relative z-10">
                                {/* Left: Name, Total, Bar */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-sm font-bold text-gray-800 truncate group-hover:text-blue-700 transition-colors">
                                            {loc.name}
                                        </span>
                                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                            ({loc.total} Units)
                                        </span>
                                    </div>

                                    {/* Compact Bar */}
                                    <div className="w-full h-1 bg-gray-200 rounded-full mt-1.5 overflow-hidden flex opacity-60 group-hover:opacity-100 transition-opacity">
                                        <div className="bg-orange-400 h-full" style={{ width: `${(loc.overdue / loc.total) * 100}%` }}></div>
                                        <div className="bg-red-500 h-full" style={{ width: `${(loc.damaged / loc.total) * 100}%` }}></div>
                                    </div>
                                </div>

                                {/* Right: Stats Row */}
                                <div className="flex items-center gap-3">
                                    {/* Overdue Stat */}
                                    <div className={`flex items-center gap-1 ${loc.overdue > 0 ? 'opacity-100' : 'opacity-30'}`} title="Overdue">
                                        <ClockAlert size={14} className="text-orange-500" />
                                        <span className={`text-xs font-bold ${loc.overdue > 0 ? 'text-gray-700' : 'text-gray-400'}`}>{loc.overdue}</span>
                                    </div>

                                    {/* Damaged Stat */}
                                    <div className={`flex items-center gap-1 ${loc.damaged > 0 ? 'opacity-100' : 'opacity-30'}`} title="Damaged">
                                        <Hammer size={14} className="text-red-500" />
                                        <span className={`text-xs font-bold ${loc.damaged > 0 ? 'text-gray-700' : 'text-gray-400'}`}>{loc.damaged}</span>
                                    </div>

                                    {/* Total Badge */}
                                    <div className="pl-2 border-l border-gray-200">
                                        <span className={`font-bold text-xs px-2 py-1 rounded-md ${loc.overdue + loc.damaged > 0 ? 'text-red-700 bg-red-100' : 'text-gray-500 bg-gray-100'}`}>
                                            {loc.overdue + loc.damaged} <span className="text-[9px] uppercase opacity-70 ml-0.5">Issues</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
