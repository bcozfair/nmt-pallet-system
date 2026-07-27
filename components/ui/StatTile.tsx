import React from 'react';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CARD_SHELL } from './Card';

export type StatTone = 'brand' | 'accent' | 'critical' | 'warning' | 'neutral';

export interface StatTileProps {
    label: string;
    value: string | number;
    caption?: string;
    icon?: LucideIcon;
    /** Tints the icon chip ONLY. The value stays in ink -- text never wears the data colour. */
    tone?: StatTone;
    delta?: { label: string; direction: 'up' | 'down' | 'flat'; isGood: boolean };
    /** `hero` enlarges the value only. One tile per row at most, or it is not a hero. */
    size?: 'md' | 'hero';
    /** 0-100. Draws a slim track under the caption. The value is expected to
     *  already spell the percentage out, so the bar carries no ARIA. */
    meterPct?: number;
    onClick?: () => void;
    loading?: boolean;
}

// The box, shared with SkeletonTile so a loading grid occupies exactly the same
// pixels as the loaded one and the page does not jump when the data lands.
//
// `min-h`, never `h`. A Thai label runs ~1.4-1.7x the width of its English
// source and has no inter-word spaces to break at, so "จำนวนพาเลททั้งหมด" wraps
// to two lines where "Total Pallets" fits on one. A fixed height would clip it
// in exactly one language -- the one nobody reviewing the English screenshots
// would ever see.
// `flex flex-col` is what lets the meter's `mt-auto` sit on the tile's floor
// rather than immediately under the caption, so a tile with a meter and one
// without still line up along the bottom edge of the row.
export const STAT_TILE_BOX = `${CARD_SHELL} flex min-h-[7.5rem] w-full flex-col p-5 text-left`;

// Tints the chip behind the icon and nothing else. The value itself is always
// slate-900: a number that changes colour with its own tone is unreadable to
// anyone who cannot see the tone, and it makes the tile's most important
// element the least legible one.
const TONE_CHIP: Record<StatTone, string> = {
    brand: 'bg-brand-50 text-brand-600',
    accent: 'bg-accent-50 text-accent-600',
    critical: 'bg-red-50 text-red-600',
    warning: 'bg-amber-50 text-amber-600',
    neutral: 'bg-slate-100 text-slate-500',
};

const DELTA_ICON: Record<'up' | 'down' | 'flat', LucideIcon> = {
    up: TrendingUp,
    down: TrendingDown,
    flat: Minus,
};

// This replaces StatCard in components/admin/common/AdminHelpers.tsx, and
// deliberately drops three things that component did:
//
// 1. The 60px watermark icon at 10% opacity, absolutely positioned top-right.
//    It sat directly behind the number -- the one element on the tile anyone
//    actually reads -- and scaled up on hover, so the value was competing with
//    a moving object for the same square inches.
//
// 2. The "trend" pill. It rendered green with a TrendingUp icon unconditionally,
//    whatever the string said: a rise in damaged pallets was drawn in exactly
//    the same reassuring green as a rise in available ones. `delta` here carries
//    a `direction` (which arrow) and an `isGood` (which colour) as separate
//    facts, because up is not the same question as good.
//
// 3. React.cloneElement on an untyped ReactNode to inject `size` and
//    `className`. It type-checked only because the node was cast to
//    ReactElement<any>, so passing anything that was not a Lucide icon failed at
//    runtime rather than at compile time. `icon` is now a LucideIcon component
//    and is rendered, not cloned.
export const StatTile: React.FC<StatTileProps> = ({
    label,
    value,
    caption,
    icon: Icon,
    tone = 'brand',
    delta,
    size = 'md',
    meterPct,
    onClick,
    loading = false,
}) => {
    if (loading) {
        return (
            <div className={STAT_TILE_BOX} aria-hidden="true">
                <div className="flex items-start gap-3">
                    <div className="skeleton h-9 w-9 shrink-0 rounded-xl" />
                    <div className="skeleton mt-1 h-3.5 w-24 rounded-md" />
                </div>
                <div className="skeleton mt-4 h-8 w-20 rounded-md" />
            </div>
        );
    }

    const DeltaIcon = delta ? DELTA_ICON[delta.direction] : null;

    // A flat delta is neither good nor bad, so it is never painted as either --
    // `isGood` only decides a colour once there is a movement to judge.
    const deltaClass =
        delta?.direction === 'flat'
            ? 'bg-slate-100 text-slate-600'
            : delta?.isGood
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-red-50 text-red-700';

    const body = (
        <>
            <div className="flex items-start gap-3">
                {Icon && (
                    <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${TONE_CHIP[tone]}`}
                        aria-hidden="true"
                    >
                        <Icon size={18} />
                    </span>
                )}
                {/* Wraps rather than truncates: a clipped Thai label is not a
                    shorter label, it is a different word. */}
                <p className="text-sm font-medium leading-snug text-slate-500">{label}</p>
            </div>

            {/* font-semibold (600), not font-black. Google Fonts loads Inter and
                Noto Sans Thai at 300-700 only, so a 900 weight is synthesised by
                the browser -- it smears the Thai glyphs and never matches the
                Latin. Size carries the emphasis here instead of weight. No
                `tabular-nums` either: this is one display figure, not a column,
                and proportional figures set better on their own. */}
            <p
                className={`mt-3 font-semibold tracking-tight text-slate-900 ${size === 'hero' ? 'text-4xl' : 'text-3xl'}`}
            >
                {value}
            </p>

            {(delta || caption) && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    {delta && DeltaIcon && (
                        <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${deltaClass}`}
                        >
                            <DeltaIcon size={12} aria-hidden="true" />
                            {delta.label}
                        </span>
                    )}
                    {caption && <span className="text-xs leading-relaxed text-slate-500">{caption}</span>}
                </div>
            )}

            {/* In normal flow at the end of the tile, not absolutely positioned
                against it. The previous approach laid the bar over the tile and
                opened the tile's padding to clear it with an arbitrary variant
                (`[&>div]:pb-10`) -- which selected EVERY direct div child, the
                bar included, so the 6px track rendered 46px tall. Reaching into
                another component's DOM from a class is what made that possible;
                a prop cannot do it. */}
            {typeof meterPct === 'number' && (
                <div className="mt-auto pt-4">
                    <div className="h-1.5 overflow-hidden rounded-full bg-brand-100" aria-hidden="true">
                        {/* Width is a runtime number, so it goes through `style`.
                            A `w-[${n}%]` class is assembled after build time and
                            Tailwind only ever scans source text -- it would
                            compile to no rule and the fill would be invisible. */}
                        <div
                            className="h-full rounded-full bg-brand-600 transition-[width] duration-500"
                            style={{ width: `${Math.max(0, Math.min(100, meterPct))}%` }}
                        />
                    </div>
                </div>
            )}
        </>
    );

    // A real <button> when it does something, a <div> when it does not. A
    // clickable div is unreachable by keyboard and invisible to a screen reader,
    // and the fix is not a tabIndex and a key handler -- it is the element that
    // already has all of that.
    if (onClick) {
        return (
            <button
                type="button"
                onClick={onClick}
                className={`${STAT_TILE_BOX} group block transition duration-200 hover:border-brand-200 hover:shadow-[0_28px_70px_-34px_rgba(15,42,82,0.55)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 active:scale-[0.99]`}
            >
                {body}
            </button>
        );
    }

    return <div className={STAT_TILE_BOX}>{body}</div>;
};
