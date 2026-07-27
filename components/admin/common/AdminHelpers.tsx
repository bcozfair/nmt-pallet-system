import React from 'react';
// TrendingUp went with StatCard: it was the icon on that card's trend chip and
// nothing else in this file used it.
import { CircleCheck, Activity, AlertTriangle, Ban } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PalletStatus } from '../../../types';
import { dict, getLang } from '../../../services/i18n';
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
    /** The stroke at ~12% alpha, for area washes under a line. */
    fill: string;
    Icon: LucideIcon;
}> = {
    available: {
        badge: 'bg-green-100 text-green-700',
        chip: 'bg-green-100 text-green-700',
        // Was #10B981, which measures 2.54:1 against white -- under the 3:1
        // floor a chart mark has to clear to be seen at all, and a 2px line at
        // that contrast disappears entirely on a projector or a dimmed laptop.
        // #059669 is 3.77:1 and reads as the same green. The other three
        // already pass (in_use 3.68, damaged 3.76, scrapped 4.83), so this is
        // the only value that had to move.
        stroke: '#059669',
        fill: 'rgba(5,150,105,0.12)',
        Icon: CircleCheck
    },
    in_use: {
        badge: 'bg-blue-100 text-blue-700',
        chip: 'bg-orange-100 text-orange-700',
        stroke: '#3B82F6',
        fill: 'rgba(59,130,246,0.12)',
        Icon: Activity
    },
    damaged: {
        badge: 'bg-red-100 text-red-700',
        chip: 'bg-red-100 text-red-700',
        stroke: '#EF4444',
        fill: 'rgba(239,68,68,0.12)',
        Icon: AlertTriangle
    },
    scrapped: {
        badge: 'bg-gray-200 text-gray-700',
        chip: 'bg-gray-300 text-gray-700',
        stroke: '#6B7280',
        fill: 'rgba(107,114,128,0.12)',
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

// Durations DO follow the language, unlike dates above. A date is an index into
// a shared record -- it has to match the CSV and the database -- but "2.1 days"
// is prose about a measurement, and leaving it in English beside a Thai label
// reads as an untranslated string rather than as a deliberate convention.
//
// The unit comes from ICU/CLDR via Intl rather than from the dictionary. It is
// number formatting, not translation: the same reasoning that puts
// toLocaleDateString above rather than a hand-written month table. Thai's
// default numbering system is `latn`, so digits stay Arabic either way, which
// keeps this consistent with every other figure on the dashboard.
//
// The analytics reducer reports every duration in hours. Switching to days at
// the 24-hour mark is what stops a dwell median reading "312 hr" next to a
// histogram whose bands are labelled in days.
export const formatDuration = (hours: number, locale: string = getLang()): string => {
    const asHours = hours < 24;
    const value = asHours ? hours : hours / 24;

    try {
        return new Intl.NumberFormat(locale, {
            style: 'unit',
            unit: asHours ? 'hour' : 'day',
            unitDisplay: 'short',
            maximumFractionDigits: 1,
        }).format(value);
    } catch {
        // Safari < 14.1 has no style:'unit'. A bare number beats a thrown error,
        // and the surrounding label still says which statistic it is.
        return String(Math.round(value * 10) / 10);
    }
};

// --- COMPONENT DEFINITIONS ---

// `StatCard` used to sit here. components/ui/StatTile.tsx replaces it, and its
// one importer (DashboardStatsGrid) is gone with the dashboard rewrite. It was
// not a like-for-like swap: that card sized its label box with `h-full` and set
// the figure in `font-black`, a weight this app never loads, so the browser
// synthesised it -- and a synthesised bold smears Thai tone marks into the
// glyph below them. StatTile uses min-h and caps at font-semibold.

// No `default` branch on purpose: the old one rendered the raw enum value, so a
// status the UI did not know about shipped as "scrapped" to the user instead of
// failing visibly. The table above covers every PalletStatus by construction.
export const StatusBadge = ({ status }: { status: PalletStatus }) => {
    const t = useT();
    const { badge, Icon } = PALLET_STATUS_META[status];
    const label = t.status[status];
    // `uppercase` dropped: the label is translated now, and it is a no-op on
    // Thai -- so in Thai this badge would quietly lose the emphasis it has in
    // English while every other badge in the row kept it.
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit ${badge}`}>
            <Icon size={12} /> {label}
        </span>
    );
};
