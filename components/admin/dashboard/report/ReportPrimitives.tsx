import React from 'react';
import { CHART_CHROME, DISTRIBUTION_COLOR } from '../../charts/chartTheme';

// The paper's drawing kit.
//
// NOT ONE MARK BELOW MEASURES ANYTHING. A bar is a `<div>` whose width is a
// percentage of its row; a heat cell is a grid cell with a background colour;
// the curves and the donut are SVG drawn in a fixed viewBox and scaled by the
// browser. There is no ResponsiveContainer and no ResizeObserver anywhere in
// this folder.
//
// That is the constraint the whole report is built on, for the reason in
// ReportPage.tsx: a printed sheet is a fixed box, so every figure on it has to
// be exactly as tall as this file says it is. A ResponsiveContainer cannot
// promise that -- it reports a height only after it has measured a width, and it
// measures asynchronously, so a page laid out around it is laid out around a
// number that has not arrived. It is also what makes printing without a preview
// safe: once React has committed, there is nothing left to wait for.
//
// LOOKING LIKE THE SCREEN IS A SEPARATE OBLIGATION, and not one that follows
// from the above. Colours come from chartTheme.ts rather than from literals here
// so the report and the dashboard cannot disagree about what "damaged" is
// coloured, and ReportSparkArea reproduces the movement strips down to the
// interpolation -- because a reader holding the printout should not have to work
// out which chart on their monitor it corresponds to.

// --- FRAME ------------------------------------------------------------------

export interface ReportFigureProps {
    title: string;
    subtitle?: string;
    /** Right-hand side of the title row: a scope statement, a total, a unit. */
    meta?: React.ReactNode;
    /** Under the body, in small type. Caveats, sample counts, truncation notes. */
    note?: React.ReactNode;
    children: React.ReactNode;
    /** Lets a figure claim its share of the sheet in a flex column. */
    grow?: boolean;
}

/**
 * The block every figure sits in.
 *
 * A hairline rule under the title and no card, no shadow, no rounded surface.
 * The dashboard's cards exist to separate panels on a scrolling page; a sheet of
 * paper already has edges, and sixteen rounded boxes with borders on eight sheets
 * reads as a screenshot of an app rather than as a report.
 */
export const ReportFigure: React.FC<ReportFigureProps> = ({
    title,
    subtitle,
    meta,
    note,
    children,
    grow = false,
}) => (
    <section className={`flex min-h-0 flex-col ${grow ? 'flex-1' : ''}`}>
        <div className="flex shrink-0 items-baseline justify-between gap-3 border-b border-slate-300 pb-1">
            <h2 className="text-[11px] font-semibold tracking-tight text-slate-900">{title}</h2>
            {meta && <span className="shrink-0 text-[9px] text-slate-500">{meta}</span>}
        </div>
        {subtitle && (
            <p className="mt-1 shrink-0 text-[9px] leading-snug text-slate-500">{subtitle}</p>
        )}
        <div className="mt-2 min-h-0 flex-1">{children}</div>
        {note && <div className="mt-1.5 shrink-0 text-[9px] leading-snug text-slate-500">{note}</div>}
    </section>
);

// --- HORIZONTAL BARS --------------------------------------------------------

export interface HBarRow {
    key: string;
    label: string;
    value: number;
    /** Overrides DISTRIBUTION_COLOR for this row only -- e.g. an overdue breach. */
    color?: string;
    /** Appended after the value, e.g. a breach marker. */
    flag?: React.ReactNode;
}

export interface ReportHBarsProps {
    rows: readonly HBarRow[];
    /** Row height in px. The figure's height is rows.length * this, exactly. */
    rowHeight?: number;
    /** Width of the label gutter in px. */
    labelWidth?: number;
    /** Forces a shared scale across two figures meant to be compared. */
    maxOverride?: number;
    emptyLabel: string;
}

/**
 * A horizontal bar per row, with the category name in a fixed left gutter.
 *
 * Horizontal, never vertical, and that is a Thai typography constraint rather
 * than a preference -- the same one LifecycleSection.tsx records. Category names
 * under a vertical bar chart have to be rotated or dropped, and rotated Thai
 * strands every tone mark and upper vowel from the consonant it belongs to.
 *
 * The scale is drawn as text on each bar rather than as an axis. On a 703px
 * sheet an axis costs a row of ticks and a gridline set to communicate what four
 * numbers already say, and the numbers can be read without sighting along a
 * rule.
 */
export const ReportHBars: React.FC<ReportHBarsProps> = ({
    rows,
    rowHeight = 18,
    labelWidth = 96,
    maxOverride,
    emptyLabel,
}) => {
    // `|| 1` and not `?? 1`: an all-zero histogram has a real max of 0, and
    // dividing by it would make every bar NaN% wide -- which renders as a bar of
    // no width, i.e. indistinguishable from a correct zero. The guard is for the
    // arithmetic, not for missing data.
    const max = maxOverride ?? (Math.max(...rows.map((r) => r.value), 0) || 1);

    if (rows.length === 0) {
        return <p className="text-[9px] text-slate-400">{emptyLabel}</p>;
    }

    return (
        <ul className="flex flex-col justify-start">
            {rows.map((row) => (
                <li
                    key={row.key}
                    className="flex items-center gap-2"
                    style={{ height: rowHeight }}
                >
                    <span
                        className="shrink-0 truncate text-right text-[9px] text-slate-600"
                        style={{ width: labelWidth }}
                        title={row.label}
                    >
                        {row.label}
                    </span>
                    {/* The track. A hairline base so a zero-count band is still
                        a visible row rather than a gap the eye skips -- six
                        bands must always read as six. */}
                    <span className="relative min-w-0 flex-1 border-b border-slate-100">
                        <span
                            className="block h-[9px] rounded-[2px]"
                            style={{
                                width: `${(row.value / max) * 100}%`,
                                backgroundColor: row.color ?? DISTRIBUTION_COLOR,
                            }}
                        />
                    </span>
                    <span className="flex w-10 shrink-0 items-center justify-end gap-1 text-[9px] font-medium tabular-nums text-slate-800">
                        {row.value}
                        {row.flag}
                    </span>
                </li>
            ))}
        </ul>
    );
};

// --- STACKED HORIZONTAL BARS ------------------------------------------------

export interface StackSegment {
    key: string;
    value: number;
    color: string;
}

export interface StackRow {
    key: string;
    label: string;
    segments: readonly StackSegment[];
    total: number;
}

export interface ReportStackBarsProps {
    rows: readonly StackRow[];
    rowHeight?: number;
    labelWidth?: number;
    emptyLabel: string;
}

export const ReportStackBars: React.FC<ReportStackBarsProps> = ({
    rows,
    rowHeight = 20,
    labelWidth = 96,
    emptyLabel,
}) => {
    const max = Math.max(...rows.map((r) => r.total), 0) || 1;

    if (rows.length === 0) {
        return <p className="text-[9px] text-slate-400">{emptyLabel}</p>;
    }

    return (
        <ul className="flex flex-col justify-start">
            {rows.map((row) => (
                <li key={row.key} className="flex items-center gap-2" style={{ height: rowHeight }}>
                    <span
                        className="shrink-0 truncate text-right text-[9px] text-slate-600"
                        style={{ width: labelWidth }}
                        title={row.label}
                    >
                        {row.label}
                    </span>
                    <span className="relative min-w-0 flex-1 border-b border-slate-100">
                        {/* The row is scaled to the widest total, then the
                            segments divide THAT width -- not the row's. Scaling
                            each segment to the row instead would draw every row
                            the same length and destroy the comparison the chart
                            exists for. */}
                        <span
                            className="flex h-[11px] overflow-hidden rounded-[2px]"
                            style={{ width: `${(row.total / max) * 100}%` }}
                        >
                            {row.segments
                                .filter((s) => s.value > 0)
                                .map((s) => (
                                    <span
                                        key={s.key}
                                        style={{
                                            width: `${(s.value / (row.total || 1)) * 100}%`,
                                            backgroundColor: s.color,
                                        }}
                                    />
                                ))}
                        </span>
                    </span>
                    <span className="w-10 shrink-0 text-right text-[9px] font-medium tabular-nums text-slate-800">
                        {row.total}
                    </span>
                </li>
            ))}
        </ul>
    );
};

// --- COLUMN SPARKLINE -------------------------------------------------------

export interface ColumnPoint {
    key: string;
    label: string;
    value: number;
}

// `ReportColumns` -- one series as a row of discrete columns -- used to live
// here. It was the report's first take on the movement strips, and it was
// dropped for a reason worth writing down: it made the report and the dashboard
// look like two different charts of the same numbers. The screen draws these as
// smoothed, filled areas; a reader holding the printout should not have to work
// out that the bar chart in their hand is the curve on their monitor.
//
// `ReportSparkArea` above is the replacement, and it matches the screen down to
// the interpolation (monotone cubic, the same curve Recharts' `type="monotone"`
// draws) and the two gradient stops.

export interface StackColumnPoint {
    key: string;
    label: string;
    segments: readonly StackSegment[];
    total: number;
}

export interface ReportStackColumnsProps {
    points: readonly StackColumnPoint[];
    height: number;
    showAxis?: boolean;
}

/** The stacked counterpart of ReportColumns, for a trend of composed events. */
export const ReportStackColumns: React.FC<ReportStackColumnsProps> = ({
    points,
    height,
    showAxis = true,
}) => {
    const max = Math.max(...points.map((p) => p.total), 0) || 1;
    const labelEvery = Math.max(1, Math.ceil(points.length / 6));

    return (
        <div>
            <div className="flex items-end gap-px" style={{ height }}>
                {points.map((point) => (
                    <span
                        key={point.key}
                        className="flex min-w-0 flex-1 flex-col justify-end"
                        style={{ height }}
                    >
                        {point.total === 0 ? (
                            <span
                                className="w-full"
                                style={{ height: 1, backgroundColor: CHART_CHROME.grid }}
                            />
                        ) : (
                            // Drawn top-down so the stack order on paper matches
                            // the legend's order read left-to-right. Reversing
                            // the array here rather than the legend keeps the
                            // legend in the order chartTheme.ts validated the
                            // colours in.
                            [...point.segments]
                                .reverse()
                                .filter((s) => s.value > 0)
                                .map((s) => (
                                    <span
                                        key={s.key}
                                        className="w-full"
                                        style={{
                                            height: (s.value / max) * height,
                                            backgroundColor: s.color,
                                        }}
                                    />
                                ))
                        )}
                    </span>
                ))}
            </div>
            <div className="mt-0.5 border-t border-slate-200" />
            {showAxis && (
                <div className="mt-0.5 flex gap-px">
                    {points.map((point, i) => (
                        <span
                            key={point.key}
                            className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-[8px] text-slate-500"
                        >
                            {i % labelEvery === 0 ? point.label : ' '}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- DONUT ------------------------------------------------------------------

export interface DonutSlice {
    key: string;
    label: string;
    value: number;
    color: string;
}

export interface ReportDonutProps {
    slices: readonly DonutSlice[];
    /** Diameter in px. The figure reserves exactly this. */
    size: number;
    /** Large figure in the hole. */
    centerValue: string | number;
    /** Small line under it. */
    centerLabel: string;
}

// The one mark in the report drawn as SVG rather than as boxes, because an arc
// is not expressible as a div.
//
// Hand-written rather than Recharts, for the reason at the top of this file: a
// <PieChart> still wants a width, and the report's whole premise is that nothing
// on the sheet asks the DOM how big it is. Two arcs and a `<path>` is less code
// than the props it would take to pin one down.
const polar = (cx: number, cy: number, r: number, angleDeg: number) => {
    // -90 so 0 degrees is 12 o'clock. A pie starting at 3 o'clock makes the
    // reader hunt for the first slice; starting at the top makes reading order
    // and draw order the same, which is what the screen's donut does too.
    const a = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

const arcPath = (
    cx: number,
    cy: number,
    rOuter: number,
    rInner: number,
    startDeg: number,
    endDeg: number,
): string => {
    const large = endDeg - startDeg > 180 ? 1 : 0;
    const o1 = polar(cx, cy, rOuter, startDeg);
    const o2 = polar(cx, cy, rOuter, endDeg);
    const i2 = polar(cx, cy, rInner, endDeg);
    const i1 = polar(cx, cy, rInner, startDeg);
    return [
        `M ${o1.x} ${o1.y}`,
        `A ${rOuter} ${rOuter} 0 ${large} 1 ${o2.x} ${o2.y}`,
        `L ${i2.x} ${i2.y}`,
        `A ${rInner} ${rInner} 0 ${large} 0 ${i1.x} ${i1.y}`,
        'Z',
    ].join(' ');
};

export const ReportDonut: React.FC<ReportDonutProps> = ({
    slices,
    size,
    centerValue,
    centerLabel,
}) => {
    const total = slices.reduce((sum, s) => sum + s.value, 0);
    const cx = size / 2;
    const cy = size / 2;
    const rOuter = size / 2;
    const rInner = size * 0.31;

    const drawn = slices.filter((s) => s.value > 0);
    // A single slice covering the whole circle cannot be an arc: its start and
    // end angles are the same point, so the path degenerates and the browser
    // draws nothing at all. A ring drawn as a stroked circle is the same shape
    // and is the only correct rendering of "one status holds the entire fleet".
    const isWhole = drawn.length === 1 && total > 0;

    let cursor = 0;

    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="presentation">
                {total === 0 ? (
                    <circle
                        cx={cx}
                        cy={cy}
                        r={(rOuter + rInner) / 2}
                        fill="none"
                        stroke={CHART_CHROME.grid}
                        strokeWidth={rOuter - rInner}
                    />
                ) : isWhole ? (
                    <circle
                        cx={cx}
                        cy={cy}
                        r={(rOuter + rInner) / 2}
                        fill="none"
                        stroke={drawn[0].color}
                        strokeWidth={rOuter - rInner}
                    />
                ) : (
                    drawn.map((slice) => {
                        const sweep = (slice.value / total) * 360;
                        const start = cursor;
                        cursor += sweep;
                        return (
                            <path
                                key={slice.key}
                                d={arcPath(cx, cy, rOuter, rInner, start, cursor)}
                                fill={slice.color}
                                // A hairline in the surface colour, so touching
                                // arcs read as separate without a gap that would
                                // change the arc lengths the eye is comparing.
                                stroke={CHART_CHROME.surface}
                                strokeWidth={1.5}
                            />
                        );
                    })
                )}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
                <span className="text-[17px] font-semibold tracking-tight text-slate-900">
                    {centerValue}
                </span>
                <span className="mt-1 text-[8px] text-slate-500">{centerLabel}</span>
            </div>
        </div>
    );
};

// --- SPARK AREA (the movement strips) ---------------------------------------

/**
 * Monotone cubic interpolation, as an SVG path.
 *
 * This is Fritsch-Carlson, which is what `d3-shape`'s `curveMonotoneX` -- and
 * therefore Recharts' `type="monotone"` -- implements. It is written out here
 * rather than approximated with a Catmull-Rom spline, and the difference is not
 * cosmetic: Catmull-Rom overshoots at a local extremum, so a series that goes
 * 0, 6, 0 would be drawn dipping BELOW zero on both sides of the peak. On a
 * chart of counts that is a curve claiming a negative number of pallets.
 *
 * Monotone cubic is defined by exactly that constraint -- it cannot overshoot
 * between two data points -- which is why the dashboard's strips use it and why
 * the report has to use the same one to look like them.
 */
const monotonePath = (pts: readonly { x: number; y: number }[]): string => {
    const n = pts.length;
    if (n === 0) return '';
    if (n === 1) return `M ${pts[0].x} ${pts[0].y}`;
    if (n === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;

    const dx: number[] = [];
    const slope: number[] = [];
    for (let i = 0; i < n - 1; i++) {
        dx[i] = pts[i + 1].x - pts[i].x;
        slope[i] = (pts[i + 1].y - pts[i].y) / dx[i];
    }

    // The tangent at each point. Forced to zero wherever the slope changes sign
    // -- that is the no-overshoot condition, and it is what turns a spike into a
    // rounded peak instead of a loop.
    const tangent: number[] = new Array(n);
    tangent[0] = slope[0];
    tangent[n - 1] = slope[n - 2];
    for (let i = 1; i < n - 1; i++) {
        if (slope[i - 1] * slope[i] <= 0) {
            tangent[i] = 0;
        } else {
            const w1 = 2 * dx[i] + dx[i - 1];
            const w2 = dx[i] + 2 * dx[i - 1];
            tangent[i] = (w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]);
        }
    }

    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < n - 1; i++) {
        const h = dx[i] / 3;
        d +=
            ` C ${pts[i].x + h} ${pts[i].y + h * tangent[i]}` +
            ` ${pts[i + 1].x - h} ${pts[i + 1].y - h * tangent[i + 1]}` +
            ` ${pts[i + 1].x} ${pts[i + 1].y}`;
    }
    return d;
};

/** The viewBox width every strip is drawn in. See the note on the component. */
const SPARK_VIEW_WIDTH = 560;

/** Matches Y_AXIS_WIDTH in TrendStrips.tsx: one tick, the series' own peak. */
const SPARK_GUTTER_PX = 26;

export interface ReportSparkAreaProps {
    points: readonly ColumnPoint[];
    /** Plot height in px, excluding the date axis. */
    height: number;
    color: string;
    /** Only the bottom strip of a stack draws the shared date axis. */
    showAxis?: boolean;
    /** Unique per strip -- see the note on gradient ids below. */
    gradientId: string;
}

/**
 * One series as a filled, smoothed area -- the paper twin of TrendStrips.tsx.
 *
 * It exists because the report drew these as columns and the dashboard draws
 * them as curves, so the same figure looked like two different charts depending
 * on which one you were holding.
 *
 * SVG, hand-written, and still measuring nothing. The trick is the viewBox: the
 * path is laid out in a fixed 560-unit coordinate space and the <svg> is sized
 * `width: 100%`, so the browser scales it to whatever the strip's column turns
 * out to be. `preserveAspectRatio="none"` lets it stretch horizontally without
 * changing the height, and `vector-effect="non-scaling-stroke"` is what keeps
 * the 2px line 2px wide through that stretch -- without it a horizontal scale
 * would draw an elliptical pen and the stroke would thicken.
 *
 * The gradient id has to be unique across the DOCUMENT. Five strips defining
 * `#grad` would all paint with whichever definition the browser resolved last,
 * which is the same trap TrendStrips.tsx uses `useId()` for.
 */
export const ReportSparkArea: React.FC<ReportSparkAreaProps> = ({
    points,
    height,
    color,
    showAxis = false,
    gradientId,
}) => {
    // From 0 always. A domain starting at the series minimum would turn
    // "2, 3, 2" into a dramatic mountain range.
    const peak = Math.max(...points.map((p) => p.value), 0);
    const scale = peak > 0 ? peak : 1;
    // 3 units of headroom so a peak touching the top of the box does not have
    // its stroke clipped in half by the viewBox edge.
    const top = 3;
    const usable = height - top;

    const coords = points.map((p, i) => ({
        x: points.length === 1 ? SPARK_VIEW_WIDTH / 2 : (i / (points.length - 1)) * SPARK_VIEW_WIDTH,
        y: top + usable - (p.value / scale) * usable,
    }));

    const line = monotonePath(coords);
    const area =
        coords.length > 0
            ? `${line} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`
            : '';

    const labelEvery = Math.max(1, Math.ceil(points.length / 6));

    return (
        <div className="min-w-0 flex-1">
            <div className="flex items-stretch gap-1">
                {/* The gutter carries ONE tick: this series' peak. A strip with
                    no scale would let two very different series draw the same
                    shape with nothing to say which is which -- the price of
                    scaling each strip independently. Suppressed at zero: a lone
                    "0" is a label for a scale with no range. */}
                <span
                    className="shrink-0 pt-px text-right text-[8px] tabular-nums text-slate-500"
                    style={{ width: SPARK_GUTTER_PX }}
                >
                    {peak > 0 ? peak : ''}
                </span>
                <svg
                    className="min-w-0 flex-1"
                    viewBox={`0 0 ${SPARK_VIEW_WIDTH} ${height}`}
                    preserveAspectRatio="none"
                    style={{ height }}
                    role="presentation"
                >
                    <defs>
                        {/* Top-to-bottom fade rather than a flat wash, at the
                            same two stops the screen uses: the fill gives the
                            line a body, and a solid block at one alpha reads as
                            a filled region whose AREA means something. */}
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    {/* The peak gridline and the baseline. Solid, never dashed:
                        dashes add texture that competes with the data at this
                        size (GRID_PROPS says the same for the screen). */}
                    <line
                        x1="0"
                        y1={top}
                        x2={SPARK_VIEW_WIDTH}
                        y2={top}
                        stroke={CHART_CHROME.grid}
                        strokeWidth={1}
                        vectorEffect="non-scaling-stroke"
                    />
                    <line
                        x1="0"
                        y1={height}
                        x2={SPARK_VIEW_WIDTH}
                        y2={height}
                        stroke={CHART_CHROME.axis}
                        strokeWidth={1}
                        vectorEffect="non-scaling-stroke"
                    />
                    <path d={area} fill={`url(#${gradientId})`} />
                    <path
                        d={line}
                        fill="none"
                        stroke={color}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>
            </div>
            {showAxis && (
                <div className="flex gap-1">
                    <span className="shrink-0" style={{ width: SPARK_GUTTER_PX }} />
                    <div className="flex min-w-0 flex-1">
                        {points.map((point, i) => (
                            <span
                                key={point.key}
                                className="min-w-0 flex-1 whitespace-nowrap text-[8px] text-slate-500"
                            >
                                {i % labelEvery === 0 ? point.label : ''}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- STAT STRIP -------------------------------------------------------------

export interface ReportStat {
    key: string;
    label: string;
    value: string | number;
    /** Under the value. The threshold a figure is measured against, a unit, a
     *  denominator -- never decoration. */
    caption?: string;
}

export const ReportStats: React.FC<{ items: readonly ReportStat[] }> = ({ items }) => (
    <dl className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item, i) => (
            <div
                key={item.key}
                // Ruled between, not boxed. Four boxed tiles on a sheet is four
                // more borders competing with the figures under them; a single
                // hairline says "these are separate readings" for a tenth of the
                // ink.
                className={`min-w-0 px-2.5 ${i > 0 ? 'border-l border-slate-200' : 'pl-0'}`}
            >
                <dt className="text-[9px] leading-snug text-slate-500">{item.label}</dt>
                <dd className="mt-0.5 text-[15px] font-semibold leading-none tracking-tight text-slate-900">
                    {item.value}
                </dd>
                {item.caption && (
                    <p className="mt-1 text-[8px] leading-snug text-slate-500">{item.caption}</p>
                )}
            </div>
        ))}
    </dl>
);

// --- TABLE ------------------------------------------------------------------

export interface ReportColumn {
    key: string;
    label: string;
    numeric?: boolean;
    /** A CSS width for the column, e.g. '18%'. Omit to share what is left. */
    width?: string;
}

export interface ReportTableProps {
    columns: readonly ReportColumn[];
    rows: readonly Record<string, React.ReactNode>[];
    emptyLabel: string;
}

export const ReportTable: React.FC<ReportTableProps> = ({ columns, rows, emptyLabel }) => {
    if (rows.length === 0) {
        return <p className="text-[9px] text-slate-400">{emptyLabel}</p>;
    }

    return (
        <table className="w-full border-collapse text-[9px]">
            <thead>
                <tr>
                    {columns.map((col) => (
                        <th
                            key={col.key}
                            scope="col"
                            style={col.width ? { width: col.width } : undefined}
                            // No `uppercase` and no positive tracking. Both are
                            // silent one-language regressions: uppercase does
                            // nothing in Thai, so the emphasis would exist in the
                            // English report only, and positive tracking lifts
                            // Thai tone marks off their base characters.
                            className={
                                'border-b border-slate-400 pb-1 font-semibold text-slate-700 ' +
                                (col.numeric ? 'text-right tabular-nums' : 'text-left')
                            }
                        >
                            {col.label}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, i) => (
                    <tr key={i} className="border-b border-slate-100">
                        {columns.map((col) => (
                            <td
                                key={col.key}
                                className={
                                    'py-[3px] align-middle text-slate-700 ' +
                                    (col.numeric ? 'text-right tabular-nums' : 'text-left')
                                }
                            >
                                {row[col.key]}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

// --- LEGEND -----------------------------------------------------------------

export interface LegendItem {
    key: string;
    label: string;
    color: string;
    /** Optional figure beside the label, for a legend that doubles as a total. */
    value?: string | number;
}

export const ReportLegend: React.FC<{ items: readonly LegendItem[] }> = ({ items }) => (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {items.map((item) => (
            <li key={item.key} className="flex items-center gap-1 text-[9px] text-slate-600">
                <span
                    className="h-2 w-2.5 shrink-0 rounded-[1px]"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                />
                <span>{item.label}</span>
                {item.value !== undefined && (
                    <span className="font-semibold tabular-nums text-slate-900">{item.value}</span>
                )}
            </li>
        ))}
    </ul>
);
