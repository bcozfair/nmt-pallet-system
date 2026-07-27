import React, { useMemo, useState } from 'react';
import {
    Area,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    Line,
    Pie,
    PieChart,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {
    AlertCircle,
    ArrowLeft,
    Ban,
    ChartColumnStacked,
    Inbox,
    MapPinOff,
    PieChart as PieChartIcon,
    TrendingUp,
} from 'lucide-react';

import { Card, ChartFrame, DataTableView, EmptyState, SectionHeader, SkeletonRows } from '../../../ui';
import { LocationRiskMatrix } from '../../charts/LocationRiskMatrix';
import {
    AXIS_PROPS,
    CHART_CHROME,
    DISTRIBUTION_COLOR,
    GRID_PROPS,
    MOVEMENT_SERIES,
    SERIES_COLORS,
    statusColor,
} from '../../charts/chartTheme';
import { AsOfNowChip, RangeMenu } from '../RangeMenu';
import type { DashboardAnalytics, LocationRow, TrendPoint } from '../../../../services/analytics/dashboardAnalytics';
import { OTHER_LOCATION_KEY } from '../../../../services/analytics/dashboardAnalytics';
import type { DashboardRange } from '../../../../hooks/dashboard/useDashboardData';
import { useReducedMotion } from '../../../../hooks/useReducedMotion';
import { useT } from '../../../../hooks/useT';
import type { ActionType, PalletStatus } from '../../../../types';

/**
 * "Fleet & flow" -- the first section of the redesigned analytics dashboard.
 *
 * Four cards: what the fleet is made of right now, how it has been moving over
 * the selected range, where the stock is sitting, and which of those places is
 * in trouble. It replaces FleetHealthCard, ActivityTrendCard, LocationUsageCard
 * and HighRiskZoneCard, and with them StatusDonutChart, ActivityTrendChart and
 * LocationInventoryChart -- three hand-rolled SVG charts, each with its own
 * hard-coded pixel height, its own tooltip and its own idea of what blue means.
 *
 * ===========================================================================
 * THE DEFECTS THIS FILE EXISTS TO FIX. Each is enforced below and each has a
 * comment at the site that enforces it -- they are cheap to reintroduce.
 *
 *   1. The movement chart plots MOVEMENT_SERIES only (check_out + check_in).
 *   2. The location bars are HORIZONTAL, so Thai names are never rotated.
 *   3. OTHER_LOCATION_KEY is a sentinel and is always relabelled.
 *   4. Plot height comes from `fixedPlotHeight`, not `minPlotHeight`.
 *   5. Every animated mark carries `isAnimationActive={!reducedMotion}`.
 *   6. Tooltips are HTML, so they size to their content.
 *   7. Every chart ships a DataTableView, outside the measured plot box.
 *   8. Axis and grid styling comes from AXIS_PROPS / GRID_PROPS.
 * ===========================================================================
 */

export interface FleetSectionProps {
    /** `null` until the first computation lands. */
    analytics: DashboardAnalytics | null;
    /** First load. Renders skeletons at the plot's final size. */
    isLoading: boolean;
    /** A refetch behind an already-populated screen. Dims, never unmounts. */
    isRefreshing?: boolean;
    /** The configured overdue threshold, from system_settings. */
    overdueDays: number;
    /**
     * The selected window, and the setter, for the ONE card here it applies to.
     *
     * Only the movement trend reads transactions. The donut, the location bars
     * and the risk list are all counted from the pallet table as of right now,
     * which is why they wear AsOfNowChip instead -- see RangeMenu.tsx.
     */
    range: DashboardRange;
    onRangeChange: (range: DashboardRange) => void;
    onNavigate: (filter: string, location?: string) => void;
}

// --- SIZING -----------------------------------------------------------------
//
// Measured content widths, which is why the numbers below look arbitrary:
//   360 -> 328px   768 -> 736px   1024 -> 704px   1440 -> 1120px
// 1024 is NARROWER than 768 because the admin sidebar claims 256px from `lg`
// upwards. The columns therefore step at `md` and `xl` and skip `lg` entirely;
// `lg` belongs to the shell.
//
// Every chart here uses `fixedPlotHeight` rather than `aspect` + `minPlotHeight`.
// Verified against recharts 3.10.1 and documented on ChartFrame: `minPlotHeight`
// only writes `min-height` to the wrapper div, while the SVG is still sized at
// measuredWidth / aspect. Below the floor you get a reserved box with the plot
// sitting in the top of it and slack underneath -- no layout shift, but no extra
// plot either. The widest any of these cards gets is 1120px and the narrowest is
// 328px, so an aspect that is legible at one end is a strip at the other.
// The donut's plot box. Recharts derives a pie's radius from
// min(plotWidth, plotHeight), and this plot is now the full width of the card
// (309px at xl, 288px on a phone) -- so the HEIGHT is what binds, and this
// number is the donut's diameter budget: 220 * 0.92 (outerRadius) = ~202px
// across. It was 240 while the legend sat beside the plot, but the legend took
// ~174px of the width and left 111px, so min() picked the width and the donut
// drew at ~102px inside a 240px box. Ten pixels shorter, twice as big.
const DONUT_PLOT_HEIGHT = 220;
const TREND_PLOT_HEIGHT = 260;
// Row-count driven: one 20px bar plus breathing room, floored so a single
// location does not produce a 68px-tall card.
const LOCATION_ROW_HEIGHT = 32;
const LOCATION_PLOT_MIN = 180;
const LOCATION_PLOT_PAD = 48;

// The y-axis gutter for the horizontal location bars, and the point at which a
// label is truncated into it. At the 12px tick size set by AXIS_TICK_PROPS a
// Thai glyph advances roughly 7.5px, so 14 characters plus an ellipsis fits
// inside 128px with padding to spare. The full string is never lost: it is in
// the tooltip and in the DataTableView below the chart.
const LOCATION_AXIS_WIDTH = 128;
const LOCATION_LABEL_MAX = 14;

// --- SMALL PRESENTATIONAL PIECES --------------------------------------------

/**
 * The one tooltip shape used by all three charts.
 *
 * HTML, via `<Tooltip content={...} />`, never the SVG default. The tooltip
 * being replaced was an SVG `<foreignObject>`-free hand-rolled box with
 * `width="120"` baked in, which is the entire reason locales/admin/dashboard.ts
 * still carries `tooltipDamage` and `tooltipAcquisition` -- separate, shorter
 * Thai strings that existed only because the full ones did not fit. An HTML box
 * sizes to its content, so the shortened forms are not needed here.
 *
 * `dangerouslySetInnerHTML` is not used and must not be: `title` below is a
 * department name straight out of the database.
 */
const ChartTooltip: React.FC<{
    title: string;
    rows: readonly { key: string; label: string; value: string; swatch?: string }[];
}> = ({ title, rows }) => (
    // max-w rather than a fixed width, and `break-words` so a long department
    // name wraps instead of pushing the box off the card. Thai has no spaces to
    // break at, so this is the one place a mid-word break is the lesser evil --
    // the axis and the table both still carry the name unbroken.
    <div className="max-w-[20rem] rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
        <p className="text-xs font-semibold break-words text-slate-800">{title}</p>
        <ul className="mt-1.5 space-y-1">
            {rows.map((row) => (
                <li key={row.key} className="flex items-center justify-between gap-4 text-xs">
                    <span className="flex min-w-0 items-center gap-1.5 text-slate-600">
                        {row.swatch && (
                            <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ backgroundColor: row.swatch }}
                                aria-hidden="true"
                            />
                        )}
                        <span className="break-words">{row.label}</span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-slate-900">{row.value}</span>
                </li>
            ))}
        </ul>
    </div>
);

/**
 * A chart legend.
 *
 * `flex flex-wrap` with a row AND column gap, every item `whitespace-nowrap`,
 * and no fixed height anywhere. A Thai legend label runs 1.4-1.7x the width of
 * its English source with no spaces inside it to wrap at, so a fixed-height
 * single-line legend row either clips or overflows the moment the language
 * changes. Wrapping to a second line is the only behaviour that survives both.
 */
const ChartLegend: React.FC<{
    items: readonly { key: string; label: string; color: string; shape: 'dot' | 'line' }[];
}> = ({ items }) => (
    <ul className="flex min-h-6 flex-wrap items-center gap-x-4 gap-y-2">
        {items.map((item) => (
            <li key={item.key} className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-600">
                <span
                    className={item.shape === 'dot' ? 'h-2.5 w-2.5 rounded-full' : 'h-0.5 w-4 rounded-full'}
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                />
                {item.label}
            </li>
        ))}
    </ul>
);

// --- SECTION ----------------------------------------------------------------

export const FleetSection: React.FC<FleetSectionProps> = ({
    analytics,
    isLoading,
    isRefreshing = false,
    overdueDays,
    range,
    onRangeChange,
    onNavigate,
}) => {
    const t = useT();

    // Recharts animates in JavaScript -- it interpolates path `d` frame by frame
    // -- so the `prefers-reduced-motion` block in index.css cannot reach a single
    // mark on this page. `isAnimationActive` is the only lever, and it needs the
    // preference as a JS boolean. Read once here and passed to every Pie, Line,
    // Area and Bar below.
    const reducedMotion = useReducedMotion();

    const fleet = analytics?.fleet ?? null;
    const trend = analytics?.trend ?? [];

    // -- Fleet health ---------------------------------------------------------
    // Three statuses, never four. `fleet.total` already excludes scrapped
    // pallets (dashboardAnalytics.ts:667), so these three sum to exactly 100%.
    // A scrapped slice would break that identity and, worse, would imply that a
    // written-off pallet is part of the fleet. It is a footnote instead.
    // Which slice the pointer (or keyboard focus, via the legend rows) is on.
    // null = nothing hovered, so the hole shows the fleet total. The chart this
    // replaced had exactly this behaviour hand-rolled in SVG; it was lost in the
    // move to Recharts and is the one interaction the card genuinely needs.
    const [activeSlice, setActiveSlice] = useState<number | null>(null);

    const donutData = useMemo(() => {
        if (!fleet) return [];
        const statuses: PalletStatus[] = ['available', 'in_use', 'damaged'];
        const denominator = fleet.total || 1;
        return statuses.map((status) => ({
            status,
            label: t.status[status],
            value: status === 'available' ? fleet.available : status === 'in_use' ? fleet.in_use : fleet.damaged,
            color: statusColor(status),
            percent: ((status === 'available' ? fleet.available : status === 'in_use' ? fleet.in_use : fleet.damaged) / denominator) * 100,
        }));
    }, [fleet, t]);

    // A zero-count status draws no arc, but `paddingAngle` still reserves a gap
    // for it -- so an empty status would appear as a notch cut out of a
    // neighbour for no reason. Filtered for the CHART only: the legend and the
    // table still list it, because "damaged: 0" is information.
    const donutSlices = useMemo(() => donutData.filter((d) => d.value > 0), [donutData]);

    // -- Movement -------------------------------------------------------------
    // Labels for the two movement series. Read from the analytics dictionary
    // rather than from `t.action`: those are the names of transaction types on a
    // badge, whereas these label a series in a legend and are read as quantities.
    const movementLabel: Record<ActionType, string> = {
        check_out: t.dashboard.analytics.movement.checkOut,
        check_in: t.dashboard.analytics.movement.checkIn,
        report_damage: t.dashboard.analytics.qualityTrend.damage,
        repair: t.dashboard.analytics.qualityTrend.repair,
        scrap: t.dashboard.analytics.qualityTrend.scrap,
    };

    // -- Stock by location ----------------------------------------------------
    // The sentinel is resolved to a display label exactly here, once. Everything
    // downstream -- axis tick, tooltip, table row -- reads `label`, so the raw
    // '__other__' cannot reach the screen through any of the three paths.
    const locationData = useMemo(() => {
        const rows: LocationRow[] = fleet?.byLocation ?? [];
        return rows.map((row) => {
            const isOther = row.name === OTHER_LOCATION_KEY;
            return {
                name: row.name,
                label: isOther ? t.dashboard.analytics.chart.othersLabel : row.name,
                isOther,
                count: row.count,
                overdue: row.overdue,
                damaged: row.damaged,
            };
        });
    }, [fleet, t]);

    // -- High-risk zones ------------------------------------------------------
    // The folded tail is dropped before the risk list sees it. `__other__` is an
    // aggregate of every location past the 12th by holdings, so its issue ratio
    // is an average of a dozen unrelated places -- ranking it against a single
    // real department would be meaningless, and it is not somewhere an admin can
    // navigate to. It stays in the bar chart above, where a total is legitimate.
    const riskRows = useMemo(
        () => (fleet?.byLocation ?? []).filter((row) => row.name !== OTHER_LOCATION_KEY),
        [fleet],
    );

    const locationPlotHeight = Math.max(
        LOCATION_PLOT_MIN,
        locationData.length * LOCATION_ROW_HEIGHT + LOCATION_PLOT_PAD,
    );

    /**
     * Truncation for the y-axis category ticks.
     *
     * A `tickFormatter` and a trailing ellipsis, never `<Text breakAll>`: that
     * prop breaks at an arbitrary code point, which in Thai lands inside a
     * syllable and detaches a vowel or a tone mark from the consonant it belongs
     * to. And never `writing-mode: vertical-rl`, which is what
     * LocationInventoryChart.tsx:77 does today -- it stacks Thai glyphs down the
     * page one at a time and the combining marks come off entirely.
     */
    const truncateTick = (value: string): string =>
        value.length > LOCATION_LABEL_MAX ? `${value.slice(0, LOCATION_LABEL_MAX - 1)}…` : value;

    const tableSummary = t.dashboard.analytics.chart.showTable;
    const hasFleet = !!fleet && fleet.total > 0;
    const hasTrend = trend.length > 0 && trend.some((p) => p.check_out > 0 || p.check_in > 0);
    const hasLocations = locationData.length > 0;

    return (
        // SIX columns at xl, not three, and the reason is arithmetic: this
        // section needs a 1:2 row (donut | movement) and a 1:1 row (locations |
        // risk), and 3 is not divisible by 2. Six is the lowest common multiple,
        // so both splits are exact and neither row needs a nested grid.
        //
        // The top row is pixel-identical to the three-column version it
        // replaces: at a 1120px content width, 6 tracks with 5 x 24px gaps give
        // (1120 - 120) / 6 = 166.67px each, so a 2-span plus its internal gap is
        // 357px -- the same as one third of a 3-column grid. Only the second row
        // moved.
        //
        // Columns step at md and xl and skip lg entirely: the sidebar claims
        // 256px from lg up, which is why the measured content width at 1024px
        // (704px) is NARROWER than at 768px (736px).
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-6">
            {/* ---------------------------------------------------------------
                FLEET HEALTH
                ChartFrame has no className hook, so the span class goes on a
                wrapper. `grid` on that wrapper rather than nothing: a grid
                container with a single child stretches it to the row height, so
                the cards in a row end flush. `h-full` would do the same thing by
                resolving a percentage against a parent with no definite height,
                which is the collapse-to-zero trap ChartFrame documents.
                --------------------------------------------------------------- */}
            <div className="grid xl:col-span-2">
                <ChartFrame
                    title={t.dashboard.fleetHealth}
                    subtitle={t.dashboard.fleetHealthSub}
                    icon={PieChartIcon}
                    // The TOTAL moved into the donut's hole -- the same number
                    // twice, 40px apart, only makes the reader check whether the
                    // two agree. What sits here instead is the scope: these
                    // three counts come from the pallet table and do not move
                    // when the range on the card beside this one changes.
                    action={<AsOfNowChip />}
                    fixedPlotHeight={DONUT_PLOT_HEIGHT}
                    isLoading={isLoading}
                    isRefreshing={isRefreshing}
                    isEmpty={!hasFleet}
                    emptyState={
                        // NOT the range-aware message. The fleet counts are "as
                        // of right now" and come from the pallet table, not from
                        // the range -- telling an admin with an empty fleet to
                        // widen the range would promise something a wider range
                        // can never deliver.
                        <EmptyState variant="plot" icon={Inbox} title={t.common.noData} />
                    }
                    // The hole. Reads as the fleet total until a slice is
                    // hovered or focused, then as that slice.
                    plotOverlay={
                        <div className="text-center leading-tight">
                            {activeSlice !== null && donutSlices[activeSlice] ? (
                                <>
                                    <p className="text-2xl font-semibold tracking-tight text-slate-900">
                                        {donutSlices[activeSlice].value}
                                    </p>
                                    <p className="mt-0.5 text-xs font-medium text-slate-500">
                                        {donutSlices[activeSlice].label}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {donutSlices[activeSlice].percent.toFixed(1)}%
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="text-3xl font-semibold tracking-tight text-slate-900">
                                        {fleet?.total ?? 0}
                                    </p>
                                    <p className="mt-0.5 text-xs font-medium text-slate-500">
                                        {t.dashboard.analytics.kpi.totalFleet}
                                    </p>
                                </>
                            )}
                        </div>
                    }
                    // The legend, UNDER the donut and across the full card, in
                    // three columns -- one per status. It used to sit beside the
                    // plot; see the DONUT_PLOT_HEIGHT note for what that cost.
                    //
                    // Three columns rather than three rows: the figures still
                    // line up with each other (across, now, instead of down),
                    // and three short blocks side by side are ~58px tall where
                    // three full-width rows would be ~98px -- 40px that goes
                    // back into the donut instead.
                    plotFooter={
                        <ul className="grid grid-cols-3 gap-1">
                            {donutData.map((d) => {
                                const sliceIndex = donutSlices.findIndex((x) => x.status === d.status);
                                const isActive = sliceIndex !== -1 && sliceIndex === activeSlice;
                                return (
                                    <li key={d.status}>
                                        {/* A real button, so the hole responds to
                                            keyboard focus too -- otherwise the
                                            per-slice figures are reachable only
                                            with a pointer. The percentages are
                                            printed here as well, so nothing
                                            depends on hovering at all. */}
                                        <button
                                            type="button"
                                            onMouseEnter={() => setActiveSlice(sliceIndex === -1 ? null : sliceIndex)}
                                            onMouseLeave={() => setActiveSlice(null)}
                                            onFocus={() => setActiveSlice(sliceIndex === -1 ? null : sliceIndex)}
                                            onBlur={() => setActiveSlice(null)}
                                            className={
                                                'flex w-full flex-col gap-1 rounded-lg px-2 py-1.5 text-left transition ' +
                                                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ' +
                                                (isActive ? 'bg-slate-100' : 'hover:bg-slate-50')
                                            }
                                        >
                                            {/* `items-start` and no truncation:
                                                a column here is ~88px wide on a
                                                phone and "พร้อมใช้งาน" is ~77px
                                                at this size, so the label has to
                                                be free to take a second line.
                                                Thai has no inter-word spaces, so
                                                truncating it instead would cut a
                                                syllable in half. */}
                                            <span className="flex items-start gap-1.5">
                                                <span
                                                    className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                                                    style={{ backgroundColor: d.color }}
                                                    aria-hidden="true"
                                                />
                                                <span className="min-w-0 text-xs leading-snug text-slate-600">
                                                    {d.label}
                                                </span>
                                            </span>
                                            <span className="flex items-baseline gap-1.5">
                                                <span className="text-lg font-semibold text-slate-900">
                                                    {d.value}
                                                </span>
                                                {/* slate-500, not slate-400.
                                                    slate-400 measures 2.56:1 on
                                                    white -- legal as decoration,
                                                    illegal as text, and this is
                                                    a figure someone reads. */}
                                                <span className="text-xs text-slate-500">
                                                    {d.percent.toFixed(1)}%
                                                </span>
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    }
                    footer={
                        <div className="space-y-3">
                            {/* Scrapped: a footnote line, never a fourth slice. */}
                            {!!fleet && fleet.scrapped > 0 && (
                                <p className="flex items-start gap-1.5 text-xs text-slate-500">
                                    <Ban size={14} className="mt-px shrink-0" aria-hidden="true" />
                                    <span>{t.dashboard.scrappedFootnote(fleet.scrapped)}</span>
                                </p>
                            )}

                            <DataTableView
                                caption={t.dashboard.analytics.chart.tableCaption(t.dashboard.fleetHealth)}
                                summaryLabel={tableSummary}
                                columns={[
                                    { key: 'label', label: t.common.status },
                                    { key: 'count', label: t.common.total, numeric: true },
                                ]}
                                rows={donutData.map((d) => ({ label: d.label, count: d.value }))}
                            />
                        </div>
                    }
                >
                    <PieChart>
                        <Tooltip
                            content={(props) => {
                                const { active, payload } = props;
                                if (!active || !payload || payload.length === 0) return null;
                                const slice = payload[0];
                                const datum = donutData.find((d) => d.label === slice.name);
                                return (
                                    <ChartTooltip
                                        title={String(slice.name ?? '')}
                                        rows={[
                                            {
                                                key: 'count',
                                                label: t.common.total,
                                                value: t.dashboard.unitsCount(Number(slice.value ?? 0)),
                                                swatch: datum?.color,
                                            },
                                        ]}
                                    />
                                );
                            }}
                        />
                        <Pie
                            data={donutSlices}
                            dataKey="value"
                            nameKey="label"
                            innerRadius="68%"
                            outerRadius="92%"
                            // 12 o'clock, clockwise. A pie starting at 3 o'clock
                            // asks the reader to hunt for the first slice;
                            // starting at the top makes reading order and draw
                            // order the same.
                            startAngle={90}
                            endAngle={-270}
                            // paddingAngle IS the gap here, in place of the 2px
                            // surface-coloured stroke SEGMENT_GAP draws. A real
                            // gap plus rounded ends already reads as separate
                            // arcs; a white stroke on top would thicken the same
                            // seam twice.
                            paddingAngle={donutSlices.length > 1 ? 3 : 0}
                            cornerRadius={6}
                            stroke="none"
                            onMouseEnter={(_, index) => setActiveSlice(index)}
                            onMouseLeave={() => setActiveSlice(null)}
                            isAnimationActive={!reducedMotion}
                        >
                            {donutSlices.map((d, index) => (
                                // Dimming the others rather than exploding the
                                // active one: an offset slice changes the arc
                                // lengths the eye is comparing, which is the one
                                // thing this chart exists to show.
                                <Cell
                                    key={d.status}
                                    fill={d.color}
                                    opacity={activeSlice === null || activeSlice === index ? 1 : 0.3}
                                    className="transition-opacity duration-200"
                                />
                            ))}
                        </Pie>
                    </PieChart>
                </ChartFrame>
            </div>

            {/* ---------------------------------------------------------------
                MOVEMENT TREND
                --------------------------------------------------------------- */}
            <div className="grid md:col-span-1 xl:col-span-4">
                <ChartFrame
                    title={t.dashboard.analytics.movement.title}
                    subtitle={t.dashboard.analytics.movement.subtitle}
                    icon={TrendingUp}
                    // The only range-scoped card in this section. With the
                    // deep-dive panel collapsed it is the only one on the whole
                    // page, which is precisely why a page-level range bar read
                    // as a filter that did nothing.
                    action={<RangeMenu value={range} onChange={onRangeChange} />}
                    fixedPlotHeight={TREND_PLOT_HEIGHT}
                    isLoading={isLoading}
                    isRefreshing={isRefreshing}
                    isEmpty={!hasTrend}
                    emptyState={
                        // This chart IS range-scoped, so here the range-aware
                        // message is the honest one.
                        <EmptyState
                            variant="plot"
                            icon={TrendingUp}
                            title={t.dashboard.analytics.chart.noDataInRange}
                            hint={t.dashboard.analytics.chart.widenRange}
                        />
                    }
                    footer={
                        <div className="space-y-3">
                            <ChartLegend
                                items={MOVEMENT_SERIES.map((series) => ({
                                    key: series,
                                    label: movementLabel[series],
                                    color: SERIES_COLORS[series],
                                    shape: 'line' as const,
                                }))}
                            />
                            <DataTableView
                                caption={t.dashboard.analytics.chart.tableCaption(
                                    t.dashboard.analytics.movement.title,
                                )}
                                summaryLabel={tableSummary}
                                columns={[
                                    { key: 'label', label: t.common.date },
                                    { key: 'check_out', label: movementLabel.check_out, numeric: true },
                                    { key: 'check_in', label: movementLabel.check_in, numeric: true },
                                ]}
                                rows={trend.map((point) => ({
                                    label: point.label,
                                    check_out: point.check_out,
                                    check_in: point.check_in,
                                }))}
                            />
                        </div>
                    }
                >
                    {/* ===========================================================
                        MOVEMENT_SERIES ONLY -- check_out and check_in. Do NOT add
                        report_damage, repair or scrap to this chart.

                        Two independent reasons, either one sufficient:

                        (a) SCALE. Check-outs run 10-100x the volume of damage
                            events in this warehouse. Co-plotting them on one
                            linear axis pins the damage line to zero and flattens
                            the movement pair into the top of the plot -- which is
                            exactly why ActivityTrendChart, the chart this
                            replaces, reads as three flat lines. The quality
                            series get their own chart with their own axis.

                        (b) COLOUR. chartTheme.ts records the measurements: slot 1
                            (blue #2365c7) and slot 4 (violet #6d4bc4) collapse to
                            dE 0.6 under deuteranopia, and red vs green measures
                            dE 5.9. Only the check_out/check_in pair passes the
                            all-pairs test as free-standing lines (CVD dE 17.5).
                            The quality trio is safe only as an adjacent stack.
                        =========================================================== */}
                    <ComposedChart data={trend} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                        {/* Solid gridlines, horizontal only. Dashes add texture
                            that competes with the data at this size. */}
                        <CartesianGrid {...GRID_PROPS} />
                        <XAxis
                            {...AXIS_PROPS}
                            dataKey="label"
                            // The narrowest this card gets is ~356px at `md`, so
                            // the ticks have to be allowed to thin out rather
                            // than overlap. Never rotated -- see the y-axis note
                            // on the location chart for why.
                            minTickGap={24}
                            interval="preserveStartEnd"
                        />
                        <YAxis {...AXIS_PROPS} width={40} allowDecimals={false} />
                        <Tooltip
                            cursor={{ stroke: CHART_CHROME.axis, strokeWidth: 1 }}
                            content={(props) => {
                                const { active, payload } = props;
                                if (!active || !payload || payload.length === 0) return null;
                                const point = payload[0].payload as TrendPoint;
                                return (
                                    <ChartTooltip
                                        title={point.label}
                                        rows={MOVEMENT_SERIES.map((series) => ({
                                            key: series,
                                            label: movementLabel[series],
                                            value: String(point[series]),
                                            swatch: SERIES_COLORS[series],
                                        }))}
                                    />
                                );
                            }}
                        />

                        {/* One Area wash plus one Line per series. The wash sits
                            at 12% alpha -- enough to give the line a body at a
                            glance, not enough to read as a filled region or to
                            hide the other series where the two cross. */}
                        {MOVEMENT_SERIES.map((series) => (
                            <Area
                                key={`area-${series}`}
                                type="monotone"
                                dataKey={series}
                                stroke="none"
                                fill={SERIES_COLORS[series]}
                                fillOpacity={0.12}
                                isAnimationActive={!reducedMotion}
                                // The Line below carries the legend and the
                                // tooltip; the wash must not duplicate either.
                                legendType="none"
                                tooltipType="none"
                            />
                        ))}
                        {MOVEMENT_SERIES.map((series) => (
                            <Line
                                key={`line-${series}`}
                                type="monotone"
                                dataKey={series}
                                stroke={SERIES_COLORS[series]}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4, stroke: CHART_CHROME.surface, strokeWidth: 2 }}
                                isAnimationActive={!reducedMotion}
                            />
                        ))}
                    </ComposedChart>
                </ChartFrame>
            </div>

            {/* ---------------------------------------------------------------
                STOCK BY LOCATION
                Half the row from xl up, sharing it with the risk list below --
                3 of 6 columns, 548px at a 1120px content width. The two belong
                side by side: they are the same `fleet.byLocation` rows read two
                ways, "how much is where" and "where is it going wrong", and
                stacked full-width they made the reader scroll between a bar and
                the list that explains it.

                Still full width at md. Half of 736px is a 356px card, and this
                chart spends 128px of its inner width on the y-axis gutter that
                holds the Thai department names -- which would leave ~156px of
                actual plot.
                --------------------------------------------------------------- */}
            <div className="grid md:col-span-2 xl:col-span-3">
                <ChartFrame
                    title={t.dashboard.locationUsage}
                    subtitle={t.dashboard.locationUsageSub}
                    icon={ChartColumnStacked}
                    // byLocation is grouped from each pallet's
                    // `current_location`, not from the transactions in the
                    // window, so this chart is identical at 7 days and at 12
                    // months. Saying so is the whole job of the chip.
                    action={<AsOfNowChip />}
                    fixedPlotHeight={locationPlotHeight}
                    isLoading={isLoading}
                    isRefreshing={isRefreshing}
                    isEmpty={!hasLocations}
                    emptyState={
                        // Also not range-aware: byLocation is computed from the
                        // pallet table's current_location, not from the
                        // transaction window. This string is the one written for
                        // exactly this case -- no pallets are out anywhere.
                        <EmptyState variant="plot" icon={MapPinOff} title={t.dashboard.noLocationData} />
                    }
                    footer={
                        <DataTableView
                            caption={t.dashboard.analytics.chart.tableCaption(t.dashboard.locationUsage)}
                            summaryLabel={tableSummary}
                            columns={[
                                // The UNTRUNCATED name lives here, which is what
                                // makes truncating the axis tick acceptable.
                                { key: 'label', label: t.common.location },
                                { key: 'count', label: t.common.total, numeric: true },
                                { key: 'overdue', label: t.dashboard.overdue, numeric: true },
                                { key: 'damaged', label: t.status.damaged, numeric: true },
                            ]}
                            rows={locationData.map((row) => ({
                                label: row.label,
                                count: row.count,
                                overdue: row.overdue,
                                damaged: row.damaged,
                            }))}
                        />
                    }
                >
                    {/* ===========================================================
                        layout="vertical" -- HORIZONTAL BARS. Non-negotiable.

                        The chart this replaces puts department names under a
                        vertical bar and rotates them with
                        `writing-mode: vertical-rl` (LocationInventoryChart.tsx:77).
                        In Thai that stacks the glyphs one above another down the
                        page and strands every tone mark and upper vowel beside
                        the consonant it belongs to instead of above it. The names
                        become unreadable in one language and merely sideways in
                        the other, so the bug is invisible to an English reviewer.

                        Category labels belong on the y-axis of a horizontal bar
                        chart, where they get the full width of a gutter, sit
                        upright, and never need rotating.
                        =========================================================== */}
                    <BarChart
                        data={locationData}
                        layout="vertical"
                        margin={{ top: 4, right: 24, bottom: 4, left: 0 }}
                    >
                        {/* GRID_PROPS carries the stroke and the no-dash rule.
                            Only the ORIENTATION flips: with horizontal bars the
                            useful rules run down the value axis, not across it. */}
                        <CartesianGrid {...GRID_PROPS} vertical horizontal={false} />
                        <XAxis {...AXIS_PROPS} type="number" allowDecimals={false} />
                        <YAxis
                            {...AXIS_PROPS}
                            type="category"
                            dataKey="label"
                            // Real room for the gutter, and every category shown
                            // (`interval={0}`) -- Recharts will otherwise drop
                            // every other name to make room, which silently hides
                            // locations rather than truncating them.
                            width={LOCATION_AXIS_WIDTH}
                            interval={0}
                            tickFormatter={truncateTick}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(15,42,82,0.04)' }}
                            content={(props) => {
                                const { active, payload } = props;
                                if (!active || !payload || payload.length === 0) return null;
                                const row = payload[0].payload as (typeof locationData)[number];
                                return (
                                    // The full, untruncated name. This is the
                                    // other half of the y-axis truncation deal.
                                    <ChartTooltip
                                        title={row.label}
                                        rows={[
                                            {
                                                key: 'count',
                                                label: t.common.total,
                                                value: t.dashboard.unitsCount(row.count),
                                                swatch: DISTRIBUTION_COLOR,
                                            },
                                            { key: 'overdue', label: t.dashboard.overdue, value: String(row.overdue) },
                                            { key: 'damaged', label: t.status.damaged, value: String(row.damaged) },
                                        ]}
                                    />
                                );
                            }}
                        />
                        <Bar
                            dataKey="count"
                            // One hue for every bar. Ramping the colour with the
                            // value would double-encode bar length: the reader
                            // already has the length, and the second signal
                            // carries no new information while breaking the
                            // categorical colour gates by construction.
                            fill={DISTRIBUTION_COLOR}
                            barSize={20}
                            // Rounded on the DATA end only -- [tl, tr, br, bl].
                            // Rounding the baseline end too would detach the bar
                            // from its axis and make short bars read as floating.
                            radius={[0, 6, 6, 0]}
                            isAnimationActive={!reducedMotion}
                            style={{ cursor: 'pointer' }}
                            onClick={(_, index) => {
                                const row = locationData[index];
                                // The folded tail is not a place, so it is not a
                                // navigation target.
                                if (row && !row.isOther) onNavigate('all', row.name);
                            }}
                        />
                    </BarChart>
                </ChartFrame>
            </div>

            {/* ---------------------------------------------------------------
                HIGH-RISK ZONES
                A list, not a chart -- so it gets a plain Card rather than a
                ChartFrame. ChartFrame wraps its children in a
                ResponsiveContainer, which expects a Recharts element and would
                measure a <ul> as a plot.

                The other half of the second row (3 of 6 columns). Nothing about
                the rows needs the full width: the name truncates, and the two
                counters plus the issue chip on the right take ~150px whatever
                the card measures.
                --------------------------------------------------------------- */}
            <Card
                accent
                busy={isRefreshing}
                as="section"
                className="animate-surface-in flex flex-col md:col-span-2 xl:col-span-3"
            >
                {/* `grow` for the same reason ChartFrame carries it: this card
                    now shares a stretched grid row with the location chart, and
                    the "view all overdue" strip belongs on the card floor
                    whichever of the two happens to be taller. */}
                <div className="flex grow flex-col p-5 sm:p-6">
                    <SectionHeader
                        level="h3"
                        title={t.dashboard.highRiskZones}
                        subtitle={t.dashboard.highRiskZonesSub}
                        icon={AlertCircle}
                        action={
                            // Surfaces the configured threshold, because every
                            // "overdue" number in the list below is relative to
                            // it and it is an admin-editable setting.
                            //
                            // This is also why the card carries NO AsOfNowChip,
                            // even though it is as-of-now like the two above it:
                            // the header's action slot is `shrink-0`, and this
                            // chip already runs ~200px in Thai ("ไม่มีความ
                            // เคลื่อนไหวเกิน 7 วัน") against a 288px content box
                            // at a 360px viewport. A second chip beside it would
                            // push the row past the card. The threshold is the
                            // more specific statement of scope anyway, and the
                            // chart directly above -- same `fleet.byLocation`
                            // data -- does carry the chip.
                            //
                            // Same box as AsOfNowChip (min-h-8, rounded-lg,
                            // text-xs): every chip in a card header on this
                            // dashboard is one shape, so the eye reads the
                            // difference as meaning rather than as styling.
                            <span className="inline-flex min-h-8 items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-slate-700">
                                {t.dashboard.criticalOverdueSub(overdueDays)}
                            </span>
                        }
                    />

                    {/* min-h, never h: the rows carry Thai department names that
                        wrap to a second line, and a fixed height would clip them
                        in one language only. */}
                    <div className="mt-4 flex min-h-[10rem] flex-col">
                        {isLoading ? (
                            <SkeletonRows rows={4} cols={3} />
                        ) : (
                            <div className={isRefreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                                <LocationRiskMatrix
                                    rows={riskRows}
                                    threshold={overdueDays}
                                    onLocationSelect={(loc) => onNavigate('all', loc)}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3 sm:px-6">
                    <button
                        type="button"
                        onClick={() => onNavigate('overdue')}
                        className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 ring-1 ring-slate-200 transition-colors hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                    >
                        {t.dashboard.viewAllOverdue}
                        <ArrowLeft className="rotate-180" size={16} aria-hidden="true" />
                    </button>
                </div>
            </Card>
        </div>
    );
};
