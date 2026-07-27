import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import { Funnel as FunnelIcon, Repeat, ShieldAlert, ShieldCheck, Timer } from 'lucide-react';

import {
    Card,
    ChartFrame,
    DataTableView,
    EmptyState,
    SectionHeader,
    Skeleton,
    SkeletonRows,
    SkeletonText,
} from '../../../ui';
import {
    AXIS_PROPS,
    CHART_CHROME,
    DISTRIBUTION_COLOR,
    GRID_PROPS,
    HEAT_SCALE,
    QUALITY_STACK,
    SEGMENT_GAP,
    SERIES_COLORS,
    bandPlotHeight,
} from '../../charts/chartTheme';
import { PALLET_STATUS_META, formatDate, formatDuration } from '../../common/AdminHelpers';
import { DormantPalletsCard } from '../DormantPalletsCard';
import { RangeMenu } from '../RangeMenu';
import { ResolutionGauge } from '../ResolutionGauge';
import type { DashboardRange } from '../../../../hooks/dashboard/useDashboardData';
import { useT } from '../../../../hooks/useT';
import { useReducedMotion } from '../../../../hooks/useReducedMotion';
import type {
    DashboardAnalytics,
    DwellBucketKey,
} from '../../../../services/analytics/dashboardAnalytics';

// =============================================================================
// QUALITY & DAMAGE
//
// Four cards over one question: how much damage is there, what happened to it,
// how long it took, and which pallets keep coming back.
//
// Plus one that is not about quality at all: DormantPalletsCard, which used to
// close LifecycleSection. It is here because the four sections of the deep-dive
// panel render as one continuous list of cards with NO headings between them,
// so the boundary this file sits behind is invisible on screen -- and what the
// reader saw at that boundary was the dormant table and the quality trend as
// two full-width blocks stacked one on the other. Pairing them fills a row.
// DormantPalletsCard.tsx carries the full reasoning and its own AsOfNowChip,
// which is what keeps it honest beside four range-scoped neighbours.
//
// ---------------------------------------------------------------------------
// RULE 1 -- THE QUALITY TREND IS A STACKED BAR, STACKED IN `QUALITY_STACK` ORDER
//
// This is a colour-blindness constraint, not a style preference, and it is
// documented at the top of components/admin/charts/chartTheme.ts. The three
// quality series are slots 3-5 of the categorical palette:
//
//     report_damage  #d94b46      scrap  #6d4bc4      repair  #1a8f4c
//
// As three free-floating LINES the chart fails: red against green measures
// dE 5.9 under simulated deuteranopia, which is roughly "the same colour" to
// one man in twelve. Stacked in the order report_damage -> scrap -> repair the
// pairs that actually touch measure dE 22.6 (CVD) and 27.9 (normal vision) and
// pass. The violet sitting between the red and the green is what makes it work,
// so the array order IS the safety mechanism.
//
// Do not reorder QUALITY_STACK, do not slice it, and do not convert this chart
// to lines or to grouped bars.
//
// ---------------------------------------------------------------------------
// RULE 2 -- NO check_out / check_in ON THIS SECTION
//
// Movement runs 10-100x the volume of damage events. Plotted on one axis, the
// damage/repair/scrap series flatten onto the baseline and the chart reads as
// three straight lines along zero -- which is exactly the defect in the chart
// this section replaces. The movement pair lives on its own card with its own
// axis (and it is the pair that is safe as two free lines: CVD dE 17.5).
//
// ---------------------------------------------------------------------------
// RULE 3 -- THE FUNNEL IS A COHORT, NOT A SET OF PERIOD COUNTS
//
// `reported` counts damage reports RAISED in the selected range. `repaired` and
// `scrapped` count how many of *those same reports* were later closed each way
// -- not how many repair/scrap events happened in the window. So
//
//     stillOpen = reported - repaired - scrapped
//
// holds by construction and can never go negative (see the funnel counters in
// services/analytics/dashboardAnalytics.ts).
//
// The trend chart in the row above IS raw per-period event counts, so its
// `repair` and `scrap` bars will NOT add up to the funnel's numbers: a repair
// logged this week can close a report raised last month, and a report raised
// today may be closed after the range ends. The card's subtitle carries the
// identity above so a reader has something to reconcile against instead of
// assuming one of the two cards is wrong.
//
// ---------------------------------------------------------------------------
// RULE 4 -- ChartFrame SIZING
//
// Both charts here take `fixedPlotHeight`, never `aspect`. Verified against
// recharts 3.10.1:
//
//   * `minPlotHeight` only writes `min-height` to the wrapper div. The SVG is
//     still sized at measuredWidth / aspect, so below the floor the box is
//     reserved (nothing overlaps, nothing shifts) but the plot does NOT grow to
//     fill it. On the 328px phone column an aspect of 2 gives a 164px plot with
//     dead space under it, which is not legible for six bands or thirty bars.
//   * ResponsiveContainer's `height` defaults to '100%' and is skipped only
//     when `aspect > 0`. Passing both re-arms the collapse-to-zero trap.
//     ChartFrame passes exactly one; nothing here overrides it.
//
// RULE 5 -- `isAnimationActive={!useReducedMotion()}` on every Bar. Recharts
// interpolates geometry in JavaScript, so the prefers-reduced-motion block in
// index.css cannot reach it.
//
// RULE 6 -- Tooltips are HTML via `<Tooltip content={...} />`. The SVG default
// hard-codes a pixel width that Thai overflows. Nothing here uses
// dangerouslySetInnerHTML: pallet ids come from the database.
//
// RULE 7 -- Every chart carries a DataTableView in the frame's FOOTER, outside
// the plot box. A tooltip needs a pointer and a steady hand, so it can never be
// the only way to read a value. The table must stay outside the measured plot:
// a ResponsiveContainer inside a collapsed <details> measures 0 and stays 0.
//
// RULE 8 -- Axis and grid styling comes from AXIS_PROPS / GRID_PROPS. Solid
// gridlines, never dashed. Axis text `fill` is never set here -- slate-400 is
// 2.56:1 and illegal as text; AXIS_PROPS already carries the legal slate-500.
//
// ---------------------------------------------------------------------------
// THAI TYPOGRAPHY
//
// No positive letter-spacing anywhere (it detaches tone marks and vowels from
// their base characters), no `uppercase` (a no-op in Thai, so the emphasis
// exists in English only), and nothing heavier than font-semibold outside a
// table header -- weight 900 is not loaded and would be synthesised.
//
// Thai runs ~1.4-1.7x the width of its English source with no inter-word
// spaces, so the browser has no legal break point inside a long label: it does
// not wrap, it overflows. Hence `min-h-*` rather than `h-*` on anything holding
// text, wrapping legends rather than fixed-height ones, and -- the highest-risk
// text in this section -- the funnel's stage labels rendered as HTML that can
// wrap, never as SVG <text> inside a fixed-width plot.
//
// Dates always go through formatDate/formatDateTime. Never `th-TH`: it renders
// 2026 as the Buddhist-era 2569 while the CSV beside it still says 2026.
// =============================================================================

interface QualitySectionProps {
    analytics: DashboardAnalytics | null;
    isLoading: boolean;
    isRefreshing?: boolean;
    /**
     * All four QUALITY cards are range-scoped, so all four carry the picker.
     * That is not repetition for its own sake: a reader arriving at the
     * repeat-offender table from the deep-dive disclosure has no other way to
     * see that "2 damage reports" means two inside the selected window rather
     * than two ever.
     *
     * The fifth card in this grid -- the dormant table -- is the exception, and
     * it wears AsOfNowChip instead. It is the clearest case on the dashboard for
     * the two-chip system: an as-of-now table sitting in a row of range-scoped
     * charts, where nothing but the chips distinguishes them.
     */
    range: DashboardRange;
    onRangeChange: (range: DashboardRange) => void;
    onSelectPallet?: (palletId: string) => void;
}

// --- LOCAL CONSTANTS ---------------------------------------------------------

/**
 * The funnel's stages carry an order, so they take an ORDINAL single-hue ramp
 * rather than three categorical hues -- categorical colour would imply the
 * stages are unrelated kinds, which is the opposite of what a funnel says.
 *
 * HEAT_SCALE is the app's only validated single-hue brand ramp (brand-300 ->
 * brand-400 -> brand-500 -> brand-700, monotone in lightness, every adjacent
 * gap >= dL 0.06). The funnel needs three steps rather than four, so it takes
 * the two ends and the middle; skipping brand-400 only widens the gaps, which
 * is what touching segments want. Nothing new is defined here on purpose --
 * chartTheme.ts is the authority for anything drawn by JS, and a third file
 * holding chart hexes is exactly what its header forbids.
 */
const FUNNEL_RAMP = [HEAT_SCALE[3], HEAT_SCALE[2], HEAT_SCALE[0]] as const;

/**
 * Inclusive upper bound, in whole days, of each of the six shared day-bands.
 * Mirrors DAY_BUCKET_MAX in services/analytics/dashboardAnalytics.ts, which does
 * not export it.
 *
 * Used for ONE thing: deciding which band the median falls in, so the reference
 * line can be drawn on a categorical axis. It never re-bins a sample -- the
 * histogram arrives already binned, and a second binning implementation here
 * would be free to drift from the median printed beside it.
 */
const BAND_MAX_DAYS = [1, 3, 7, 14, 30, Infinity];

/**
 * The quality trend's plot height.
 *
 * Its category axis is time, so it is the one chart here that cannot use
 * `bandPlotHeight` -- the band count is whatever the range chip says (7, 30, 90
 * or 12), and a per-band height would make the card grow and shrink as the
 * reader changes the range. A constant is the correct shape for it.
 *
 * 240 rather than the 300 it carried before: it shares its row with the dormant
 * table, and in a stretched grid row the taller card sets the height of both. At
 * 300 this was the taller one on every range, so the 60px it did not need was
 * being drawn as white on the card beside it as well as on this one.
 */
const QUALITY_TREND_PLOT_HEIGHT = 240;

/** Bucket key -> the locale key that names it. `resolve` deliberately reuses the
 *  same six bucket names as `dwell`, so the two histograms can be compared. */
const BUCKET_LABEL_KEY: Record<
    DwellBucketKey,
    'b0_1' | 'b2_3' | 'b4_7' | 'b8_14' | 'b15_30' | 'b30plus'
> = {
    '0_1d': 'b0_1',
    '2_3d': 'b2_3',
    '4_7d': 'b4_7',
    '8_14d': 'b8_14',
    '15_30d': 'b15_30',
    '30d_plus': 'b30plus',
};

const CELL ='border-b border-slate-100 px-3 py-2 text-slate-700';
const HEAD_CELL = 'border-b border-slate-200 px-3 py-2 text-xs font-bold text-slate-600';

/** The scrapped glyph, taken from the status table rather than picked here, so
 *  this cell cannot drift from the badge the same status wears on every other
 *  screen. Aliased to a capitalised binding purely for readability in the JSX. */
const ScrappedIcon = PALLET_STATUS_META.scrapped.Icon;

// --- TOOLTIP -----------------------------------------------------------------

/** The subset of a Recharts tooltip payload entry this renders. Recharts clones
 *  the element and injects `active`, `payload` and `label` at runtime, which is
 *  why those three are optional. */
interface TooltipEntry {
    dataKey?: string | number;
    value?: number | string;
    color?: string;
}

interface ChartTooltipProps {
    active?: boolean;
    payload?: ReadonlyArray<TooltipEntry>;
    label?: string | number;
    /** dataKey -> translated series name. Supplied by the caller so this stays
     *  free of the dictionary, like every other presentational primitive. */
    seriesLabels: Record<string, string>;
    /** Row order. Passed QUALITY_STACK so the tooltip reads bottom-to-top in the
     *  same order the segments are stacked -- Recharts' default `itemSorter` is
     *  alphabetical, which would scramble it. */
    order: readonly string[];
    /** When set, a summed row is appended. Only useful for the stack. */
    totalLabel?: string;
}

// HTML, never the SVG default: the built-in tooltip hard-codes a pixel width
// that Thai series names overflow. Values are rendered as React children, so
// there is no innerHTML anywhere near a database-sourced pallet id.
const ChartTooltip: React.FC<ChartTooltipProps> = ({
    active,
    payload,
    label,
    seriesLabels,
    order,
    totalLabel,
}) => {
    if (!active || !payload || payload.length === 0) return null;

    const byKey = new Map<string, TooltipEntry>();
    for (const entry of payload) {
        if (entry.dataKey !== undefined) byKey.set(String(entry.dataKey), entry);
    }

    let total = 0;
    for (const key of order) total += Number(byKey.get(key)?.value ?? 0);

    return (
        // max-w plus normal wrapping: a Thai series name is ~1.5x its English
        // source and must be allowed to take a second line rather than push the
        // box off the plot.
        <div className="max-w-64 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
            <p className="text-xs font-semibold text-slate-700">{label}</p>
            <ul className="mt-1.5 space-y-1">
                {order.map((key) => {
                    const entry = byKey.get(key);
                    if (!entry) return null;
                    return (
                        <li key={key} className="flex items-start gap-2 text-xs">
                            <span
                                className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                                style={{ backgroundColor: entry.color ?? CHART_CHROME.tick }}
                                aria-hidden="true"
                            />
                            <span className="min-w-0 text-slate-600">{seriesLabels[key] ?? key}</span>
                            <span className="ml-auto font-semibold text-slate-900">
                                {String(entry.value ?? 0)}
                            </span>
                        </li>
                    );
                })}
                {totalLabel && (
                    <li className="flex items-start gap-2 border-t border-slate-100 pt-1 text-xs">
                        <span className="text-slate-600">{totalLabel}</span>
                        <span className="ml-auto font-semibold text-slate-900">{total}</span>
                    </li>
                )}
            </ul>
        </div>
    );
};

// --- SECTION -----------------------------------------------------------------

export const QualitySection: React.FC<QualitySectionProps> = ({
    analytics,
    isLoading,
    isRefreshing = false,
    range,
    onRangeChange,
    onSelectPallet,
}) => {
    const t = useT();
    const a = t.dashboard.analytics;

    // One element, rendered four times. Each RangeMenu instance keeps its own
    // open/closed state and its own ids; only the VALUE is shared, through the
    // single `range` in useDashboardData.
    const rangeChip = <RangeMenu value={range} onChange={onRangeChange} />;
    // RULE 5: read once, pass the negation to every Bar below.
    const reducedMotion = useReducedMotion();

    const damage = analytics?.damage ?? null;
    const resolution = damage?.resolution ?? null;

    // Legend, tooltip and stack all read this one map, so a series can never be
    // labelled one way in the legend and another in the tooltip.
    const seriesLabels: Record<string, string> = {
        report_damage: a.qualityTrend.damage,
        scrap: a.qualityTrend.scrap,
        repair: a.qualityTrend.repair,
    };

    // --- Quality trend -------------------------------------------------------

    // The trend array always spans the full range (the service emits one bucket
    // per period, zero-filled), so "empty" means every quality series is zero
    // across every bucket -- not a short array.
    const trendEmpty =
        !analytics ||
        analytics.trend.length === 0 ||
        analytics.trend.every((p) => p.report_damage + p.scrap + p.repair === 0);

    const trendRows = useMemo(
        () =>
            (analytics?.trend ?? []).map((p) => ({
                label: p.label,
                report_damage: p.report_damage,
                scrap: p.scrap,
                repair: p.repair,
            })),
        [analytics],
    );

    // --- Time to resolve -----------------------------------------------------

    const resolveData = useMemo(
        () =>
            (resolution?.histogram ?? []).map((bin) => ({
                bucket: bin.bucket,
                label: a.resolve[BUCKET_LABEL_KEY[bin.bucket]],
                count: bin.count,
            })),
        [resolution, a],
    );

    // The category axis is ordinal bands, not a continuous scale, so the median
    // cannot be drawn at an exact pixel: the line marks the BAND the median
    // falls in, and the precise figure is printed in the footer beside it.
    const medianBandLabel = useMemo(() => {
        if (!resolution || resolution.samples === 0) return null;
        const days = Math.floor(resolution.medianHours / 24);
        const i = BAND_MAX_DAYS.findIndex((max) => days <= max);
        const bin = resolveData[i < 0 ? resolveData.length - 1 : i];
        return bin ? bin.label : null;
    }, [resolution, resolveData]);

    const resolveEmpty = !resolution || resolution.samples === 0;

    // --- Damage funnel -------------------------------------------------------

    const funnelEmpty = !damage || damage.reported === 0;

    // Rounded exactly once, here. The locale note on `resolutionRate` is
    // explicit that it takes a pre-formatted string rather than a number: round
    // the same figure in two places and the label eventually disagrees with the
    // bar it is captioning by a point.
    const resolvedPct = damage && damage.reported > 0
        ? Math.round(((damage.repaired + damage.scrapped) / damage.reported) * 100)
        : 0;

    // RULE 3, on screen. Composed from the four existing stage labels rather
    // than a new sentence: it states the identity that makes these four numbers
    // a cohort, which is the thing a reader needs before they try to reconcile
    // them against the raw per-period bars on the trend chart above.
    const funnelSubtitle =
        `${a.funnel.subtitle} (${a.funnel.reported} = ${a.funnel.repaired}` +
        ` + ${a.funnel.scrapped} + ${a.funnel.stillOpen})`;

    const funnelStages = damage
        ? [
            { key: 'repaired', label: a.funnel.repaired, value: damage.repaired, color: FUNNEL_RAMP[0] },
            { key: 'scrapped', label: a.funnel.scrapped, value: damage.scrapped, color: FUNNEL_RAMP[1] },
            { key: 'stillOpen', label: a.funnel.stillOpen, value: damage.stillOpen, color: FUNNEL_RAMP[2] },
        ]
        : [];

    // --- Repeat offenders ----------------------------------------------------

    const offenders = damage?.repeatOffenders ?? [];
    const offendersEmpty = offenders.length === 0;
    const rowsClickable = typeof onSelectPallet === 'function';

    // --- Shared empty state --------------------------------------------------

    // A range with no damage in it is GOOD NEWS, not a failure, and the empty
    // state has to read that way -- `state.loadFailed` is a different message
    // for a different situation and must never appear here. The wording stays
    // the neutral, range-aware pair the dictionary already ships; the
    // reassurance is carried by the shield-check glyph, because inventing a
    // "no damage, nice work" string would mean editing a locale file.
    const emptyState = (variant: 'card' | 'plot') => (
        <EmptyState
            variant={variant}
            icon={ShieldCheck}
            title={a.chart.noDataInRange}
            hint={a.chart.widenRange}
        />
    );

    // `xl:col-span-*` sits on a wrapper rather than on the card, because
    // ChartFrame owns its own Card and takes no className. The wrapper carries
    // nothing else -- in particular never `h-full`, which would re-introduce the
    // percentage-height dependency that collapses a ResponsiveContainer to zero.
    return (
        // SIX columns at xl, not three. This grid needs a 1:1 row (the dormant
        // table beside the quality trend) and a 1:1:1 row (funnel, resolve,
        // offenders), and 3 is not divisible by 2. Six is the lowest common
        // multiple, so both splits are exact and neither row needs a nested
        // grid -- the same arithmetic FleetSection uses.
        //
        // The three-across row is pixel-identical to the version it replaces: at
        // a 1120px content width, 6 tracks with 5 x 24px gaps give
        // (1120 - 120) / 6 = 166.67px each, so a 2-span plus its internal gap is
        // 357px -- exactly one third of a 3-column grid.
        <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-6">
            {/* --- DORMANT PALLETS ---
                Not a quality metric, and it says so with its own AsOfNowChip
                against four range-scoped neighbours. It is here because the
                sections have no headings on screen: this table and the quality
                trend were two full-width blocks stacked with nothing between
                them, and the reader saw one long column, not two sections.
                DormantPalletsCard.tsx carries the full note. */}
            <div className="grid xl:col-span-3">
                <DormantPalletsCard
                    rows={analytics?.aging.dormant ?? null}
                    isLoading={isLoading}
                    isRefreshing={isRefreshing}
                    onSelectPallet={onSelectPallet}
                />
            </div>

            {/* --- QUALITY TREND ---
                Half the row, and still ABOVE the funnel, which is what RULE 3
                and the funnel's composed subtitle depend on: the funnel is a
                cohort and this chart is raw per-period counts, so the two do not
                add up and the reader needs them adjacent to reconcile that. */}
            <div className="grid xl:col-span-3">
                <ChartFrame
                    title={a.qualityTrend.title}
                    subtitle={a.qualityTrend.subtitle}
                    icon={ShieldAlert}
                    action={rangeChip}
                    // RULE 4: fixed, not aspect. At aspect this card is 1120px
                    // wide on a desktop and 328px on a phone, so the plot would
                    // swing between 373px and 109px tall for the same data.
                    //
                    // Not bandPlotHeight: this is the one chart in the section
                    // whose category axis is TIME, so its band count is 7, 30, 90
                    // or 12 depending on the range and a per-band pitch would
                    // make the card change height when the range chip is used.
                    // 240 is the tallest bar's room, and it is chosen against the
                    // dormant table beside it rather than in isolation -- the two
                    // share a row, so the taller one sets both. 300 made this the
                    // taller card by ~60px on every range.
                    fixedPlotHeight={QUALITY_TREND_PLOT_HEIGHT}
                    isLoading={isLoading}
                    isRefreshing={isRefreshing}
                    isEmpty={trendEmpty}
                    emptyState={emptyState('plot')}
                    footer={
                        <div className="space-y-3">
                            {/* Wrapping legend, never a fixed-height row: the
                                Thai labels are up to ~1.7x their English width
                                and must be free to take a second line. Order
                                mirrors the stack order, bottom segment first. */}
                            <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
                                {QUALITY_STACK.map((key) => (
                                    <li key={key} className="flex items-center gap-1.5 whitespace-nowrap">
                                        <span
                                            className="inline-block h-2.5 w-2.5 rounded-sm"
                                            style={{ backgroundColor: SERIES_COLORS[key] }}
                                            aria-hidden="true"
                                        />
                                        {seriesLabels[key]}
                                    </li>
                                ))}
                            </ul>
                            {/* RULE 7 */}
                            <DataTableView
                                caption={a.chart.tableCaption(a.qualityTrend.title)}
                                summaryLabel={a.chart.showTable}
                                columns={[
                                    { key: 'label', label: t.common.date },
                                    { key: 'report_damage', label: a.qualityTrend.damage, numeric: true },
                                    { key: 'scrap', label: a.qualityTrend.scrap, numeric: true },
                                    { key: 'repair', label: a.qualityTrend.repair, numeric: true },
                                ]}
                                rows={trendRows}
                            />
                        </div>
                    }
                >
                    {/* RULE 1 + RULE 2: three quality series only, stacked, in
                        QUALITY_STACK order. No movement series on this axis. */}
                    <BarChart data={analytics?.trend ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid {...GRID_PROPS} />
                        <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={12} />
                        <YAxis {...AXIS_PROPS} width={44} allowDecimals={false} />
                        <Tooltip
                            content={
                                <ChartTooltip
                                    seriesLabels={seriesLabels}
                                    order={QUALITY_STACK}
                                    totalLabel={t.common.total}
                                />
                            }
                            cursor={{ fill: 'rgba(15,42,82,0.05)' }}
                        />
                        {QUALITY_STACK.map((key) => (
                            <Bar
                                key={key}
                                dataKey={key}
                                stackId="quality"
                                name={seriesLabels[key]}
                                fill={SERIES_COLORS[key]}
                                // The 2px surface-coloured stroke that separates
                                // touching marks. A border would not do: the
                                // gap has to be transparent to the card beneath.
                                {...SEGMENT_GAP}
                                isAnimationActive={!reducedMotion}
                            />
                        ))}
                    </BarChart>
                </ChartFrame>
            </div>

            {/* --- DAMAGE FUNNEL --------------------------------------------- */}
            <div className="grid xl:col-span-2">
                {/* Hand-rolled, NOT Recharts' FunnelChart. That component lays
                    its stage labels out inside the SVG at a width derived from
                    the trapezoid, and Thai stage names ("ตัดออกจากระบบ") are
                    both too wide for it and unwrappable -- SVG <text> does not
                    wrap, so the label would be clipped or overlap its
                    neighbour. As HTML the labels wrap and nothing is truncated.
                    It is also not in a ChartFrame: that frame wraps its child in
                    a ResponsiveContainer, which exists to size an SVG. */}
                <Card accent busy={isRefreshing} as="section" className="animate-surface-in flex flex-col">
                    {/* `grow` for the same reason ChartFrame carries it: a grid
                        row stretches every card to the tallest one, and this
                        card's content -- a number, a split bar and three labels
                        -- is much shorter than the 260px histogram beside it.
                        Without this the "show table" strip stopped wherever the
                        content happened to end and left a band of white below
                        it, while the identical strip on the card next door sat
                        on the floor. `grow` and not `flex-1`: grow leaves
                        `flex-basis: auto`, so the card's natural height is still
                        its content height and only the surplus is distributed. */}
                    <div className="flex grow flex-col p-5 sm:p-6">
                        <SectionHeader
                            level="h3"
                            title={a.funnel.title}
                            subtitle={funnelSubtitle}
                            icon={FunnelIcon}
                            // RULE 3 on screen, at chip size: `reported` counts
                            // reports RAISED in this window, and `repaired` /
                            // `scrapped` count how many of THOSE were later
                            // closed. The cohort is defined by the window, so
                            // naming the window is part of naming the cohort.
                            action={rangeChip}
                        />

                        <div
                            className={`mt-4 ${isRefreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'}`}
                        >
                            {isLoading ? (
                                // First load only. isRefreshing above dims the
                                // real content instead: this app refetches on
                                // every realtime row change, and swapping in a
                                // skeleton each time would make the page strobe.
                                <div className="space-y-4" role="status" aria-label={t.common.loading}>
                                    {/* Shaped like what lands: the cohort
                                        figure, then the gauge's own box (13rem
                                        wide, 102/200 of that tall, flat-bottomed
                                        semicircle), then the legend. Matching
                                        the real geometry is what stops the card
                                        resizing when the data arrives. */}
                                    <Skeleton className="h-8 w-24" />
                                    <Skeleton className="mx-auto h-[6.4rem] w-full max-w-[13rem] rounded-t-full" />
                                    <SkeletonText lines={2} />
                                </div>
                            ) : funnelEmpty || !damage ? (
                                emptyState('card')
                            ) : (
                                <>
                                    {/* The cohort size -- the gauge's
                                        denominator, so it goes above it. */}
                                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                        <span className="text-sm text-slate-500">{a.funnel.reported}</span>
                                        {/* Proportional figures, not tabular:
                                            tabular-nums is for numbers stacked
                                            in a column, not a single display
                                            value. */}
                                        <span className="text-2xl font-semibold text-slate-900">
                                            {damage.reported}
                                        </span>
                                    </div>

                                    {/* The gauge REPLACED the horizontal split
                                        bar that used to sit here, rather than
                                        joining it: both encode the same three
                                        counts, and two pictures of one set of
                                        numbers only makes the reader check that
                                        they agree.

                                        What it adds over the bar is the middle.
                                        The resolution rate used to be a text
                                        line at the bottom of the card -- the one
                                        figure an admin actually acts on, set at
                                        14px under two other elements. In the
                                        hole it is the largest thing on the card,
                                        and the arc gives it the 0-100 frame that
                                        a bare percentage does not have.

                                        `funnelStages` is passed straight through
                                        in ramp order (repaired -> scrapped ->
                                        still open), so the filled part of the
                                        gauge is exactly the resolved part and
                                        the pale remainder is exactly what is
                                        still open. The gauge computes its own
                                        angles from the raw counts; `resolvedPct`
                                        is only ever the printed label. */}
                                    <div className="mt-4">
                                        <ResolutionGauge
                                            segments={funnelStages}
                                            percentLabel={`${resolvedPct}%`}
                                            caption={a.funnel.resolved}
                                            // The full sentence, not the bare
                                            // number: "75%" alone announces
                                            // nothing about what it measures.
                                            ariaLabel={a.funnel.resolutionRate(`${resolvedPct}%`)}
                                            reducedMotion={reducedMotion}
                                        />
                                    </div>

                                    {/* The stage labels: the highest-risk text
                                        on this card. They wrap and are never
                                        truncated. This is also the gauge's
                                        legend now -- same colours, same order --
                                        and the only place the three raw counts
                                        appear outside the data table. */}
                                    <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                                        {funnelStages.map((s) => (
                                            <li key={s.key} className="flex items-center gap-1.5">
                                                <span
                                                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                                                    style={{ backgroundColor: s.color }}
                                                    aria-hidden="true"
                                                />
                                                <span className="text-slate-600">{s.label}</span>
                                                <span className="font-semibold text-slate-900">{s.value}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </div>
                    </div>

                    {/* RULE 7. Same footer treatment ChartFrame gives its own
                        table view, so the four cards share one shape. */}
                    {!isLoading && !funnelEmpty && damage && (
                        <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3 sm:px-6">
                            <DataTableView
                                caption={a.chart.tableCaption(a.funnel.title)}
                                summaryLabel={a.chart.showTable}
                                columns={[
                                    // `status` and `total` come from the shared
                                    // vocabulary in locales/en.ts: the rows are
                                    // the states a damage report can be in, and
                                    // restating either word under `funnel` would
                                    // be a second Thai rendering of a word forty
                                    // other tables already use.
                                    { key: 'stage', label: t.common.status },
                                    { key: 'count', label: t.common.total, numeric: true },
                                ]}
                                rows={[
                                    { stage: a.funnel.reported, count: damage.reported },
                                    ...funnelStages.map((s) => ({ stage: s.label, count: s.value })),
                                ]}
                            />
                        </div>
                    )}
                </Card>
            </div>

            {/* --- TIME TO RESOLVE ------------------------------------------- */}
            <div className="grid xl:col-span-2">
                <ChartFrame
                    title={a.resolve.title}
                    subtitle={a.resolve.subtitle}
                    icon={Timer}
                    action={rangeChip}
                    // RULE 4: six bands on a 328px column. `aspect` would give
                    // the whole plot 164px there and squeeze them to 27px each.
                    // The band count comes off the data, and the pixels come off
                    // the shared pitch in chartTheme.ts -- the literal 260 that
                    // used to sit here was ~37px per band for an 18px bar, and
                    // this card is the tallest of the three in its row, so the
                    // slack it carried was also being handed to the funnel and
                    // the offenders table beside it.
                    //
                    // Counted off BAND_MAX_DAYS, NOT off resolveData: that array
                    // is empty while loading and while the range holds no closed
                    // report, and a height derived from it would give the
                    // skeleton a 40px box that jumped to 220px when the data
                    // landed. The band edges are fixed, so the height is too.
                    fixedPlotHeight={bandPlotHeight(BAND_MAX_DAYS.length)}
                    isLoading={isLoading}
                    isRefreshing={isRefreshing}
                    isEmpty={resolveEmpty}
                    emptyState={emptyState('plot')}
                    footer={
                        <div className="space-y-3">
                            {/* samples / median / p90, wrapping. These are the
                                three figures the histogram cannot show: how
                                many samples are behind it, and where the two
                                summary statistics actually land. */}
                            <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
                                <li className="whitespace-nowrap">
                                    {t.common.total}{' '}
                                    <span className="font-semibold text-slate-900">
                                        {resolution?.samples ?? 0}
                                    </span>
                                </li>
                                <li className="whitespace-nowrap">
                                    {a.resolve.median}{' '}
                                    <span className="font-semibold text-slate-900">
                                        {formatDuration(resolution?.medianHours ?? 0)}
                                    </span>
                                </li>
                                <li className="whitespace-nowrap">
                                    {/* `resolve` has no p90 key; `dwell.p90` is
                                        the name of the statistic itself
                                        ("90th percentile"), not trip-specific
                                        wording, so it carries across unchanged.
                                        `dwell.samples` does NOT -- it says
                                        "completed trips" -- which is why the
                                        count above uses common.total instead. */}
                                    {a.dwell.p90}{' '}
                                    <span className="font-semibold text-slate-900">
                                        {formatDuration(resolution?.p90Hours ?? 0)}
                                    </span>
                                </li>
                            </ul>
                            {/* RULE 7 */}
                            <DataTableView
                                caption={a.chart.tableCaption(a.resolve.title)}
                                summaryLabel={a.chart.showTable}
                                columns={[
                                    { key: 'label', label: a.resolve.title },
                                    { key: 'count', label: t.common.total, numeric: true },
                                ]}
                                rows={resolveData.map((d) => ({ label: d.label, count: d.count }))}
                            />
                        </div>
                    }
                >
                    {/* Horizontal bars (layout="vertical"), so the six band names
                        sit in the y-axis gutter and get its full width. Under
                        the x-axis of a vertical bar chart they would have ~48px
                        each on a phone; "เกิน 30 วัน" needs ~70px, and Recharts
                        silently DROPS ticks it cannot fit rather than
                        overlapping them -- so bands would just vanish. Rotating
                        them is not an option either: rotated Thai puts the tone
                        marks on their side. */}
                    <BarChart
                        data={resolveData}
                        layout="vertical"
                        margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                    >
                        {/* GRID_PROPS' colour and its absence of a dasharray are
                            kept; only the orientation flag flips, because in a
                            rotated bar chart the value axis is X and gridlines
                            have to cross it. Still solid, never dashed. */}
                        <CartesianGrid {...GRID_PROPS} horizontal={false} vertical />
                        <XAxis type="number" {...AXIS_PROPS} allowDecimals={false} />
                        <YAxis
                            type="category"
                            dataKey="label"
                            {...AXIS_PROPS}
                            // Wide enough for the longest Thai band name at
                            // 12px. interval 0 forces all six to render, so the
                            // axis never silently loses a category.
                            width={92}
                            interval={0}
                        />
                        <Tooltip
                            content={
                                <ChartTooltip
                                    seriesLabels={{ count: t.common.total }}
                                    order={['count']}
                                />
                            }
                            cursor={{ fill: 'rgba(15,42,82,0.05)' }}
                        />
                        {medianBandLabel && (
                            // Drawn on the categorical axis, so it marks the
                            // band the median falls in rather than an exact
                            // position. The white halo (stroke + paint-order)
                            // keeps the label readable where it crosses a bar.
                            <ReferenceLine
                                y={medianBandLabel}
                                stroke={CHART_CHROME.label}
                                strokeWidth={2}
                                label={{
                                    value: `${a.resolve.median} ${formatDuration(resolution?.medianHours ?? 0)}`,
                                    position: 'insideTopRight',
                                    fill: CHART_CHROME.label,
                                    fontSize: 12,
                                    stroke: CHART_CHROME.surface,
                                    strokeWidth: 3,
                                    paintOrder: 'stroke',
                                }}
                            />
                        )}
                        <Bar
                            dataKey="count"
                            name={t.common.total}
                            // One hue for a distribution. Colouring the bars
                            // darker-where-taller would double-encode bar
                            // length and break the categorical gates while
                            // adding no information.
                            fill={DISTRIBUTION_COLOR}
                            radius={[0, 4, 4, 0]}
                            isAnimationActive={!reducedMotion}
                        />
                    </BarChart>
                </ChartFrame>
            </div>

            {/* --- REPEAT OFFENDERS ------------------------------------------ */}
            <div className="grid xl:col-span-2">
                <Card accent busy={isRefreshing} as="section" className="animate-surface-in flex flex-col">
                    <div className="flex flex-col p-5 sm:p-6">
                        <SectionHeader
                            level="h3"
                            title={a.offenders.title}
                            subtitle={a.offenders.subtitle}
                            icon={Repeat}
                            // A pallet is listed after its SECOND damage report
                            // IN THIS WINDOW -- so "no repeat offenders" at 7
                            // days and three of them at 12 months are both
                            // correct, and the chip is what makes that legible.
                            action={rangeChip}
                        />

                        <div
                            className={`mt-4 ${isRefreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'}`}
                        >
                            {isLoading ? (
                                // Five rows of five, matching the real table's
                                // shape. The real rows are px-3 py-2 over a 20px
                                // line box (37px with the rule); a skeleton row
                                // is 35px, so the swap moves the card by ~2px a
                                // row rather than redrawing the layout.
                                <SkeletonRows rows={5} cols={5} ariaLabel={t.common.loading} />
                            ) : offendersEmpty ? (
                                // A range with no repeat offender in it is good
                                // news: the service only lists a pallet after
                                // its SECOND damage report in the window.
                                emptyState('card')
                            ) : (
                                // The scroll lives here, not on the page: five
                                // columns in a 357px card have to be able to
                                // move sideways without dragging the layout.
                                <div className="-mx-1 overflow-x-auto styled-scrollbar">
                                    <table className="w-full border-collapse text-sm">
                                        <caption className="sr-only">{a.offenders.title}</caption>
                                        <thead>
                                            <tr>
                                                <th scope="col" className={`${HEAD_CELL} text-left`}>
                                                    {a.offenders.palletId}
                                                </th>
                                                <th scope="col" className={`${HEAD_CELL} text-right`}>
                                                    {a.offenders.damageCount}
                                                </th>
                                                <th scope="col" className={`${HEAD_CELL} text-right`}>
                                                    {a.offenders.repairCount}
                                                </th>
                                                <th scope="col" className={`${HEAD_CELL} text-center`}>
                                                    {a.offenders.isScrapped}
                                                </th>
                                                <th scope="col" className={`${HEAD_CELL} text-left`}>
                                                    {a.offenders.lastEvent}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {offenders.map((o) => (
                                                <tr
                                                    key={o.palletId}
                                                    className={
                                                        'even:bg-slate-50/60 ' +
                                                        (rowsClickable
                                                            ? 'cursor-pointer transition-colors hover:bg-brand-50'
                                                            : '')
                                                    }
                                                    onClick={
                                                        rowsClickable
                                                            ? () => onSelectPallet?.(o.palletId)
                                                            : undefined
                                                    }
                                                >
                                                    <td className={`${CELL} text-left`}>
                                                        {rowsClickable ? (
                                                            // A <tr> click target
                                                            // is unreachable by
                                                            // keyboard, so the
                                                            // id is a real
                                                            // button. The row
                                                            // click is the mouse
                                                            // convenience on top
                                                            // of it, hence the
                                                            // stopPropagation.
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onSelectPallet?.(o.palletId);
                                                                }}
                                                                className="rounded-md font-medium text-brand-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                                                            >
                                                                {o.palletId}
                                                            </button>
                                                        ) : (
                                                            <span className="font-medium text-slate-800">
                                                                {o.palletId}
                                                            </span>
                                                        )}
                                                    </td>
                                                    {/* tabular-nums here and not
                                                        on the display figures
                                                        above: these ARE a
                                                        column and have to line
                                                        up digit over digit. */}
                                                    <td className={`${CELL} text-right tabular-nums`}>
                                                        {o.damageCount}
                                                    </td>
                                                    <td className={`${CELL} text-right tabular-nums`}>
                                                        {o.repairCount}
                                                    </td>
                                                    <td className={`${CELL} text-center`}>
                                                        {o.scrapped ? (
                                                            <>
                                                                {/* Icon and
                                                                    colour from
                                                                    PALLET_STATUS_META,
                                                                    so this cell
                                                                    cannot drift
                                                                    from the
                                                                    scrapped
                                                                    badge shown
                                                                    everywhere
                                                                    else. Never
                                                                    colour
                                                                    alone: the
                                                                    glyph and
                                                                    the label
                                                                    ship with
                                                                    it. */}
                                                                <ScrappedIcon
                                                                    size={14}
                                                                    className="inline-block"
                                                                    style={{
                                                                        color: PALLET_STATUS_META.scrapped.stroke,
                                                                    }}
                                                                    aria-hidden="true"
                                                                />
                                                                <span className="sr-only">
                                                                    {t.status.scrapped}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="text-slate-300" aria-hidden="true">
                                                                —
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className={`${CELL} text-left whitespace-nowrap`}>
                                                        {formatDate(o.lastEventISO)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};
