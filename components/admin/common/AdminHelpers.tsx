import React from 'react';
import { CircleCheck, Activity, AlertTriangle, TrendingUp, Ban } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PalletStatus } from '../../../types';

// --- STATUS PRESENTATION ---

// The one place a pallet status turns into something a human sees. Every badge,
// dropdown option, chip, chart colour and CSV cell reads from here, so adding a
// status is one edit rather than a hunt through the UI.
//
// Typing it as Record<PalletStatus, ...> is what makes that reliable: an object
// literal missing a key is a compile error (TS2741) regardless of `strict` or
// whether @types/react is installed. That check is real here even though JSX
// props are not checked in this project.
export const PALLET_STATUS_META: Record<PalletStatus, {
    label: string;
    badge: string;
    chip: string;
    stroke: string;
    Icon: LucideIcon;
}> = {
    available: {
        label: 'Available',
        badge: 'bg-green-100 text-green-700',
        chip: 'bg-green-100 text-green-700',
        stroke: '#10B981',
        Icon: CircleCheck
    },
    in_use: {
        label: 'In Use',
        badge: 'bg-blue-100 text-blue-700',
        chip: 'bg-orange-100 text-orange-700',
        stroke: '#3B82F6',
        Icon: Activity
    },
    damaged: {
        label: 'Damaged',
        badge: 'bg-red-100 text-red-700',
        chip: 'bg-red-100 text-red-700',
        stroke: '#EF4444',
        Icon: AlertTriangle
    },
    scrapped: {
        label: 'Scrapped',
        badge: 'bg-gray-200 text-gray-700',
        chip: 'bg-gray-300 text-gray-700',
        stroke: '#6B7280',
        Icon: Ban
    }
};

// Ordered for dropdowns and legends: the working fleet first, retired last.
export const PALLET_STATUS_ORDER: PalletStatus[] = ['available', 'in_use', 'damaged', 'scrapped'];

// For CSV columns and anywhere else a raw enum value would leak to a reader.
export const palletStatusLabel = (status: PalletStatus | string): string =>
    PALLET_STATUS_META[status as PalletStatus]?.label ?? status;

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

// No `default` branch on purpose: the old one rendered the raw enum value, so a
// status the UI did not know about shipped as "scrapped" to the user instead of
// failing visibly. The table above covers every PalletStatus by construction.
export const StatusBadge = ({ status }: { status: PalletStatus }) => {
    const { label, badge, Icon } = PALLET_STATUS_META[status];
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1 w-fit ${badge}`}>
            <Icon size={12} /> {label}
        </span>
    );
};
