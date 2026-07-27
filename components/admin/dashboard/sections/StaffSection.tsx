import React, { useMemo } from 'react';
import { Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import type { TooltipContentProps } from 'recharts';
import type { ActionType } from '../../../../types';
import { ChartFrame, DataTableView, EmptyState } from '../../../ui';
import {
    AXIS_PROPS,
    GRID_PROPS,
    SEGMENT_GAP,
    SERIES_COLORS,
    SERIES_ORDER,
    bandPlotHeight,
} from '../../charts/chartTheme';
import { formatDateTime } from '../../common/AdminHelpers';
import { RangeMenu } from '../RangeMenu';
import type { DashboardRange } from '../../../../hooks/dashboard/useDashboardData';
import { useReducedMotion } from '../../../../hooks/useReducedMotion';
import { useT } from '../../../../hooks/useT';
import { UNKNOWN_USER_KEY } from '../../../../services/analytics/dashboardAnalytics';
import type { DashboardAnalytics, StaffRow } from '../../../../services/analytics/dashboardAnalytics';

/**
 * Who is recording the transactions: one horizontal stacked bar.
 *
 * A StatTile carrying `activeStaffCount` ("N of M staff active in this range")
 * used to sit beside it at xl:col-span-1. It was removed because it restated
 * the chart: the bars ARE the active staff, one per person, so the count was
 * the row count of the thing directly to its right, and the card ended up
 * announcing the section title twice -- StatTile has no subtitle slot, so its
 * label had to be `staff.title`, the same string as the chart's heading.
 * `analytics.activeStaffCount` is still computed and still goes into the
 * summary CSV, where there is no chart to read it off.
 *
 * ===================== WHY THE CHART IS THE SHAPE IT IS =====================
 *
 * 1. HORIZONTAL, NOT VERTICAL. The category axis carries Thai full names, and
 *    those cannot go under an x-axis. They cannot be rotated -- a rotated Thai
 *    string detaches its vowels and tone marks from the base characters they
 *    sit on -- and they cannot be wrapped with Recharts' <Text breakAll>,
 *    which breaks mid-syllable and produces a different word. Names go on the
 *    y-axis, where they get the full width of a gutter, truncated with a
 *    trailing ellipsis. The untruncated name is in the tooltip and in the
 *    DataTableView below, so nothing is only-in-the-truncation.
 *
 * 2. ONE CHART, TWO JOBS. Bar LENGTH is StaffRow.total (the ranking); the
 *    SEGMENTS are byAction in SERIES_ORDER (the activity mix). Splitting these
 *    into two charts would ask the reader to match rows across two cards.
 *
 * 3. STACKED IS THE ONLY SAFE FORM FOR ALL FIVE SERIES. chartTheme.ts records
 *    the measurement: under an all-pairs colour-blindness check, slot 4
 *    (violet, `scrap`) and slot 1 (blue, `check_out`) collapse to dE 0.6 under
 *    deuteranopia -- the same colour to roughly one man in twelve. That is
 *    tolerable ONLY where the two marks physically touch and the boundary
 *    between them is readable, i.e. adjacent segments of a stacked bar. Do NOT
 *    convert this to five lines, to a scatter, or to small multiples; any of
 *    those separates the marks and the pair becomes indistinguishable. If a
 *    future variant needs them apart, re-run the validator in chartTheme.ts
 *    and pick new hexes -- do not just reorder SERIES_ORDER.
 *
 * ========================= SHARED DASHBOARD RULES ==========================
 *
 * A. ChartFrame sizing, two verified recharts 3.10.1 traps:
 *    - `minPlotHeight` only writes `min-height` to the wrapper div; the SVG is
 *      still sized measuredWidth / aspect, so below the floor the box is
 *      reserved but the plot does not grow into it. A row-count-driven chart
 *      cannot use `aspect` at all, so this one passes `fixedPlotHeight`.
 *    - ResponsiveContainer's `height` defaults to '100%' and that default is
 *      skipped only while `aspect > 0`. Passing both re-arms the
 *      collapse-to-zero trap. ChartFrame passes exactly one; nothing here
 *      overrides it.
 * B. `isAnimationActive={!useReducedMotion()}` on every <Bar>. Recharts
 *    animates in JavaScript, so the prefers-reduced-motion block in index.css
 *    cannot reach it.
 * C. The tooltip is HTML via <Tooltip content={...} />. The SVG default
 *    hard-codes a pixel width that Thai text overflows. Never
 *    dangerouslySetInnerHTML here -- staff names come from the database.
 * D. Every chart gets a DataTableView in ChartFrame's `footer`, never around
 *    the chart: a ResponsiveContainer inside a collapsed <details> measures 0
 *    and stays 0.
 * E. Axis and grid chrome comes from AXIS_PROPS / GRID_PROPS. Solid gridlines,
 *    never dashed, and the axis text `fill` is never set here -- slate-400 is
 *    2.56:1 and is illegal as text.
 *
 * =========================== THAI TYPOGRAPHY ===============================
 * No positive letter-spacing anywhere (it pushes tone marks off their base
 * characters), no `uppercase` (a no-op in Thai, so the emphasis exists in one
 * language only), nothing heavier than `font-semibold` (900 is not loaded and
 * the browser synthesises it). The legend is `flex flex-wrap` with
 * `whitespace-nowrap` items and no fixed height, because a Thai label runs
 * ~1.4-1.7x its English source with no inter-word spaces to break at.
 */

export interface StaffSectionProps {
    analytics: DashboardAnalytics | null;
    isLoading: boolean;
    isRefreshing?: boolean;
    /**
     * Range-scoped: a ranking is counted from the transactions inside the
     * window, so the chip is interactive rather than the static "as of now" one.
     */
    range: DashboardRange;
    onRangeChange: (range: DashboardRange) => void;
}

/** Rows beyond this are folded into one "others" bar. */
const TOP_N = 10;

/**
 * Only so the loading skeleton reserves a believable box rather than one bar's
 * worth. The height itself comes from `bandPlotHeight` in chartTheme.ts: a
 * ranking's height is a function of how many rows it has, not of how wide its
 * column is, so `aspect` cannot express it -- eleven bars in a 328px column at
 * aspect 2 would be 15px apart. This file used to carry its own 34+56; the
 * shared pitch is 30+40, which is ~4px tighter per bar and 16px tighter overall.
 */
const SKELETON_ROWS = 8;

/**
 * The name gutter. A Recharts axis width is a number prop, not a class -- there
 * is no Tailwind form of it -- so this is unavoidable rather than a preference.
 * 112px holds ~14 Thai characters at the 12px tick size and still leaves 170px
 * of plot on the narrowest measured column (328px viewport - 40px card padding).
 */
const Y_AXIS_WIDTH = 112;
const MAX_TICK_CHARS = 14;

const OTHERS_KEY = '__staff_others__';

/**
 * Thai vowels and tone marks that are stored AFTER the character they sit on.
 * Slicing a string between a base character and one of these leaves the mark
 * orphaned, so the truncator below walks back past them -- an ellipsis after a
 * clean syllable is a shortened name; an ellipsis after a stranded tone mark is
 * a rendering fault.
 *
 * Written as escapes rather than as the glyphs themselves: they are invisible
 * as literals (they render on top of whatever precedes them, including the
 * bracket), so the character class would be unreviewable and unsearchable.
 */
const THAI_COMBINING = /[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/;

const truncateName = (name: string): string => {
    if (name.length <= MAX_TICK_CHARS) return name;
    let cut = MAX_TICK_CHARS - 1;
    while (cut > 1 && THAI_COMBINING.test(name.charAt(cut))) cut--;
    return `${name.slice(0, cut).trimEnd()}…`;
};

/** One bar. The five action counts are flattened onto the row so each <Bar>
 *  can take a plain dataKey -- a nested "byAction.scrap" path works but reads
 *  as a typo and gives no compile-time protection. */
interface StaffChartRow {
    key: string;
    /** Never truncated. This is what the tooltip and the table show. */
    fullName: string;
    total: number;
    lastActiveISO: string | null;
    check_out: number;
    check_in: number;
    report_damage: number;
    scrap: number;
    repair: number;
}

/** Most recent of two ISO timestamps, tolerating an unparseable one. */
const laterISO = (a: string | null, b: string | null): string | null => {
    if (!a) return b;
    if (!b) return a;
    const ta = Date.parse(a);
    const tb = Date.parse(b);
    if (Number.isNaN(ta)) return b;
    if (Number.isNaN(tb)) return a;
    return tb > ta ? b : a;
};

export const StaffSection: React.FC<StaffSectionProps> = ({
    analytics,
    isLoading,
    isRefreshing = false,
    range,
    onRangeChange,
}) => {
    const t = useT();
    const reducedMotion = useReducedMotion();

    const staffDict = t.dashboard.analytics.staff;
    const chartDict = t.dashboard.analytics.chart;

    /**
     * UNKNOWN_USER_KEY ('__unknown_user__') is a sentinel the reducer writes
     * when a transaction carried no user_id at all -- the legacy anonymous
     * repair path did this before scrapPallet() started refusing it. It must
     * never reach an axis, a tooltip or a CSV as its raw form.
     *
     * There is no key for it in the analytics dictionary, so this borrows
     * `modals.unknownUser`, which exists for exactly this case (a transaction
     * whose author cannot be resolved) and is already translated. It takes the
     * id, and here there genuinely is none, so an em dash stands in: "User —" /
     * "ผู้ใช้ —". A dedicated `staff.unknownUser` key would read better; adding
     * one is a locale change, not a component change.
     *
     * StaffRow.name is already guaranteed never to be a raw UUID -- an orphaned
     * id arrives pre-shortened as "#a1b2c3d4" -- so this is the only case left.
     */
    const unknownStaffLabel = t.modals.unknownUser('—');
    const othersLabel = staffDict.othersLabel;

    const rows = useMemo<StaffChartRow[]>(() => {
        if (!analytics) return [];

        const displayName = (row: StaffRow): string =>
            row.name === UNKNOWN_USER_KEY ? unknownStaffLabel : row.name;

        // analytics.staff arrives sorted descending by total, so the head IS
        // the ranking -- no re-sort here, which is also what keeps the bar
        // order stable across a realtime refetch.
        const head = analytics.staff.slice(0, TOP_N);
        const tail = analytics.staff.slice(TOP_N);

        const out: StaffChartRow[] = head.map((row) => ({
            key: row.userId,
            fullName: displayName(row),
            total: row.total,
            lastActiveISO: row.lastActiveISO,
            ...row.byAction,
        }));

        // The tail is summed rather than dropped, so the bars still account for
        // every transaction in the range.
        if (tail.length > 0) {
            const folded: StaffChartRow = {
                key: OTHERS_KEY,
                fullName: othersLabel,
                total: 0,
                lastActiveISO: null,
                check_out: 0,
                check_in: 0,
                report_damage: 0,
                scrap: 0,
                repair: 0,
            };
            for (const row of tail) {
                folded.total += row.total;
                for (const action of SERIES_ORDER) folded[action] += row.byAction[action];
                folded.lastActiveISO = laterISO(folded.lastActiveISO, row.lastActiveISO);
            }
            out.push(folded);
        }

        return out;
    }, [analytics, othersLabel, unknownStaffLabel]);

    const nameByKey = useMemo(() => {
        const map = new Map<string, string>();
        for (const row of rows) map.set(row.key, row.fullName);
        return map;
    }, [rows]);

    const isEmpty = !isLoading && rows.length === 0;
    const plotRows = rows.length > 0 ? rows.length : SKELETON_ROWS;
    const plotHeight = bandPlotHeight(plotRows);

    // --- The HTML tooltip ------------------------------------------------
    // A function rather than an element so it closes over `t`: Recharts calls
    // this as a plain function, not as a component, so a hook inside it would
    // be a hook called outside the React tree.
    // The generics are left at their defaults on purpose: <Tooltip> itself is
    // generic and narrowing this to <number, string> makes the parameter
    // contravariantly incompatible with the ContentType the prop expects.
    const renderTooltip = (props: TooltipContentProps): React.ReactNode => {
        const row = props.payload?.[0]?.payload as StaffChartRow | undefined;
        if (!props.active || !row) return null;

        return (
            <div className="max-w-[15rem] rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-[0_18px_40px_-24px_rgba(15,42,82,0.6)]">
                {/* The FULL name, never the truncated tick. `break-words` is
                    deliberate: Thai has no inter-word spaces, so a long name
                    cannot wrap on its own and would otherwise run out of the
                    bubble. This is the one place breaking mid-string is the
                    lesser evil -- the alternative is not showing the name. */}
                <p className="text-xs font-semibold leading-snug text-slate-900 break-words">
                    {row.fullName}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                    {staffDict.total}:{' '}
                    <span className="font-medium text-slate-700">{row.total}</span>
                </p>
                <ul className="mt-1.5 space-y-1">
                    {SERIES_ORDER.filter((action) => row[action] > 0).map((action) => (
                        <li key={action} className="flex items-center gap-2 text-xs text-slate-600">
                            <span
                                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                                style={{ backgroundColor: SERIES_COLORS[action] }}
                                aria-hidden="true"
                            />
                            <span className="min-w-0 flex-1">{t.action[action]}</span>
                            <span className="font-medium tabular-nums text-slate-800">
                                {row[action]}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        );
    };

    // --- The table under the chart ---------------------------------------
    const tableColumns = useMemo(
        () => [
            { key: 'name', label: staffDict.name },
            ...SERIES_ORDER.map((action) => ({
                key: action as string,
                label: t.action[action],
                numeric: true,
            })),
            { key: 'total', label: staffDict.total, numeric: true },
            { key: 'lastActive', label: staffDict.lastActive },
        ],
        [staffDict, t.action],
    );

    const tableRows = useMemo(
        () =>
            rows.map((row) => {
                const cells: Record<string, string | number> = {
                    name: row.fullName,
                    total: row.total,
                    // formatDate/formatDateTime from AdminHelpers, never a
                    // th-TH call: that renders the Buddhist era (พ.ศ. 2569) on
                    // screen while the CSV beside it still says 2026.
                    lastActive: formatDateTime(row.lastActiveISO),
                };
                for (const action of SERIES_ORDER) cells[action] = row[action];
                return cells;
            }),
        [rows],
    );

    return (
        // The card renders bare, with no grid around it. It is the only thing in
        // its section now, and the chart is a ranking whose y-axis gutter is a
        // fixed 112px -- the wider the card, the more of each row is plot rather
        // than name, so full width is the useful width. The gap to the sections
        // above and below is owned by DashboardHome's column, not by this file.
        <ChartFrame
            title={staffDict.title}
            subtitle={staffDict.subtitle}
            icon={Users}
            action={<RangeMenu value={range} onChange={onRangeChange} />}
            fixedPlotHeight={plotHeight}
            isLoading={isLoading}
            isRefreshing={isRefreshing}
            isEmpty={isEmpty}
            emptyState={
                <EmptyState
                    variant="plot"
                    icon={Users}
                    title={chartDict.noDataInRange}
                    hint={chartDict.widenRange}
                />
            }
            footer={
                <div className="flex flex-col gap-3">
                    {/* No fixed height and no `h-*`: a Thai action label wraps to
                        a second line and a fixed-height legend would clip it in
                        exactly one language. */}
                    <ul className="flex flex-wrap gap-x-4 gap-y-2">
                        {SERIES_ORDER.map((action) => (
                            <li
                                key={action}
                                className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-600"
                            >
                                <span
                                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                                    style={{ backgroundColor: SERIES_COLORS[action] }}
                                    aria-hidden="true"
                                />
                                {t.action[action]}
                            </li>
                        ))}
                    </ul>

                    <DataTableView
                        caption={chartDict.tableCaption(staffDict.title)}
                        columns={tableColumns}
                        rows={tableRows}
                        summaryLabel={chartDict.showTable}
                    />
                </div>
            }
        >
            <BarChart
                data={rows}
                layout="vertical"
                margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
            >
                {/* GRID_PROPS carries the stroke and the never-dashed rule. The
                    two orientation flags are transposed because this chart is:
                    with layout="vertical" the VALUE axis is x, so the useful
                    gridlines are the vertical ones. */}
                <CartesianGrid {...GRID_PROPS} horizontal={false} vertical />

                <XAxis type="number" allowDecimals={false} {...AXIS_PROPS} />

                {/* dataKey is the user id, not the name: two staff can share a
                    display name and a band scale would collapse them into one
                    row. The tick is formatted back to a name below. */}
                <YAxis
                    type="category"
                    dataKey="key"
                    width={Y_AXIS_WIDTH}
                    interval={0}
                    tickFormatter={(value: string) => truncateName(nameByKey.get(value) ?? value)}
                    axisLine={false}
                    {...AXIS_PROPS}
                />

                <Tooltip content={renderTooltip} cursor={{ fill: 'rgba(15, 42, 82, 0.06)' }} />

                {SERIES_ORDER.map((action: ActionType) => (
                    <Bar
                        key={action}
                        dataKey={action}
                        stackId="staff"
                        fill={SERIES_COLORS[action]}
                        name={t.action[action]}
                        // SEGMENT_GAP draws the separator as a stroke in the
                        // surface colour rather than a border, so segments stay
                        // flush and the gap is genuinely transparent.
                        {...SEGMENT_GAP}
                        isAnimationActive={!reducedMotion}
                    />
                ))}
            </BarChart>
        </ChartFrame>
    );
};
