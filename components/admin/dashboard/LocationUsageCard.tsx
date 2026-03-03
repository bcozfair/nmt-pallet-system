import React from 'react';
import { ChartColumnStacked } from 'lucide-react';
import { LocationInventoryChart } from '../charts/LocationInventoryChart';
import { Pallet } from '../../../types';

interface LocationUsageCardProps {
    pallets: Pallet[];
    onNavigateToInventory: (filter: string, location?: string) => void;
}

export const LocationUsageCard: React.FC<LocationUsageCardProps> = ({ pallets, onNavigateToInventory }) => {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[420px] transition-all duration-300 hover:shadow-xl hover:border-indigo-100 group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none transform group-hover:scale-110">
                <ChartColumnStacked size={140} />
            </div>

            <div className="flex items-center justify-between mb-2 shrink-0 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300"><ChartColumnStacked size={20} /></div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg group-hover:text-indigo-700 transition-colors">Location Usage</h3>
                        <p className="text-xs text-gray-400">Current Stock per Location</p>
                    </div>
                </div>
            </div>
            <LocationInventoryChart
                pallets={pallets}
                onSelectLocation={(loc) => onNavigateToInventory('all', loc)}
            />
        </div>
    );
};
