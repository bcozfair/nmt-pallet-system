import React from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    LabelList,
    ReferenceLine,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import type { LabelProps } from 'recharts';
import { AlarmClock, AlertTriangle, Hourglass } from 'lucide-react';

import { ChartFrame, DataTableView, EmptyState } from '../../../ui';
import {
    AXIS_PROPS,
    BREACH_COLOR,
    CHART_CHROME,
    DISTRIBUTION_COLOR,
    GRID_PROPS,
    bandPlotHeight,
} from '../../charts/chartTheme';
import { formatDuration } from '../../common/AdminHelpers';
import { AsOfNowChip, RangeMenu } from '../RangeMenu';
import type { DashboardRange } from '../../../../hooks/dashboard/useDashboardData';
import { useReducedMotion } from '../../../../hooks/useReducedMotion';
import { useLang, useT } from '../../../../hooks/useT';
import type {
    AgingStats,
    DashboardAnalytics,
    DwellBucketKey,
    DwellHistogramBin,
    DwellStats,
    OverdueHistogramBin,
} from '../../../../services/analytics/dashboardAnalytics';

// =============================================================================
// LIFECYCLE & AGEING
//
// Two panels answering one question in two parts: how long does a pallet stay
// out (dwell), and how far past the threshold are the ones that have not come
// back (overdue ageing).
//
// There was a third -- the dormant-pallet table, "which pallets has nobody
// touched at all". It now lives in components/admin/dashboard/
// DormantPalletsCard.tsx and renders in the quality grid, which is where a
// screenful of stacked full-width blocks needed a second column; that file
// carries the reasoning. The trio was a sound grouping and the pair left behind
// is a better one: the two histograms below are built on ONE geometry, on
// purpose, so a reader can compare them by shape -- and they now sit side by
// side, which is the only arrangement where that actually happens.
//
// -----------------------------------------------------------------------------
// THE RULES THIS FILE IS BUILT AROUND. Each one is a defect that has already
// happened somewhere, not a style preference.
//
// 1. A DISTRIBUTION GETS ONE HUE. Every bar in both histograms is
//    DISTRIBUTION_COLOR. Colouring bars darker-where-taller double-encodes bar
//    length -- the reader already has the length -- and it breaks the
//    categorical colour gates in chartTheme.ts by construction, because a ramp
//    built from one hue cannot also satisfy a CVD separation test between its
//    own steps. The ONE sanctioned exception is the overdue breach highlight,
//    and it never ships as colour alone: see rule 7.
//
// 2. SIZING. Both charts pass `fixedPlotHeight`, never `aspect`. Verified
//    against recharts 3.10.1: `minPlotHeight` only writes `min-height` to the
//    wrapper div, while the SVG is still sized at measured-width / aspect, so
//    on a 328px column the box is reserved but the plot does not grow into it
//    and the six bands flatten into an unreadable strip. A pixel height is the
//    only thing that keeps six bands legible at 328px.
//
//    ChartFrame passes exactly ONE of `aspect` / `height` to
//    ResponsiveContainer. `height` defaults to '100%' and that default is
//    skipped only while `aspect > 0`, so passing both re-arms the
//    collapse-to-zero trap. Nothing here overrides it.
//
// 3. `isAnimationActive={!reduced}` on every Bar. Recharts animates in
//    JavaScript -- it interpolates bar geometry frame by frame -- so the
//    `prefers-reduced-motion` block in index.css cannot reach it. The hook is
//    the only lever.
//
// 4. TOOLTIPS ARE HTML, via `<Tooltip content={<BandTooltip />} />`. The SVG
//    default hard-codes a pixel width that Thai text overflows. No
//    dangerouslySetInnerHTML anywhere.
//
// 5. EVERY CHART CARRIES A DataTableView IN THE FOOTER. A tooltip needs a
//    pointer and a steady hand: unreachable by keyboard, unreadable on touch,
//    gone the moment you look away. It must never be the only way to read a
//    value. The table goes in `footer` and the chart stays OUTSIDE the
//    <details> -- a ResponsiveContainer inside a collapsed <details> measures 0
//    on mount and never re-measures when it is opened.
//
// 6. ALL SIX BANDS ALWAYS RENDER, zero-count included. The rows are built by
//    mapping BAND_KEYS and looking the counts up, not by mapping the histogram,
//    so the axis is identical whichever range the user picks. Two readings of a
//    chart whose categories appear and disappear cannot be compared.
//
// 7. BREACH BINS GET THREE SIGNALS, NEVER JUST COLOUR: the BREACH_COLOR fill,
//    a per-bar AlertTriangle icon drawn at the end of the bar, and text -- the
//    legend under the chart and the tooltip both carry
//    `agingOverdue.breachNote(overdueDays)`, which names the threshold the
//    bands are measured from.
//
// -----------------------------------------------------------------------------
// WHY BOTH HISTOGRAMS ARE HORIZONTAL BAR CHARTS
//
// Not a style choice -- it is rule 6 at 328px. The content column measures
// 328px at 360px viewport (and 704px at 1024px, because the sidebar takes 256px
// from `lg` up). Six band labels under a vertical bar chart get ~41px each;
// "15–30 days" is ~62px and "เกิน 30 วัน" ~66px, so they collide, and Recharts'
// default XAxis interval silently DROPS the ticks that do not fit -- which is
// exactly rule 6 failing without an error. Rotating them is not an option
// either: Thai stacks vowels and tone marks above and below the base character
// and rotated text is where that legibility goes first.
//
// locales/admin/dashboardAnalytics.ts says the same thing in its typography
// note 3: category labels belong on the y-axis of a horizontal bar chart, where
// they get the full width of the gutter. Both charts share one geometry
// (Y_AXIS_WIDTH, CHART_MARGIN, PLOT_HEIGHT) because the whole point of the two
// sharing six bands is that a reader compares them by shape.
//
// -----------------------------------------------------------------------------
// WHAT THE NUMBERS ACTUALLY MEAN
//
// Both distributions are new to this app and neither is self-evident. Two
// things a reader will otherwise get wrong:
//
//  * `dwell.openCount` IS A FLOOR, NOT A TOTAL. It is the number of check-outs
//    still open at the END OF THE SCAN, and the scan only sees the transactions
//    the caller fetched -- a pallet checked out before that window began has no
//    opening event in it and is not counted. So it is NOT interchangeable with
//    `fleet.in_use`, which is exact because it reads the pallet rows directly.
//    dashboardAnalytics.ts says so on the field itself. It is labelled with
//    `dwell.openCount` ("Still out" / "ยังไม่ถูกรับคืน") and deliberately NOT
//    captioned "currently checked out".
//
//  * A DWELL PAIR IS COUNTED ON ITS CLOSING EVENT. The reducer reads ~90 extra
//    days of history so it can find the check-out that opens a trip returned
//    yesterday, but the pair only lands in the histogram when the CLOSING event
//    falls inside the selected range. That is why the sample count is captioned
//    with `dwell.samples(n)` -- "From N completed trips" / "จากรายการที่รับคืน
//    แล้ว N ครั้ง" -- which states the counting rule in both languages.
//
// -----------------------------------------------------------------------------
// THAI TYPOGRAPHY
//
// No positive letter-spacing anywhere (it lifts Thai tone marks off their base
// characters), no `uppercase` (a no-op in Thai, so the emphasis exists in one
// language only), nothing heavier than `font-semibold` (weight 900 is not
// loaded; `font-bold` appears only on table headers, matching DataTableView).
// Thai runs ~1.4-1.7x the width of its English source with no inter-word
// spaces, so: no fixed heights anywhere, the legend and the stat strip are
// `flex flex-wrap` with `whitespace-nowrap` items, and nothing is clamped to a
// single line.
//
// No dates are rendered in this section -- DormantPallet carries `daysIdle`, a
// number, and no timestamp -- so formatDate/formatDateTime from AdminHelpers
// are not needed here. If a date is ever added to this panel it must come from
// those two helpers and never from `th-TH`, which renders 2026 as พ.ศ. 2569.
// =============================================================================

export interface LifecycleSectionProps {
    analytics: DashboardAnalytics | null;
    isLoading: boolean;
    isRefreshing?: boolean;
    overdueDays: number;
    /**
     * One of the three cards here is range-scoped and two are not, which makes
     * this section the clearest case for per-card chips.
     *
     * The dwell histogram counts trips whose CLOSING event fell inside the
     * window. The overdue histogram and the dormant table are both measured
     * from `now` across the whole fleet -- their empty states already refuse to
     * offer "try a wider range" for exactly that reason.
     */
    range: DashboardRange;
    onRangeChange: (range: DashboardRange) => void;
}

// --- BAND PLUMBING ----------------------------------------------------------

// The six day-bands, in the order dashboardAnalytics.ts emits them. Kept as a
// local list rather than imported because the reducer does not export its key
// array -- and because the ORDER is what rule 6 depends on, so it should be
// visible at the point of use.
const BAND_KEYS: readonly DwellBucketKey[] = ['0_1d', '2_3d', '4_7d', '8_14d', '15_30d', '30d_plus'];

type BandLabelKey = 'b0_1' | 'b2_3' | 'b4_7' | 'b8_14' | 'b15_30' | 'b30plus';

// One lookup serves both charts. `agingOverdue` repeats the same six keys as
// `dwell` on purpose (the dictionary says so where they are defined), so a
// single map from reducer key -> dictionary key covers the pair.
const BAND_LABEL_KEY: Record<DwellBucketKey, BandLabelKey> = {
    '0_1d': 'b0_1',
    '2_3d': 'b2_3',
    '4_7d': 'b4_7',
    '8_14d': 'b8_14',
    '15_30d': 'b15_30',
    '30d_plus': 'b30plus',
};

/** Either dictionary group; both carry the same six band labels. */
type BandLabels = Record<BandLabelKey, string>;

interface BandRow {
    key: DwellBucketKey;
    label: string;
    count: number;
    isBreach: boolean;
}

// Inclusive upper bound of each band in whole days -- the same edges as
// DAY_BUCKET_MAX in services/analytics/dashboardAnalytics.ts. Duplicated (not
// imported: the reducer keeps it private) for exactly one job, placing the
// median marker in the band the reducer would have counted it into. If those
// edges ever move, this list moves with them.
const BAND_MAX_DAYS: readonly number[] = [1, 3, 7, 14, 30, Infinity];

const bandIndexForDays = (days: number): number => {
    const d = days < 0 ? 0 : days;
    for (let i = 0; i < BAND_MAX_DAYS.length; i++) {
        if (d <= BAND_MAX_DAYS[i]) return i;
    }
    return BAND_MAX_DAYS.length - 1;
};

// Built from BAND_KEYS, never from the histogram: that is what guarantees six
// bands in a stable order even if a future reducer emits a subset (rule 6).
const dwellBands = (histogram: readonly DwellHistogramBin[], labels: BandLabels): BandRow[] =>
    BAND_KEYS.map((key) => ({
        key,
        label: labels[BAND_LABEL_KEY[key]],
        count: histogram.find((bin) => bin.bucket === key)?.count ?? 0,
        isBreach: false,
    }));

const overdueBands = (histogram: readonly OverdueHistogramBin[], labels: BandLabels): BandRow[] =>
    BAND_KEYS.map((key) => {
        const bin = histogram.find((b) => b.bucket === key);
        return {
            key,
            label: labels[BAND_LABEL_KEY[key]],
            count: bin?.count ?? 0,
            isBreach: bin?.isBreach ?? false,
        };
    });

const bandTotal = (rows: readonly BandRow[]): number => rows.reduce((sum, row) => sum + row.count, 0);

/**
 * A duration with its unit, in the active language.
 *
 * There is no duration unit anywhere in the dictionary -- `dwell.median` and
 * `dwell.p90` are bare labels, and the only unit-bearing strings are the band
 * labels themselves. A bare "5.1" under "Median" beside a chart banded in days
 * would be read as days when the field is `medianHours`, so the unit is not
 * optional. It comes from ICU/CLDR through Intl rather than from an invented
 * dictionary key: this is number formatting, the same category of thing as the
 * toLocaleDateString call in AdminHelpers, not a translated string.
 *
 * Hours below a day, days above it, one decimal either way. The try/catch is
 * for `style: 'unit'`, which needs Safari 14.1+; useReducedMotion.ts already
 * carries a fallback for Safari < 14, so this file assumes nothing better.
 */

// --- SHARED CHART GEOMETRY --------------------------------------------------

// Both histograms draw the same six bands (BAND_KEYS), and both take their
// height from the shared rule in chartTheme.ts rather than from a number of
// their own. Counted off BAND_KEYS rather than written as `6`, so adding a band
// to the reducer cannot leave the plot one band short of its own data.
//
// It used to be a literal 264, which reserved ~39px per band to draw an 18px
// bar. At the shared 30px pitch the same six bands come out at 220 -- 44px of
// white gone from each card, and, because they share a row, 44px off the row.
const PLOT_HEIGHT = bandPlotHeight(BAND_KEYS.length);

// The category gutter. Sized for the widest label in either language --
// "เกิน 30 วัน" (~66px at 12px) -- with room left for the tick gap. This is the
// width that lets rule 6 hold at 328px.
const Y_AXIS_WIDTH = 96;

// Bars are thinner than their band so the median ReferenceLine's label has
// clear space above the bar it sits over.
const BAR_MAX_SIZE = 18;

// `right` leaves room for the breach icon drawn at the end of the longest bar,
// which would otherwise be clipped by the plot edge.
const CHART_MARGIN = { top: 4, right: 28, bottom: 0, left: 0 } as const;

// --- HTML TOOLTIP (rule 4) --------------------------------------------------

interface BandTooltipProps {
    // All optional: Recharts clones this element and injects these at runtime,
    // so the JSX call site below supplies only `breachNote`.
    active?: boolean;
    payload?: ReadonlyArray<{ payload?: BandRow }>;
    /** Only the overdue chart passes one; the dwell chart has no breach concept. */
    breachNote?: string;
    countLabel: string;
}

const BandTooltip: React.FC<BandTooltipProps> = ({ active, payload, breachNote, countLabel }) => {
    const row = payload?.[0]?.payload;
    if (!active || !row) return null;

    return (
        // max-w plus normal wrapping: a Thai sentence has no inter-word spaces
        // to break at, so an unbounded tooltip runs off the card. The SVG
        // default tooltip cannot do this at all -- it hard-codes a pixel width.
        <div className="max-w-[15rem] rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
            <p className="text-xs font-semibold text-slate-900">{row.label}</p>
            <p className="mt-0.5 text-sm text-slate-700">
                <span className="tabular-nums">{row.count}</span>
                <span className="ml-1.5 text-xs text-slate-500">{countLabel}</span>
            </p>
            {row.isBreach && breachNote && (
                <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed text-red-700">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{breachNote}</span>
                </p>
            )}
        </div>
    );
};

// --- PER-BAR BREACH ICON (rule 7) -------------------------------------------

/**
 * Draws an AlertTriangle at the end of every breaching bar.
 *
 * Positioned from the label's own viewBox (the bar's rectangle) rather than
 * from the axis, so it lands correctly whatever the bar's length -- including
 * a zero-count breach band, where it sits against the axis.
 *
 * A lucide icon renders an `<svg>`, and a nested `<svg>` with x/y/width/height
 * is valid inside the chart's SVG; lucide spreads unknown props onto that
 * element, so x and y pass straight through.
 */
const breachMarker =
    (rows: readonly BandRow[]) =>
    (props: LabelProps): React.ReactElement => {
        const row = rows[props.index ?? -1];
        const box = props.viewBox as { x?: number; y?: number; width?: number; height?: number } | undefined;
        if (!row?.isBreach || !box) return <g />;

        const x = (box.x ?? 0) + (box.width ?? 0) + 6;
        const y = (box.y ?? 0) + (box.height ?? 0) / 2 - 6;

        return (
            <g>
                <AlertTriangle x={x} y={y} size={12} color={BREACH_COLOR} strokeWidth={2.5} />
            </g>
        );
    };

// --- CARD 1: DWELL-TIME DISTRIBUTION ----------------------------------------

interface DwellCardProps {
    dwell: DwellStats | null;
    isLoading: boolean;
    isRefreshing: boolean;
    range: DashboardRange;
    onRangeChange: (range: DashboardRange) => void;
}

const DwellCard: React.FC<DwellCardProps> = ({
    dwell,
    isLoading,
    isRefreshing,
    range,
    onRangeChange,
}) => {
    const t = useT();
    const lang = useLang();
    const reduced = useReducedMotion();

    const copy = t.dashboard.analytics;
    // Durations follow the app's date policy in spirit: one presentation in
    // both languages where the value is a date, but a unit is a unit, so this
    // one does follow the active language.
    const locale = lang === 'th' ? 'th' : 'en-GB';

    const rows = dwellBands(dwell?.histogram ?? [], copy.dwell);
    // Empty when no trip CLOSED inside the range. `openCount` may still be
    // non-zero, and the footer keeps reporting it -- an all-open window is a
    // real reading, not a blank card.
    const isEmpty = !dwell || dwell.samples === 0;

    const medianBand = dwell ? rows[bandIndexForDays(Math.floor(dwell.medianHours / 24))] : undefined;
    const medianText = dwell ? `${copy.dwell.median} ${formatDuration(dwell.medianHours, locale)}` : '';

    return (
        <ChartFrame
            title={copy.dwell.title}
            subtitle={copy.dwell.subtitle}
            icon={Hourglass}
            // Range-scoped, and the chip says which window. The reducer reads
            // ~90 extra days of history so it can find the check-out that opens
            // a trip returned yesterday, but a pair only lands in this histogram
            // when its CLOSING event falls inside the window shown here.
            action={<RangeMenu value={range} onChange={onRangeChange} />}
            fixedPlotHeight={PLOT_HEIGHT}
            isLoading={isLoading}
            isRefreshing={isRefreshing}
            isEmpty={isEmpty}
            emptyState={
                <EmptyState
                    variant="plot"
                    icon={Hourglass}
                    title={copy.chart.noDataInRange}
                    // The dwell histogram is the only panel in this section
                    // actually bounded by the selected range, so it is the only
                    // one where "try a wider range" is true advice.
                    hint={copy.chart.widenRange}
                />
            }
            footer={
                <div className="flex flex-col gap-3">
                    {/* The four figures, beside the chart rather than inside it:
                        ChartFrame's children go straight into ResponsiveContainer,
                        which takes exactly one chart element. */}
                    <dl className="flex flex-wrap gap-x-6 gap-y-3">
                        <div className="min-w-0">
                            <dt className="whitespace-nowrap text-xs text-slate-500">{copy.dwell.median}</dt>
                            <dd className="mt-0.5 whitespace-nowrap text-sm font-semibold text-slate-900">
                                {dwell ? formatDuration(dwell.medianHours, locale) : '-'}
                            </dd>
                        </div>
                        <div className="min-w-0">
                            <dt className="whitespace-nowrap text-xs text-slate-500">{copy.dwell.p90}</dt>
                            <dd className="mt-0.5 whitespace-nowrap text-sm font-semibold text-slate-900">
                                {dwell ? formatDuration(dwell.p90Hours, locale) : '-'}
                            </dd>
                        </div>
                        <div className="min-w-0">
                            {/* "Still out" / "ยังไม่ถูกรับคืน". NOT "currently
                                checked out": this is a floor bounded by the fetch
                                window, not fleet.in_use. See the header note. */}
                            <dt className="whitespace-nowrap text-xs text-slate-500">{copy.dwell.openCount}</dt>
                            <dd className="mt-0.5 whitespace-nowrap text-sm font-semibold text-slate-900 tabular-nums">
                                {dwell ? dwell.openCount : '-'}
                            </dd>
                        </div>
                    </dl>

                    {/* Says the denominator out loud: completed trips only, which
                        is the counting rule the histogram follows. */}
                    <p className="text-xs leading-relaxed text-slate-500">
                        {copy.dwell.samples(dwell?.samples ?? 0)}
                    </p>

                    <DataTableView
                        caption={copy.chart.tableCaption(copy.dwell.title)}
                        summaryLabel={copy.chart.showTable}
                        columns={[
                            { key: 'band', label: copy.dwell.title },
                            { key: 'count', label: t.common.total, numeric: true },
                        ]}
                        rows={rows.map((row) => ({ band: row.label, count: row.count }))}
                    />
                </div>
            }
        >
            <BarChart data={rows} layout="vertical" margin={CHART_MARGIN}>
                {/* GRID_PROPS is written for a vertical-bar chart, where the value
                    runs up the Y axis and only horizontal rules help. Here the
                    value axis is X, so the orientation flips -- the stroke and the
                    `strokeDasharray: undefined` (solid, never dashed) come from
                    the theme unchanged. */}
                <CartesianGrid {...GRID_PROPS} horizontal={false} vertical />
                <XAxis type="number" allowDecimals={false} {...AXIS_PROPS} />
                <YAxis type="category" dataKey="label" width={Y_AXIS_WIDTH} {...AXIS_PROPS} />
                <Tooltip content={<BandTooltip countLabel={t.common.total} />} />

                {/* Before <Bar> so the bars paint over it: the marker is a
                    reading aid, not data, and it must never obscure a bar. It
                    sits at the band the median falls into, which is the only
                    position a duration can take on a banded category axis. */}
                {dwell && dwell.samples > 0 && medianBand && (
                    <ReferenceLine
                        y={medianBand.label}
                        stroke={CHART_CHROME.label}
                        strokeWidth={2}
                        label={{
                            value: medianText,
                            position: 'insideTopRight',
                            // CHART_CHROME.label is the theme's text colour
                            // (#475569). Never slate-400 -- 2.56:1 is decoration,
                            // not text. Axis ticks get theirs from AXIS_PROPS.
                            fill: CHART_CHROME.label,
                            fontSize: 12,
                        }}
                    />
                )}

                <Bar
                    dataKey="count"
                    // One hue for every bar (rule 1). No Cells here: the dwell
                    // distribution has no sanctioned exception.
                    fill={DISTRIBUTION_COLOR}
                    radius={[0, 4, 4, 0]}
                    maxBarSize={BAR_MAX_SIZE}
                    isAnimationActive={!reduced}
                />
            </BarChart>
        </ChartFrame>
    );
};

// --- CARD 2: DAYS OVERDUE ---------------------------------------------------

interface OverdueCardProps {
    aging: AgingStats | null;
    overdueDays: number;
    isLoading: boolean;
    isRefreshing: boolean;
}

const OverdueCard: React.FC<OverdueCardProps> = ({ aging, overdueDays, isLoading, isRefreshing }) => {
    const t = useT();
    const reduced = useReducedMotion();

    const copy = t.dashboard.analytics;
    const rows = overdueBands(aging?.overdueHistogram ?? [], copy.agingOverdue);
    const isEmpty = !aging || bandTotal(rows) === 0;
    const breachNote = copy.agingOverdue.breachNote(overdueDays);

    return (
        <ChartFrame
            title={copy.agingOverdue.title}
            subtitle={copy.agingOverdue.subtitle}
            icon={AlarmClock}
            // Not range-scoped: built from the pallet rows against `now`, which
            // is the same reason its empty state below withholds the "try a
            // wider range" hint that the card beside it offers.
            action={<AsOfNowChip />}
            fixedPlotHeight={PLOT_HEIGHT}
            isLoading={isLoading}
            isRefreshing={isRefreshing}
            isEmpty={isEmpty}
            emptyState={
                <EmptyState
                    variant="plot"
                    icon={AlarmClock}
                    title={copy.chart.noDataInRange}
                    // No `widenRange` hint: this histogram is built from the
                    // pallet rows against `now`, not from the transactions in
                    // the selected range, so a wider range would change nothing
                    // and the advice would be a lie. Empty here means nothing is
                    // checked out at all.
                />
            }
            footer={
                <div className="flex flex-col gap-3">
                    {/* Only the exception needs a legend entry -- a single-hue
                        distribution has nothing to distinguish. Colour, icon and
                        text together (rule 7); no whitespace-nowrap on the note,
                        which is a sentence and must be allowed to wrap. */}
                    <ul className="flex flex-wrap gap-x-4 gap-y-2">
                        <li className="flex min-w-0 items-start gap-1.5 text-xs leading-relaxed text-red-700">
                            <span
                                className="mt-1 h-2.5 w-2.5 shrink-0 rounded-[3px]"
                                style={{ backgroundColor: BREACH_COLOR }}
                                aria-hidden="true"
                            />
                            <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                            <span>{breachNote}</span>
                        </li>
                    </ul>

                    <DataTableView
                        caption={copy.chart.tableCaption(copy.agingOverdue.title)}
                        summaryLabel={copy.chart.showTable}
                        columns={[
                            { key: 'band', label: copy.agingOverdue.title },
                            { key: 'count', label: t.common.total, numeric: true },
                        ]}
                        rows={rows.map((row) => ({ band: row.label, count: row.count }))}
                    />
                </div>
            }
        >
            <BarChart data={rows} layout="vertical" margin={CHART_MARGIN}>
                <CartesianGrid {...GRID_PROPS} horizontal={false} vertical />
                <XAxis type="number" allowDecimals={false} {...AXIS_PROPS} />
                <YAxis type="category" dataKey="label" width={Y_AXIS_WIDTH} {...AXIS_PROPS} />
                <Tooltip content={<BandTooltip countLabel={t.common.total} breachNote={breachNote} />} />

                <Bar
                    dataKey="count"
                    fill={DISTRIBUTION_COLOR}
                    radius={[0, 4, 4, 0]}
                    maxBarSize={BAR_MAX_SIZE}
                    isAnimationActive={!reduced}
                >
                    {/* The one sanctioned break from rule 1. A band is flagged
                        only when its LOWER bound already exceeds the threshold,
                        i.e. every pallet in it is late -- the reducer decides
                        that, not this component. */}
                    {rows.map((row) => (
                        <Cell key={row.key} fill={row.isBreach ? BREACH_COLOR : DISTRIBUTION_COLOR} />
                    ))}
                    <LabelList dataKey="count" content={breachMarker(rows)} />
                </Bar>
            </BarChart>
        </ChartFrame>
    );
};

// --- SECTION ----------------------------------------------------------------

export const LifecycleSection: React.FC<LifecycleSectionProps> = ({
    analytics,
    isLoading,
    isRefreshing = false,
    overdueDays,
    range,
    onRangeChange,
}) => (
    // Exactly one row of exactly two cards now, and the pairing is the point:
    // these are the two histograms built on one geometry (PLOT_HEIGHT,
    // Y_AXIS_WIDTH, CHART_MARGIN, the same six day-bands) precisely so a reader
    // can compare them by SHAPE. Side by side is the only arrangement in which
    // that comparison is available at a glance.
    //
    // Columns step at md/xl only. `lg` is reserved for the shell: the sidebar
    // takes 256px from that breakpoint up, which is why the measured content
    // width at 1024px (704px) is NARROWER than at 768px (736px). A second
    // column at `lg` would land in the tightest column on the whole ladder.
    // `print-paper-grid` -- paper columns, not viewport columns. See index.css.
    <div className="print-paper-grid grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-2">
        <DwellCard
            dwell={analytics?.dwell ?? null}
            isLoading={isLoading}
            isRefreshing={isRefreshing}
            range={range}
            onRangeChange={onRangeChange}
        />
        <OverdueCard
            aging={analytics?.aging ?? null}
            overdueDays={overdueDays}
            isLoading={isLoading}
            isRefreshing={isRefreshing}
        />
    </div>
);
