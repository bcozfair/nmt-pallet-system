import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { ActivityTrendChart } from '../charts/ActivityTrendChart';
import { Pallet, Transaction } from '../../../types';

interface ActivityTrendCardProps {
    transactions: Transaction[];
    pallets: Pallet[];
}

export const ActivityTrendCard: React.FC<ActivityTrendCardProps> = ({ transactions, pallets }) => {
    const [chartPeriod, setChartPeriod] = useState<'day' | 'week' | 'month'>('day');
    const [activeSeries, setActiveSeries] = useState<('checkOut' | 'checkIn' | 'damage' | 'acquisition')[]>(['checkOut', 'checkIn', 'damage', 'acquisition']);

    const toggleSeries = (series: 'checkOut' | 'checkIn' | 'damage' | 'acquisition') => {
        setActiveSeries(prev =>
            prev.includes(series)
                ? prev.filter(s => s !== series)
                : [...prev, series]
        );
    };

    return (
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[450px]">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><TrendingUp size={20} /></div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg">Activity & Acquisition</h3>
                        <p className="text-xs text-gray-400">Transactions & New Inventory Added</p>
                    </div>
                </div>
                <div className="flex bg-gray-100 rounded-lg p-1">
                    {(['day', 'week', 'month'] as const).map(p => (
                        <button
                            key={p}
                            onClick={() => setChartPeriod(p)}
                            className={`px-3 py-1 text-xs font-bold rounded-md capitalize transition ${chartPeriod === p ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <ActivityTrendChart transactions={transactions} pallets={pallets} period={chartPeriod} activeSeries={activeSeries} />
            </div>

            <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-gray-50 shrink-0 flex-wrap">
                <button onClick={() => toggleSeries('checkOut')} className={`flex items-center gap-2 text-xs font-bold transition-all duration-200 transform hover:scale-105 active:scale-95 ${activeSeries.includes('checkOut') ? 'text-gray-500 opacity-100' : 'text-gray-300 opacity-50 hover:opacity-75'}`}>
                    <div className={`w-8 h-1 rounded-full shadow-sm ${activeSeries.includes('checkOut') ? 'bg-blue-500' : 'bg-gray-300'}`}></div> Check Out
                </button>
                <button onClick={() => toggleSeries('checkIn')} className={`flex items-center gap-2 text-xs font-bold transition-all duration-200 transform hover:scale-105 active:scale-95 ${activeSeries.includes('checkIn') ? 'text-gray-500 opacity-100' : 'text-gray-300 opacity-50 hover:opacity-75'}`}>
                    <div className={`w-8 h-1 rounded-full shadow-sm ${activeSeries.includes('checkIn') ? 'bg-green-500' : 'bg-gray-300'}`}></div> Check In (Return)
                </button>
                <button onClick={() => toggleSeries('damage')} className={`flex items-center gap-2 text-xs font-bold transition-all duration-200 transform hover:scale-105 active:scale-95 ${activeSeries.includes('damage') ? 'text-gray-500 opacity-100' : 'text-gray-300 opacity-50 hover:opacity-75'}`}>
                    <div className={`w-8 h-1 rounded-full shadow-sm ${activeSeries.includes('damage') ? 'bg-red-500' : 'bg-gray-300'}`}></div> Reported Damage
                </button>
                <button onClick={() => toggleSeries('acquisition')} className={`flex items-center gap-2 text-xs font-bold transition-all duration-200 transform hover:scale-105 active:scale-95 ${activeSeries.includes('acquisition') ? 'text-gray-500 opacity-100' : 'text-gray-300 opacity-50 hover:opacity-75'}`}>
                    <div className={`w-8 h-1 rounded-full shadow-sm ${activeSeries.includes('acquisition') ? 'bg-purple-500' : 'bg-gray-300'}`}></div> New Acquisition
                </button>
            </div>
        </div>
    );
};
