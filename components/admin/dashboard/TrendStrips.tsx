import React, { useId, useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { AXIS_PROPS, CHART_CHROME, GRID_PROPS } from '../charts/chartTheme';
import type { TrendPoint } from '../../../services/analytics/dashboardAnalytics';

/**
 * The movement trend, as one small filled area chart per series.
 *
 * ======================= WHY NOT FIVE LINES ON ONE AXIS ====================
 *
 * That is what this replaces, and it failed on the data rather than on the
 * drawing. Five series sharing one linear y-axis put every one of them on the
 * same scale, and in this warehouse -- 22 pallets, daily buckets -- the counts
 * are small integers: 0-5 check-outs a day, 0-2 damage reports. All five lines
 * therefore live in the bottom third of the plot and cross each other
 * constantly. Dash patterns made them identifiable but not readable; area
 * washes made it worse, because five translucent fills over the same region
 * multiply into colours that mean nothing and the tallest one hides the rest.
 *
 * One strip per series fixes the cause. Each strip derives its own y-domain, so
 * a series whose peak is 2 fills its strip exactly as well as one whose peak is
 * 40 -- which is the only way "is this going up or down" is legible for all
 * five at once. The strips share one x-domain and one plot geometry, so they
 * stay aligned in time: a spike on the 12th lines up down the whole column.
 *
 * ============================== COLOUR ====================================
 *
 * The all-pairs CVD problem chartTheme.ts documents -- blue `check_out` and
 * violet `scrap` at dE 0.6 under deuteranopia -- simply does not arise here.
 * Two marks can only be confused if they share a plot; each strip holds exactly
 * one series and carries its name in the gutter beside it. Colour is decoration
 * on this chart, not identity, which is why the dash patterns the line version
 * needed are gone.
 *
 * ============================== GEOMETRY ==================================
 *
 * Every strip is its own ResponsiveContainer with an EXPLICIT PIXEL HEIGHT.
 * Never `aspect`, never `height="100%"` -- see the sizing rules on ChartFrame;
 * a percentage height against a parent with no definite height measures 0 and
 * renders nothing without erroring. The last strip is taller by exactly the
 * axis height so that its PLOT area still measures STRIP_HEIGHT and the five
 * remain aligned.
 */

/**
 * The plot area of one strip. Below ~44px a filled area stops reading as a
 * shape. Exported because the loading skeleton has to reserve the same box --
 * a placeholder that guesses would make the card resize when the data lands.
 */
export const STRIP_HEIGHT = 52;

/** Reserved for the shared date axis, which only the bottom strip draws. */
export const STRIP_AXIS_HEIGHT = 24;

/**
 * The y-axis gutter inside each strip.
 *
 * It carries ONE tick: the series' own peak. A strip with no scale at all would
 * let two very different series draw the same shape with nothing to say which
 * is which -- the price of independent scaling -- and a full set of ticks would
 * be four numbers of chrome per strip, twenty on the card.
 */
const Y_AXIS_WIDTH = 30;

/** Shared by every strip, so the plot areas start and end at the same x. */
const CHART_MARGIN = { top: 6, right: 8, bottom: 0, left: 0 } as const;

export interface TrendStripSeries {
    key: keyof TrendPoint & string;
    label: string;
    color: string;
}

export interface TrendStripsProps {
    data: readonly TrendPoint[];
    /** In display order, top to bottom. Already filtered to the visible set. */
    series: readonly TrendStripSeries[];
    reducedMotion?: boolean;
}

const StripTooltip: React.FC<{
    active?: boolean;
    payload?: ReadonlyArray<{ payload?: TrendPoint; value?: number }>;
    label?: string;
    seriesLabel: string;
    color: string;
}> = ({ active, payload, seriesLabel, color }) => {
    const point = payload?.[0]?.payload;
    if (!active || !point) return null;
    return (
        // HTML, never the SVG default: that one hard-codes a pixel width Thai
        // series names overflow. max-w plus wrapping for the same reason.
        <div className="max-w-[15rem] rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
            <p className="text-xs font-semibold text-slate-800">{point.label}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs">
                <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                />
                <span className="break-words text-slate-600">{seriesLabel}</span>
                <span className="ml-auto font-semibold tabular-nums text-slate-900">
                    {String(payload?.[0]?.value ?? 0)}
                </span>
            </p>
        </div>
    );
};

export const TrendStrips: React.FC<TrendStripsProps> = ({ data, series, reducedMotion = false }) => {
    // One gradient definition per series, and the ids have to be unique across
    // the document: two cards mounting this component would otherwise both
    // define `#grad-check_out` and every strip would paint with whichever
    // definition the browser resolved last.
    const gradientPrefix = useId();

    // Peak per series, for the single y-tick. Computed once rather than inside
    // the render loop so toggling a strip does not re-scan the range for all
    // the others.
    const peaks = useMemo(() => {
        const out: Record<string, number> = {};
        for (const s of series) {
            let max = 0;
            for (const point of data) {
                const value = Number(point[s.key] ?? 0);
                if (value > max) max = value;
            }
            out[s.key] = max;
        }
        return out;
    }, [data, series]);

    return (
        <div className="flex flex-col">
            {series.map((s, index) => {
                const isLast = index === series.length - 1;
                const gradientId = `${gradientPrefix}-${s.key}`;
                const peak = peaks[s.key] ?? 0;
                const total = data.reduce((sum, point) => sum + Number(point[s.key] ?? 0), 0);

                return (
                    <div
                        key={s.key}
                        // The gutter is a fixed track and the plot takes the
                        // rest. `minmax(0,1fr)` and not `1fr`: a grid track's
                        // minimum is `auto`, so without it the plot column
                        // refuses to shrink below the chart's intrinsic width
                        // and pushes the gutter off the card.
                        className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-2"
                    >
                        {/* The gutter. Label and range total, never truncated:
                            Thai has no inter-word spaces, so an ellipsis lands
                            inside a syllable. It is free to take two lines --
                            "รับพาเลทเข้าใหม่" does, at this width. */}
                        <div className="min-w-0 py-1">
                            <p className="flex items-start gap-1.5 text-xs leading-snug text-slate-600">
                                <span
                                    className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: s.color }}
                                    aria-hidden="true"
                                />
                                <span className="min-w-0">{s.label}</span>
                            </p>
                            <p className="mt-0.5 pl-4 text-sm font-semibold tabular-nums text-slate-900">
                                {total}
                            </p>
                        </div>

                        {/* Explicit pixel height, and the bottom strip is taller
                            by exactly STRIP_AXIS_HEIGHT so its PLOT still measures
                            STRIP_HEIGHT -- that is what keeps the five aligned. */}
                        <ResponsiveContainer
                            width="100%"
                            height={isLast ? STRIP_HEIGHT + STRIP_AXIS_HEIGHT : STRIP_HEIGHT}
                        >
                            <AreaChart data={data as TrendPoint[]} margin={CHART_MARGIN}>
                                <defs>
                                    {/* Top-to-bottom fade rather than a flat
                                        wash: the fill is there to give the line
                                        a body, and a solid block at the same
                                        alpha reads as a filled region whose
                                        area means something. */}
                                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                                        <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>

                                <CartesianGrid {...GRID_PROPS} />

                                <XAxis
                                    {...AXIS_PROPS}
                                    dataKey="label"
                                    height={isLast ? STRIP_AXIS_HEIGHT : 0}
                                    // Only the bottom strip draws dates. The
                                    // five share one x-domain and one geometry,
                                    // so one axis labels all of them -- and four
                                    // repeats of the same dates would be more
                                    // chrome than data on a 52px strip.
                                    tick={isLast ? AXIS_PROPS.tick : false}
                                    axisLine={isLast}
                                    minTickGap={24}
                                    interval="preserveStartEnd"
                                />

                                <YAxis
                                    {...AXIS_PROPS}
                                    width={Y_AXIS_WIDTH}
                                    // From 0 always. A domain that started at the
                                    // series minimum would turn "2, 3, 2" into a
                                    // dramatic mountain range.
                                    domain={[0, peak > 0 ? peak : 1]}
                                    // The peak, and nothing else. Suppressed at
                                    // zero: a lone "0" on an empty strip is a
                                    // label for a scale that has no range.
                                    ticks={peak > 0 ? [peak] : []}
                                    axisLine={false}
                                    allowDecimals={false}
                                />

                                <Tooltip
                                    cursor={{ stroke: CHART_CHROME.axis, strokeWidth: 1 }}
                                    content={<StripTooltip seriesLabel={s.label} color={s.color} />}
                                />

                                <Area
                                    type="monotone"
                                    dataKey={s.key}
                                    stroke={s.color}
                                    strokeWidth={2}
                                    fill={`url(#${gradientId})`}
                                    // Recharts animates in JavaScript, so the
                                    // prefers-reduced-motion block in index.css
                                    // cannot reach it.
                                    isAnimationActive={!reducedMotion}
                                    activeDot={{ r: 3, stroke: CHART_CHROME.surface, strokeWidth: 2 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                );
            })}
        </div>
    );
};
