import React from 'react';
import { CircleCheck, Activity, AlertTriangle, TrendingUp, Ban } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PalletStatus } from '../../../types';
import { dict } from '../../../services/i18n';
import { useT } from '../../../hooks/useT';

// --- STATUS PRESENTATION ---

// The one place a pallet status turns into a colour, an icon or a chart stroke.
// Every badge, dropdown option, chip and legend reads from here, so adding a
// status is one edit rather than a hunt through the UI.
//
// The human-readable `label` used to live here too; it now sits in locales/en.ts
// under `status`, because it is the one field that changes with the language.
// Both halves keep the same guarantee: this table is Record<PalletStatus, ...>
// and the dictionary's is `satisfies Record<PalletStatus | 'unknown', string>`,
// so an object literal missing a key is a compile error (TS2741) on either side.
export const PALLET_STATUS_META: Record<PalletStatus, {
    badge: string;
    chip: string;
    stroke: string;
    Icon: LucideIcon;
}> = {
    available: {
        badge: 'bg-green-100 text-green-700',
        chip: 'bg-green-100 text-green-700',
        stroke: '#10B981',
        Icon: CircleCheck
    },
    in_use: {
        badge: 'bg-blue-100 text-blue-700',
        chip: 'bg-orange-100 text-orange-700',
        stroke: '#3B82F6',
        Icon: Activity
    },
    damaged: {
        badge: 'bg-red-100 text-red-700',
        chip: 'bg-red-100 text-red-700',
        stroke: '#EF4444',
        Icon: AlertTriangle
    },
    scrapped: {
        badge: 'bg-gray-200 text-gray-700',
        chip: 'bg-gray-300 text-gray-700',
        stroke: '#6B7280',
        Icon: Ban
    }
};

// Ordered for dropdowns and legends: the working fleet first, retired last.
export const PALLET_STATUS_ORDER: PalletStatus[] = ['available', 'in_use', 'damaged', 'scrapped'];

// For CSV columns and anywhere else a raw enum value would leak to a reader.
// Reads dict() rather than taking the label as an argument so non-component
// callers (utils/exportHelpers.ts) work unchanged.
export const palletStatusLabel = (status: PalletStatus | string): string =>
    dict().status[status as PalletStatus] ?? status;

// --- HELPERS ---

// Dates are deliberately NOT translated. One format everywhere means what is on
// screen matches what lands in the exported CSV, in the report filename and in
// the database -- and sidesteps the Buddhist/Gregorian era question entirely.
const DATE_LOCALE = 'en-GB';

// en-GB yields "21 Jul 2026"; the house format is DD-MMM-YYYY, so the separator
// is normalised here instead of at each call site.
export const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    return new Date(date)
        .toLocaleDateString(DATE_LOCALE, {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
        .replace(/\s+/g, '-');
};

// Built from the two parts rather than one toLocaleDateString call with time
// options: that returns "21 Jul 2026, 14:30", and normalising every space in it
// would mangle the time into "14:30" preceded by a stray dash.
export const formatDateTime = (date: Date | string | null) => {
    if (!date) return '-';
    const d = new Date(date);
    const time = d.toLocaleTimeString(DATE_LOCALE, { hour: '2-digit', minute: '2-digit' });
    return `${formatDate(d)} ${time}`;
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
    const t = useT();
    const { badge, Icon } = PALLET_STATUS_META[status];
    const label = t.status[status];
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1 w-fit ${badge}`}>
            <Icon size={12} /> {label}
        </span>
    );
};
