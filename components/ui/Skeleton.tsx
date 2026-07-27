import React from 'react';
import { CARD_SHELL } from './Card';
import { STAT_TILE_BOX } from './StatTile';

// Loading placeholders. The single rule that governs every component in this
// file: a skeleton must occupy EXACTLY the box its loaded counterpart will,
// so that data arriving changes what is on screen and never where it is. That
// is why SkeletonTile imports STAT_TILE_BOX rather than approximating it, and
// why SkeletonChart derives its height from the same `aspect` the real plot
// gets. A placeholder that is 12px short is worse than no placeholder: it
// promises a layout and then moves it.
//
// Accessibility split: the bars themselves are decoration and are always
// aria-hidden. Where a screen reader genuinely needs to be told the region is
// still loading, pass `ariaLabel` -- the container then becomes a live
// `role="status"` instead. Both on the same element would be a contradiction,
// so it is one or the other.

const statusProps = (ariaLabel?: string) =>
    ariaLabel ? ({ role: 'status', 'aria-label': ariaLabel } as const) : ({ 'aria-hidden': true } as const);

export interface SkeletonProps {
    className?: string;
}

/** The base sweeping box. `.skeleton` is defined in index.css. */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
    <div className={`skeleton rounded-md ${className}`} aria-hidden="true" />
);

export interface SkeletonTextProps {
    lines?: number;
    className?: string;
}

// The last line is short, because real paragraphs end mid-measure. A stack of
// equal-length bars reads as a table, not as prose.
export const SkeletonText: React.FC<SkeletonTextProps> = ({ lines = 3, className = '' }) => (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
            <div
                key={i}
                className={`skeleton h-3.5 rounded-md ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
            />
        ))}
    </div>
);

export interface SkeletonTileProps {
    /** Supply only when the region needs to announce itself as loading. */
    ariaLabel?: string;
}

// Shares STAT_TILE_BOX with the real tile, so the grid does not reflow on load.
export const SkeletonTile: React.FC<SkeletonTileProps> = ({ ariaLabel }) => (
    <div className={STAT_TILE_BOX} {...statusProps(ariaLabel)}>
        <div className="flex items-start gap-3">
            <div className="skeleton h-9 w-9 shrink-0 rounded-xl" aria-hidden="true" />
            <div className="skeleton mt-1 h-3.5 w-24 rounded-md" aria-hidden="true" />
        </div>
        <div className="skeleton mt-4 h-8 w-20 rounded-md" aria-hidden="true" />
    </div>
);

export interface SkeletonChartProps {
    /** Plot aspect (width / height) -- must match the ChartFrame it stands in for. */
    aspect?: number;
    /** Set instead of `aspect` when the frame uses `fixedPlotHeight`. */
    height?: number;
    ariaLabel?: string;
}

export const SkeletonChart: React.FC<SkeletonChartProps> = ({ aspect = 2, height, ariaLabel }) => (
    // aspectRatio goes through the style attribute, not a Tailwind class.
    // `aspect-[N]` would have to be assembled from a runtime number, and
    // Tailwind only ever sees the source text -- a class built at runtime
    // compiles to no rule at all and the box would collapse. (index.css has a
    // long note about the 21 files in this repo already carrying classes that
    // resolve to nothing; this is how that happens.)
    <div
        className="skeleton w-full rounded-xl"
        style={height ? { height } : { aspectRatio: String(aspect) }}
        {...statusProps(ariaLabel)}
    />
);

export interface SkeletonRowsProps {
    rows?: number;
    cols?: number;
    ariaLabel?: string;
}

// Mirrors DataTableView: a header rule, then rows. The first column is wider
// because it is the label column in every table this stands in for.
export const SkeletonRows: React.FC<SkeletonRowsProps> = ({ rows = 5, cols = 3, ariaLabel }) => (
    <div className="w-full" {...statusProps(ariaLabel)}>
        <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
            {Array.from({ length: cols }, (_, c) => (
                <div
                    key={c}
                    className={`skeleton h-3 rounded-md ${c === 0 ? 'flex-[2]' : 'flex-1'}`}
                    aria-hidden="true"
                />
            ))}
        </div>
        {Array.from({ length: rows }, (_, r) => (
            <div key={r} className="flex items-center gap-3 border-b border-slate-100 py-2.5">
                {Array.from({ length: cols }, (_, c) => (
                    <div
                        key={c}
                        className={`skeleton h-3.5 rounded-md ${c === 0 ? 'flex-[2]' : 'flex-1'}`}
                        aria-hidden="true"
                    />
                ))}
            </div>
        ))}
    </div>
);

export interface SkeletonCardProps {
    className?: string;
    ariaLabel?: string;
}

/** A whole Card-shaped placeholder, for panels with no more specific shape. */
export const SkeletonCard: React.FC<SkeletonCardProps> = ({ className = '', ariaLabel }) => (
    <div className={`${CARD_SHELL} overflow-hidden p-5 sm:p-6 ${className}`} {...statusProps(ariaLabel)}>
        <div className="skeleton h-4 w-40 rounded-md" aria-hidden="true" />
        <div className="skeleton mt-2 h-3 w-56 rounded-md" aria-hidden="true" />
        <SkeletonText className="mt-5" lines={3} />
    </div>
);
