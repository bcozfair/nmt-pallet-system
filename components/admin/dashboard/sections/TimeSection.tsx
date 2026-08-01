import React, { useId, useMemo, useState } from 'react';
import { CalendarClock, CalendarDays } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import type { TooltipContentProps } from 'recharts';
import { Card, ChartFrame, DataTableView, EmptyState, SectionHeader } from '../../../ui';
import {
    AXIS_PROPS,
    DISTRIBUTION_COLOR,
    GRID_PROPS,
    HEAT_EMPTY_CLASS,
    HEAT_SCALE,
    bandPlotHeight,
    heatColor,
} from '../../charts/chartTheme';
import { RangeMenu } from '../RangeMenu';
import type { DashboardRange } from '../../../../hooks/dashboard/useDashboardData';
import { useReducedMotion } from '../../../../hooks/useReducedMotion';
import { useT } from '../../../../hooks/useT';
import type { DashboardAnalytics } from '../../../../services/analytics/dashboardAnalytics';

/**
 * When transactions get recorded: an hour x weekday heatmap and the weekday
 * totals beside it.
 *
 * ========================= WHY THE HEATMAP IS A TABLE ======================
 *
 * It is hand-rolled CSS, NOT Recharts. Recharts has no heatmap primitive, and
 * the usual workaround -- <Scatter> with a custom square shape -- is worse on
 * every axis that matters here: it cannot carry a Thai row label without
 * <Text>, it puts 168 SVG nodes in an animated chart, and it is invisible to a
 * screen reader.
 *
 * It is also a REAL <table>: <th scope="row"> for the weekday, <th scope="col">
 * for the hour, and the count as text inside every cell. A grid of coloured
 * divs conveys nothing to anyone who cannot see the colour, and the DataTableView
 * exemption below only holds because this markup is already the data table.
 *
 * The three display properties are overridden (block/grid/flex) so the column
 * widths can be expressed as one grid template per row -- identical templates on
 * identical-width rows line the columns up without needing subgrid. Changing a
 * table element's `display` is exactly what strips its implicit ARIA semantics
 * in some browser/AT pairs, so every element below also carries an EXPLICIT
 * role (table / rowgroup / row / columnheader / rowheader / cell). Do not drop
 * those roles when tidying the classes.
 *
 * ======================= TIMEZONE -- READ BEFORE "FIXING" =================
 *
 * `transactions.timestamp` is stored UTC, but analytics.heat is bucketed with
 * browser-local getDay()/getHours() (see makeBucketKeyFn in
 * services/analytics/dashboardAnalytics.ts). That is deliberate. This is a Thai
 * warehouse at UTC+7: a shift running 08:00-17:00 local spans 01:00-10:00 UTC,
 * so a UTC hour-of-day heatmap shows peak activity in the middle of the night
 * and a UTC day boundary cuts the working day in half. Hour 0 here means
 * midnight where the admin is sitting, and day 0 means Sunday per Date.getDay().
 * Converting this to UTC would make the chart wrong, not more correct.
 *
 * ========================= RESPONSIVE BINNING =============================
 *
 * 24 columns cannot survive the narrowest measured content width (328px), so
 * the bin width is a parameter: 4-hour bins / 6 columns at base, 2-hour bins /
 * 12 columns from `sm`, hourly / 24 columns from `lg`. Tailwind breakpoints
 * cannot change a JS-computed number, so all three variants are MOUNTED and CSS
 * shows exactly one. That is safe here and only here: this grid is CSS and
 * measures nothing. Never wrap a ResponsiveContainer in `hidden` -- it measures
 * 0 on mount and never recovers.
 *
 * Each variant states its own binning via heat.binNote(hours), rendered inside
 * the variant rather than in the shared subtitle. Without it the same grid means
 * four different things at four different widths and the reader cannot tell
 * whether one cell is an hour or an afternoon.
 *
 * ========================= SHARED DASHBOARD RULES =========================
 *
 * A. ChartFrame sizing, two verified recharts 3.10.1 traps:
 *    - `minPlotHeight` only writes `min-height` to the wrapper div; the SVG is
 *      still measuredWidth / aspect, so below the floor the box is reserved but
 *      the plot does not grow into it. The weekday chart is row-count-driven
 *      and must stay legible in a 328px column, so it uses `fixedPlotHeight`.
 *    - ResponsiveContainer's `height` defaults to '100%' and is skipped only
 *      while `aspect > 0`; passing both re-arms the collapse-to-zero trap.
 *      ChartFrame passes exactly one and nothing here overrides it.
 * B. `isAnimationActive={!useReducedMotion()}` on every <Bar>: Recharts animates
 *    in JavaScript and the prefers-reduced-motion block in index.css cannot
 *    reach it. The heatmap is CSS and is already covered by that block -- so do
 *    not give it a JS animation.
 * C. Tooltips are HTML. The SVG default hard-codes a pixel width Thai overflows.
 *    Never dangerouslySetInnerHTML.
 * D. The weekday chart gets a DataTableView in ChartFrame's `footer`, outside
 *    the plot: a ResponsiveContainer inside a collapsed <details> measures 0 and
 *    stays 0. The heatmap needs no second table -- it IS one.
 * E. Axis and grid chrome from AXIS_PROPS / GRID_PROPS. Solid gridlines, never
 *    dashed, and axis text `fill` is never set here (slate-400 is 2.56:1 and
 *    illegal as text).
 *
 * =========================== THAI TYPOGRAPHY ==============================
 * No positive letter-spacing (it detaches tone marks from their base
 * characters), no `uppercase` (a no-op in Thai), nothing above `font-semibold`
 * (900 is not loaded). `min-h-*` never `h-*`, and the legend is
 * `flex flex-wrap gap-x-4 gap-y-2` with `whitespace-nowrap` items. The weekday
 * abbreviations are the worst case on this card: they sit in a fixed 3.5rem
 * gutter and the same forms are used by the report-schedule buttons in
 * locales/admin/settings.ts, so the two screens name Monday identically.
 */

export interface TimeSectionProps {
    analytics: DashboardAnalytics | null;
    isLoading: boolean;
    isRefreshing?: boolean;
    /**
     * Both cards here are range-scoped, and the heatmap is the one that needs
     * saying most: a grid of 168 cells gives no hint of how long it was
     * accumulated over, so the same shape means something quite different at 7
     * days and at 12 months.
     */
    range: DashboardRange;
    onRangeChange: (range: DashboardRange) => void;
}

/**
 * The three binnings, and the ONLY place the column count is written down.
 *
 * The grid templates are complete literal strings on purpose: Tailwind reads
 * source text, so a class assembled at runtime from `repeat(${n},...)` compiles
 * to no rule at all and every column collapses.
 *
 * `visibility` is what makes exactly one of them visible. Both halves of each
 * pair must move together -- a variant showing a 12-column grid while claiming
 * 4-hour bins is a silently wrong chart.
 *
 * Every `visibility` string also carries an explicit `print:` verdict, and that
 * is not decoration. `sm:` and `lg:` measure the VIEWPORT, so on paper they were
 * answering a question about the reader's window -- an admin on a 900px window
 * printed the 2-hour grid onto a sheet with room for the 1-hour one, and the
 * report lost half its resolution for a reason that has nothing to do with the
 * report. The card takes the full sheet width on paper (`print-span-all` below),
 * which is ~1032px in landscape and 703px in portrait; 24 columns fit in both,
 * so the finest binning is always the right one there.
 *
 * Stated per variant rather than left to the `sm:`/`lg:` classes to resolve,
 * because "which variant wins" would otherwise depend on the order Tailwind
 * happens to emit the `print` and `lg` variants in.
 */
const HEAT_VARIANTS = [
    {
        binHours: 4,
        columns: 'grid-cols-[3.5rem_repeat(6,minmax(0,1fr))]',
        visibility: 'sm:hidden print:hidden',
    },
    {
        binHours: 2,
        columns: 'grid-cols-[3.5rem_repeat(12,minmax(0,1fr))]',
        visibility: 'hidden sm:block lg:hidden print:hidden',
    },
    {
        binHours: 1,
        columns: 'grid-cols-[3.5rem_repeat(24,minmax(0,1fr))]',
        visibility: 'hidden lg:block print:block',
    },
] as const;

/** >=24px hit target on every cell, at every binning. `min-h`, never `h`. */
const CELL_BOX =
    'relative flex min-h-6 items-center justify-center rounded-[3px] outline-offset-1 ' +
    'focus-visible:outline-2 focus-visible:outline-brand-600';

const WEEKDAY_COUNT = 7;

/** Matches the 3.5rem row-header gutter of the heatmap beside it. */
const WEEKDAY_AXIS_WIDTH = 56;

const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n));

/**
 * The hour label for one bin. The column header and the tooltip both call this,
 * so the two can never disagree -- which is the same reason the locale's
 * cellTooltip takes an already-rendered `hour` string rather than a number.
 */
const hourLabel = (startHour: number, binHours: number): string =>
    binHours === 1
        ? pad2(startHour)
        : `${pad2(startHour)}–${pad2(startHour + binHours - 1)}`;

interface HeatBin {
    day: number;
    startHour: number;
    count: number;
}

interface BinnedHeat {
    /** [day][column]. */
    rows: HeatBin[][];
    /**
     * The scale ceiling FOR THIS BINNING, not analytics.heatMax.
     *
     * A 4-hour bin is the sum of four hours, so it routinely exceeds the busiest
     * single hour. Colouring the binned grid against analytics.heatMax would
     * saturate most of the phone view to the darkest step and destroy the shape
     * the heatmap exists to show.
     */
    max: number;
}

/**
 * 7x24 counts, addressed by the cells' own `day`/`hour` fields.
 *
 * analytics.heat is documented as always exactly 168 cells day-major, so
 * heat[day * 24 + hour] would work -- reading the fields instead just means a
 * future change to that layout cannot silently transpose the chart.
 */
const buildGrid = (analytics: DashboardAnalytics): number[][] => {
    const grid: number[][] = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
    for (const cell of analytics.heat) {
        if (cell.day >= 0 && cell.day < 7 && cell.hour >= 0 && cell.hour < 24) {
            grid[cell.day][cell.hour] += cell.count;
        }
    }
    return grid;
};

const binGrid = (grid: number[][], binHours: number): BinnedHeat => {
    const columns = 24 / binHours;
    const rows: HeatBin[][] = [];
    let max = 0;

    for (let day = 0; day < 7; day++) {
        const row: HeatBin[] = [];
        for (let column = 0; column < columns; column++) {
            const startHour = column * binHours;
            let count = 0;
            for (let hour = startHour; hour < startHour + binHours; hour++) {
                count += grid[day][hour];
            }
            if (count > max) max = count;
            row.push({ day, startHour, count });
        }
        rows.push(row);
    }

    return { rows, max };
};

// --- THE HEATMAP GRID -------------------------------------------------------

interface HeatGridProps {
    binHours: number;
    columnsClass: string;
    visibilityClass: string;
    grid: number[][];
    /** Index 0 = Sunday, matching Date.getDay() and analytics.heat. */
    dayLabels: readonly string[];
    hourAxisLabel: string;
    binNote: (hours: number) => string;
    cellTooltip: (day: string, hour: string, n: number) => string;
}

const HeatGrid: React.FC<HeatGridProps> = ({
    binHours,
    columnsClass,
    visibilityClass,
    grid,
    dayLabels,
    hourAxisLabel,
    binNote,
    cellTooltip,
}) => {
    // Per-instance so the three mounted variants do not share one id.
    const noteId = useId();
    // Hover AND focus write to the same state, so a keyboard user gets exactly
    // the tooltip a mouse user gets. Nothing here is pointer-only.
    const [activeCell, setActiveCell] = useState<string | null>(null);

    const { rows, max } = useMemo(() => binGrid(grid, binHours), [grid, binHours]);
    const lastColumn = 24 / binHours - 1;

    return (
        <div className={visibilityClass}>
            <p id={noteId} className="mb-2 text-xs leading-relaxed text-slate-500">
                {hourAxisLabel} · {binNote(binHours)}
            </p>

            {/* Explicit roles throughout -- see the note at the top of the file:
                the display overrides below would otherwise cost this table its
                implicit semantics in some AT. */}
            <table role="table" aria-describedby={noteId} className="block w-full">
                <thead role="rowgroup" className="block">
                    <tr role="row" className={`grid ${columnsClass} gap-0.5`}>
                        {/* The corner. Left empty by convention: it heads the
                            weekday gutter, and labelling it "Hour" would make
                            the row headers read as hours. */}
                        <td role="cell" />
                        {rows[0].map((bin) => (
                            <th
                                key={bin.startHour}
                                role="columnheader"
                                scope="col"
                                className="flex items-end justify-center pb-1 text-[10px] font-medium tabular-nums text-slate-500"
                            >
                                {hourLabel(bin.startHour, binHours)}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody role="rowgroup" className="block space-y-0.5">
                    {rows.map((row, day) => (
                        <tr key={day} role="row" className={`grid ${columnsClass} gap-0.5`}>
                            <th
                                role="rowheader"
                                scope="row"
                                // Left-aligned and not truncated: the Thai
                                // abbreviations ("พฤ.") are chosen to fit this
                                // 3.5rem gutter exactly so they never need to.
                                className="flex items-center pr-2 text-xs font-medium text-slate-600"
                            >
                                {dayLabels[day]}
                            </th>

                            {row.map((bin) => {
                                const id = `${bin.day}-${bin.startHour}`;
                                const label = cellTooltip(
                                    dayLabels[bin.day],
                                    hourLabel(bin.startHour, binHours),
                                    bin.count,
                                );
                                // null = empty. An empty cell is ABSENCE, not a
                                // fifth colour level, so it renders as the
                                // surface plus a hairline rather than as the
                                // lightest step of the ramp.
                                const fill = heatColor(bin.count, max);
                                const isActive = activeCell === id;

                                // An empty cell has no value to reveal and its
                                // count is already in the text below, so it is
                                // reachable programmatically but is not a tab
                                // stop -- 168 stops before the legend would make
                                // the card hostile to the keyboard users this is
                                // meant to serve.
                                const tabIndex = bin.count > 0 ? 0 : -1;

                                return (
                                    <td
                                        key={bin.startHour}
                                        role="cell"
                                        tabIndex={tabIndex}
                                        onMouseEnter={() => setActiveCell(id)}
                                        onMouseLeave={() => setActiveCell(null)}
                                        onFocus={() => setActiveCell(id)}
                                        onBlur={() => setActiveCell(null)}
                                        className={`${CELL_BOX} ${fill ? '' : HEAT_EMPTY_CLASS}`}
                                        style={fill ? { backgroundColor: fill } : undefined}
                                    >
                                        {/* The cell's real text content. This is
                                            what makes the heatmap readable at
                                            all without sight, and why this card
                                            is exempt from the DataTableView
                                            rule. */}
                                        <span className="sr-only">{label}</span>

                                        {isActive && (
                                            <span
                                                // Anchored away from the card
                                                // edge on the first and last
                                                // columns: Card sets
                                                // overflow-hidden for its top
                                                // hairline, so a centred bubble
                                                // would be clipped there.
                                                className={
                                                    'pointer-events-none absolute bottom-full z-30 mb-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-[0_18px_40px_-24px_rgba(15,42,82,0.6)] ' +
                                                    (bin.startHour === 0
                                                        ? 'left-0'
                                                        : lastColumn * binHours === bin.startHour
                                                          ? 'right-0'
                                                          : 'left-1/2 -translate-x-1/2')
                                                }
                                                aria-hidden="true"
                                            >
                                                {label}
                                            </span>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// --- THE HEATMAP SKELETON ---------------------------------------------------

interface HeatSkeletonProps {
    binHours: number;
    columnsClass: string;
    visibilityClass: string;
}

/** Same cell size, same gutter, same three breakpoints as the real grid, so the
 *  card does not resize when the data lands. */
const HeatSkeleton: React.FC<HeatSkeletonProps> = ({
    binHours,
    columnsClass,
    visibilityClass,
}) => {
    const columns = 24 / binHours;
    return (
        <div className={visibilityClass} aria-hidden="true">
            <div className="skeleton mb-2 h-3 w-48 rounded-md" />
            <div className={`grid ${columnsClass} gap-0.5`}>
                <div />
                {Array.from({ length: columns }, (_, i) => (
                    <div key={i} className="skeleton mb-1 h-2.5 rounded-sm" />
                ))}
            </div>
            <div className="space-y-0.5">
                {Array.from({ length: WEEKDAY_COUNT }, (_, day) => (
                    <div key={day} className={`grid ${columnsClass} gap-0.5`}>
                        <div className="skeleton my-1 mr-2 h-4 rounded-sm" />
                        {Array.from({ length: columns }, (_, column) => (
                            <div key={column} className="skeleton min-h-6 rounded-[3px]" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- THE SECTION ------------------------------------------------------------

interface WeekdayRow {
    key: string;
    label: string;
    count: number;
}

export const TimeSection: React.FC<TimeSectionProps> = ({
    analytics,
    isLoading,
    isRefreshing = false,
    range,
    onRangeChange,
}) => {
    const t = useT();
    const reducedMotion = useReducedMotion();

    const heatDict = t.dashboard.analytics.heat;
    const chartDict = t.dashboard.analytics.chart;

    // Index 0 = Sunday, matching Date.getDay() and therefore HeatCell.day. The
    // Thai forms here are the same abbreviations the report-schedule buttons in
    // locales/admin/settings.ts use.
    const dayLabels = useMemo(
        () => [
            heatDict.sun,
            heatDict.mon,
            heatDict.tue,
            heatDict.wed,
            heatDict.thu,
            heatDict.fri,
            heatDict.sat,
        ],
        [heatDict],
    );

    const grid = useMemo(
        () =>
            analytics
                ? buildGrid(analytics)
                : Array.from({ length: 7 }, () => new Array<number>(24).fill(0)),
        [analytics],
    );

    const weekdayRows = useMemo<WeekdayRow[]>(
        () =>
            grid.map((hours, day) => ({
                key: String(day),
                label: dayLabels[day],
                count: hours.reduce((sum, n) => sum + n, 0),
            })),
        [grid, dayLabels],
    );

    // One emptiness test for both cards: heatMax is 0 exactly when no
    // transaction fell inside the range, which is also when every weekday total
    // is 0. Range-aware wording, because the fix is usually a wider range.
    const hasData = !!analytics && analytics.heatMax > 0;
    const isEmpty = !isLoading && !hasData;

    const emptyState = (
        <EmptyState
            variant="plot"
            icon={CalendarClock}
            title={chartDict.noDataInRange}
            hint={chartDict.widenRange}
        />
    );

    // Generics left at their defaults: <Tooltip> is itself generic, and
    // narrowing this to <number, string> makes the parameter contravariantly
    // incompatible with the ContentType the prop expects.
    const renderWeekdayTooltip = (props: TooltipContentProps): React.ReactNode => {
        const row = props.payload?.[0]?.payload as WeekdayRow | undefined;
        if (!props.active || !row) return null;
        return (
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-[0_18px_40px_-24px_rgba(15,42,82,0.6)]">
                <p className="text-xs font-semibold text-slate-900">{row.label}</p>
                <p className="mt-0.5 text-xs text-slate-600">
                    {t.common.total}:{' '}
                    <span className="font-medium tabular-nums text-slate-800">{row.count}</span>
                </p>
            </div>
        );
    };

    return (
        // `print-paper-grid` -- paper columns, not viewport columns. See index.css.
        <div className="print-paper-grid grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-4">
            {/* --- Hour x weekday heatmap ---
                `print-span-all` because this is the one card on the dashboard
                that cannot survive being halved: the 1-hour variant is 24 cells
                across, and half of a 1032px landscape sheet leaves each cell
                ~17px wide against its own 24px height -- a grid of thin slots
                whose shading is no longer comparable. Full sheet width gives it
                ~40px per cell. */}
            <Card
                accent
                busy={isRefreshing}
                as="section"
                className="animate-surface-in flex flex-col xl:col-span-3 print-span-all"
            >
                <div className="flex flex-col p-5 sm:p-6">
                    <SectionHeader
                        level="h3"
                        title={heatDict.title}
                        subtitle={heatDict.subtitle}
                        icon={CalendarClock}
                        action={<RangeMenu value={range} onChange={onRangeChange} />}
                    />

                    {/* isRefreshing dims what is already on screen and never
                        swaps in a skeleton: this app refetches on every realtime
                        row change, and a bulk check-out of 30 pallets would
                        rebuild the grid 30 times. */}
                    <div
                        className={`mt-4 ${
                            isRefreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'
                        }`}
                    >
                        {isLoading ? (
                            HEAT_VARIANTS.map((variant) => (
                                <HeatSkeleton
                                    key={variant.binHours}
                                    binHours={variant.binHours}
                                    columnsClass={variant.columns}
                                    visibilityClass={variant.visibility}
                                />
                            ))
                        ) : isEmpty ? (
                            emptyState
                        ) : (
                            HEAT_VARIANTS.map((variant) => (
                                <HeatGrid
                                    key={variant.binHours}
                                    binHours={variant.binHours}
                                    columnsClass={variant.columns}
                                    visibilityClass={variant.visibility}
                                    grid={grid}
                                    dayLabels={dayLabels}
                                    hourAxisLabel={heatDict.hourAxis}
                                    binNote={heatDict.binNote}
                                    cellTooltip={heatDict.cellTooltip}
                                />
                            ))
                        )}
                    </div>

                    {!isLoading && !isEmpty && (
                        // The ramp only. The empty-cell treatment is deliberately
                        // NOT a swatch here: it means "no activity", and putting
                        // it in the scale would present absence as the lowest of
                        // five levels.
                        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                            <span className="whitespace-nowrap text-xs text-slate-500">
                                {heatDict.legendLow}
                            </span>
                            <span className="flex items-center gap-1" aria-hidden="true">
                                {HEAT_SCALE.map((step) => (
                                    <span
                                        key={step}
                                        className="h-3 w-6 rounded-sm"
                                        style={{ backgroundColor: step }}
                                    />
                                ))}
                            </span>
                            <span className="whitespace-nowrap text-xs text-slate-500">
                                {heatDict.legendHigh}
                            </span>
                        </div>
                    )}
                </div>
            </Card>

            {/* --- Weekday totals ---
                No wrapper: a grid child spans one column by default, which is
                the xl:col-span-1 this card wants, and ChartFrame takes no
                className. */}
            <ChartFrame
                title={heatDict.weekdayTotals}
                icon={CalendarDays}
                action={<RangeMenu value={range} onChange={onRangeChange} />}
                // Seven rows, at the shared pitch in chartTheme.ts. This card
                // used to compute its own 34+56 and came out at 294, which made
                // it ~70px taller than the heatmap beside it -- and since a grid
                // row stretches to its tallest card, that 70px was drawn as
                // white under the heatmap's legend, not here. 250 puts the two
                // within a legend's height of each other.
                fixedPlotHeight={bandPlotHeight(WEEKDAY_COUNT)}
                isLoading={isLoading}
                isRefreshing={isRefreshing}
                isEmpty={isEmpty}
                emptyState={emptyState}
                footer={
                    <DataTableView
                        caption={chartDict.tableCaption(heatDict.weekdayTotals)}
                        // `period.day` is the closest existing label for a
                        // weekday column ("Day" / "วัน"); the analytics
                        // dictionary has no weekday-column header of its own.
                        columns={[
                            { key: 'day', label: t.dashboard.period.day },
                            { key: 'count', label: t.common.total, numeric: true },
                        ]}
                        rows={weekdayRows.map((row) => ({
                            day: row.label,
                            count: row.count,
                        }))}
                        summaryLabel={chartDict.showTable}
                    />
                }
            >
                {/* Horizontal for the same reason as the staff ranking: the
                    category labels are Thai and cannot be rotated or wrapped
                    under an x-axis. Seven short abbreviations sit comfortably in
                    a 3.5rem y-axis gutter even in a 328px column. */}
                <BarChart
                    data={weekdayRows}
                    layout="vertical"
                    margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
                >
                    {/* GRID_PROPS keeps the stroke and the never-dashed rule; the
                        orientation flags are transposed because with
                        layout="vertical" the value axis is x. */}
                    <CartesianGrid {...GRID_PROPS} horizontal={false} vertical />

                    <XAxis type="number" allowDecimals={false} {...AXIS_PROPS} />

                    {/* Keyed by day index, not by label: two weekdays can share
                        an abbreviation in some locales and a band scale would
                        collapse them into one row. */}
                    <YAxis
                        type="category"
                        dataKey="key"
                        width={WEEKDAY_AXIS_WIDTH}
                        interval={0}
                        tickFormatter={(value: string) => dayLabels[Number(value)] ?? value}
                        axisLine={false}
                        {...AXIS_PROPS}
                    />

                    <Tooltip
                        content={renderWeekdayTooltip}
                        cursor={{ fill: 'rgba(15, 42, 82, 0.06)' }}
                    />

                    {/* A distribution, so one hue for every bar. Colouring
                        darker-where-taller would double-encode bar length and
                        break the categorical colour gates by construction. */}
                    <Bar
                        dataKey="count"
                        name={t.common.total}
                        fill={DISTRIBUTION_COLOR}
                        radius={[0, 4, 4, 0]}
                        isAnimationActive={!reducedMotion}
                    />
                </BarChart>
            </ChartFrame>
        </div>
    );
};
