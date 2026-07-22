import React from 'react';
import { PieChart, Ban } from 'lucide-react';
import { StatusDonutChart } from '../charts/StatusDonutChart';
import { useT } from '../../../hooks/useT';

interface FleetHealthCardProps {
    stats: {
        total: number;
        available: number;
        in_use: number;
        damaged: number;
        scrapped: number;
    };
}

export const FleetHealthCard: React.FC<FleetHealthCardProps> = ({ stats }) => {
    const t = useT();

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[320px]">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-gray-100 text-gray-600 rounded-lg"><PieChart size={20} /></div>
                    <div>
                        <h3 className="font-bold text-gray-800">{t.dashboard.fleetHealth}</h3>
                        <p className="text-xs text-gray-400">{t.dashboard.fleetHealthSub}</p>
                    </div>
                </div>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-hidden">
                <StatusDonutChart stats={stats} />
            </div>
            {/* Scrapped is deliberately not a fourth donut segment. It is not part
                of the fleet, and adding it would stop the three real statuses from
                summing to 100%. It is a footnote so the number is still visible. */}
            {stats.scrapped > 0 && (
                <div className="shrink-0 pt-3 mt-2 border-t border-gray-100 flex items-center justify-center gap-1.5 text-xs text-gray-400 font-medium">
                    <Ban size={12} />
                    <span>{t.dashboard.scrappedFootnote(stats.scrapped)}</span>
                </div>
            )}
        </div>
    );
};
