import React from 'react';
import { PieChart } from 'lucide-react';
import { StatusDonutChart } from '../charts/StatusDonutChart';

interface FleetHealthCardProps {
    stats: {
        total: number;
        available: number;
        in_use: number;
        damaged: number;
    };
}

export const FleetHealthCard: React.FC<FleetHealthCardProps> = ({ stats }) => {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[320px]">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-gray-100 text-gray-600 rounded-lg"><PieChart size={20} /></div>
                    <div>
                        <h3 className="font-bold text-gray-800">Fleet Health</h3>
                        <p className="text-xs text-gray-400">Current Status Breakdown</p>
                    </div>
                </div>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-hidden">
                <StatusDonutChart stats={stats} />
            </div>
        </div>
    );
};
