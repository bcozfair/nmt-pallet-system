import React from 'react';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { LocationRiskMatrix } from '../charts/LocationRiskMatrix';
import { Pallet } from '../../../types';

interface HighRiskZoneCardProps {
    pallets: Pallet[];
    overdueThreshold: number;
    onNavigateToInventory: (filter: string, location?: string) => void;
}

export const HighRiskZoneCard: React.FC<HighRiskZoneCardProps> = ({ pallets, overdueThreshold, onNavigateToInventory }) => {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[450px]">
            <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-red-100 text-red-600 rounded-lg"><AlertCircle size={20} /></div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg">High Risk Zones</h3>
                        <p className="text-xs text-gray-400">Top Locations by Issue Ratio</p>
                    </div>
                </div>
            </div>

            <LocationRiskMatrix
                pallets={pallets}
                threshold={overdueThreshold}
                onLocationSelect={(loc) => onNavigateToInventory('all', loc)}
            />

            <div className="mt-auto pt-6 border-t border-gray-100 shrink-0">
                <button
                    onClick={() => onNavigateToInventory('overdue')}
                    className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition flex items-center justify-center gap-2"
                >
                    View All Overdue Items <ArrowLeft className="rotate-180" size={16} />
                </button>
            </div>
        </div>
    );
};
