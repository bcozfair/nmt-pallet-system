import React from 'react';
import { CircleCheck, Activity, AlertTriangle, TrendingUp } from 'lucide-react';

// --- HELPERS ---
export const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

export const formatDateTime = (date: Date | string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

// --- COMPONENT DEFINITIONS ---

export const StatCard = ({ title, value, icon, color, trend, subtitle }: { title: string, value: string | number, icon: React.ReactNode, color: string, trend?: string, subtitle?: string }) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between group hover:shadow-md transition h-full relative overflow-hidden">
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500`}>
            {React.cloneElement(icon as React.ReactElement<any>, { size: 60, className: color.replace('bg-', 'text-') })}
        </div>

        <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg text-white shadow-md ${color}`}>
                    {React.cloneElement(icon as React.ReactElement<any>, { size: 18 })}
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</p>
            </div>

            <h3 className="text-3xl font-black text-gray-800 tracking-tight">{value}</h3>

            {trend && (
                <div className="mt-2 flex items-center gap-1">
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <TrendingUp size={10} /> {trend}
                    </span>
                </div>
            )}
            {subtitle && (
                <p className="text-xs text-gray-400 mt-1 font-medium">{subtitle}</p>
            )}
        </div>
    </div>
);

export const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case 'available':
            return <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-green-100 text-green-700 flex items-center gap-1 w-fit"><CircleCheck size={12} /> Available</span>;
        case 'in_use':
            return <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-blue-100 text-blue-700 flex items-center gap-1 w-fit"><Activity size={12} /> In Use</span>;
        case 'damaged':
            return <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-red-100 text-red-700 flex items-center gap-1 w-fit"><AlertTriangle size={12} /> Damaged</span>;
        default:
            return <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-gray-100 text-gray-700">{status}</span>;
    }
};
