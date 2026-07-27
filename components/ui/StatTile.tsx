import React from 'react';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CARD_SHELL, CARD_SHELL_SHAPE, CARD_SURFACE } from './Card';

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
    /** Only meaningful alongside `onClick`. Paints the selected surface and
     *  sets `aria-pressed`, so a click-to-filter tile shows which filter is
     *  active without a second element saying so.
     *
     *  OMITTING IT IS WHAT MARKS A TILE AS "NOT A TOGGLE", and that is the
     *  whole contract -- do not give this a default. With `selected = false`
     *  the prop was never `undefined`, so `aria-pressed="false"` was stamped on
     *  every clickable tile, including the dashboard's Overdue and Damaged
     *  tiles (KpiRow.tsx), which navigate to another screen and never toggle
     *  anything. A screen reader announced them as "toggle button, not
     *  pressed" and the state never changed however often they were pressed --
     *  the control lying about its own role (WCAG 4.1.2). Left `undefined`,
     *  React omits the attribute entirely, and the falsy check below still
     *  reads `undefined` as "not selected" for the styling. */
    selected?: boolean;
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
//
// 5.5rem and p-4, down from 7.5rem and p-5. The value used to be a row of its
// own under the label; it now shares the label's row (see `body` below), which
// removed a 36px line plus its 12px top margin from every tile. The floor and
// the padding came down with it -- a 120px floor under a ~96px tile is not a
// floor, it is 24px of white nobody asked for.
const STAT_TILE_LAYOUT = 'flex min-h-[5.5rem] w-full flex-col p-4 text-left';

export const STAT_TILE_BOX = `${CARD_SHELL} ${STAT_TILE_LAYOUT}`;

// The two surfaces a clickable tile can wear. Full sets of the same three
// properties (border colour, fill, hover border colour), picked between by ONE
// ternary -- not a base string with an override appended after it. An appended
// `border-brand-500` does not beat the `border-slate-200/80` already in the
// base: both are single-class selectors, so the winner is whichever Tailwind
// happens to emit later in the built stylesheet, not whichever the caller wrote
// last. Button.tsx:53-59 records the same trap on the same property.
//
// Selected is a border and a tint, not a ring, and that is the fix for a real
// collision rather than a taste call. `ring-2 ring-brand-500 ring-offset-2`
// painted brand at 2-4px out from the edge; the focus indicator
// (`focus-visible:outline-2 outline-offset-2 outline-brand-500`) paints brand at
// exactly 2-4px too. Same band, same colour -- so tabbing onto the tile that was
// already selected changed nothing on screen and a keyboard user could not tell
// where focus had landed. A tile is a large card, so it can carry its selected
// state on its own surface and leave the ring to focus alone: the two are then
// independently visible, and selected+focused differs from selected.
const TILE_SURFACE_SELECTED = 'border-brand-500 bg-brand-50 hover:border-brand-600';
const TILE_SURFACE_IDLE = `${CARD_SURFACE} hover:border-brand-200`;

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
    selected,
    loading = false,
}) => {
    if (loading) {
        // Same three boxes on the same one row as the loaded tile, so the swap
        // moves nothing. Kept in step with SkeletonTile in Skeleton.tsx, which
        // stands in for this component in a grid.
        return (
            <div className={STAT_TILE_BOX} aria-hidden="true">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <div className="skeleton hidden h-8 w-8 shrink-0 rounded-xl sm:block" />
                        <div className="skeleton h-3.5 w-20 rounded-md" />
                    </div>
                    <div className="skeleton h-7 w-14 shrink-0 rounded-md" />
                </div>
                <div className="skeleton mt-3 h-3 w-24 rounded-md" />
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
            {/* ONE row: icon, label, value. The value used to sit on its own line
                underneath, which cost every tile a 36px line box plus a 12px
                margin and left the right half of the row empty -- so the tile was
                tall AND had a hole in it. `justify-between` puts the figure hard
                against the right edge, which is also where the eye goes to
                compare four tiles down a row.

                `items-center`, not `items-start`: at text-3xl the value's line
                box is 36px and the icon chip is 32px, while the label is a 20px
                line that may wrap to two. Aligning tops would leave the number
                looking like it had slipped below the label it belongs to. */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                    {Icon && (
                        // Hidden below `sm`, and this is arithmetic rather than
                        // taste. The row is two columns at 360px, so a tile is
                        // 158px and its content box 126px. A 32px chip and its
                        // gap take 42 of that, "100%" at text-2xl takes ~58, and
                        // the label is left with 26px -- too narrow for Thai to
                        // break in, so it would spill out of the tile. The chip
                        // is aria-hidden decoration that repeats what the label
                        // already says, so it is the one thing here that can go.
                        <span
                            className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:flex ${TONE_CHIP[tone]}`}
                            aria-hidden="true"
                        >
                            <Icon size={16} />
                        </span>
                    )}
                    {/* Wraps rather than truncates: a clipped Thai label is not a
                        shorter label, it is a different word. `min-w-0` so the
                        wrapping actually happens -- a flex item defaults to
                        min-width:auto and would push the value off the tile
                        instead of breaking. */}
                    <p className="min-w-0 text-sm font-medium leading-snug text-slate-500">{label}</p>
                </div>

                {/* font-semibold (600), not font-black. Google Fonts loads Inter
                    and Noto Sans Thai at 300-700 only, so a 900 weight is
                    synthesised by the browser -- it smears the Thai glyphs and
                    never matches the Latin. Size carries the emphasis here
                    instead of weight. No `tabular-nums` either: this is one
                    display figure, not a column, and proportional figures set
                    better on their own.

                    One step down below `sm`, where the tile is 158px wide and a
                    30px "100%" would take half of it. `shrink-0` because this is
                    the element the tile exists for: if something has to give, it
                    is the label, which can wrap. */}
                <p
                    className={`shrink-0 font-semibold tracking-tight text-slate-900 ${
                        size === 'hero' ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'
                    }`}
                >
                    {value}
                </p>
            </div>

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
                // pt-3, not pt-4: this tile is the tallest in its row and so
                // sets the height of the three beside it. On a ~96px tile a 16px
                // gap above a 6px bar is most of a line.
                <div className="mt-auto pt-3">
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
                // Passed straight through, undefined and all: React omits the
                // attribute for `undefined`, which is how a tile that only
                // navigates avoids claiming to be a toggle. See the prop's doc.
                aria-pressed={selected}
                className={`${CARD_SHELL_SHAPE} ${STAT_TILE_LAYOUT} ${
                    selected ? TILE_SURFACE_SELECTED : TILE_SURFACE_IDLE
                } group block transition duration-200 hover:shadow-[0_28px_70px_-34px_rgba(15,42,82,0.55)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 active:scale-[0.99]`}
            >
                {body}
            </button>
        );
    }

    return <div className={STAT_TILE_BOX}>{body}</div>;
};
