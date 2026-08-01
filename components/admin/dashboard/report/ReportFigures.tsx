import React from 'react';

import {
    ReportDonut,
    ReportFigure,
    ReportHBars,
    ReportLegend,
    ReportSparkArea,
    ReportStackBars,
    ReportStackColumns,
    ReportStats,
    ReportTable,
} from './ReportPrimitives';
import type { HBarRow, LegendItem, StackRow } from './ReportPrimitives';
import {
    BREACH_COLOR,
    DISTRIBUTION_COLOR,
    HEAT_SCALE,
    SERIES_COLORS,
    SERIES_ORDER,
    TREND_COLORS,
    TREND_SERIES,
    heatColor,
    statusColor,
} from '../../charts/chartTheme';
import { dwellBands, overdueBands } from '../bands';
import { formatDate, formatDuration } from '../../common/AdminHelpers';
import { OTHER_LOCATION_KEY } from '../../../../services/analytics/dashboardAnalytics';
import type { DashboardAnalytics } from '../../../../services/analytics/dashboardAnalytics';
import type { Dictionary } from '../../../../locales';

// Every figure on the printed sheet.
//
// They all take `(analytics, t, ...)` and return a fixed-height block. None of
// them takes a callback, a range setter or a selection handler -- a sheet of
// paper has nothing to click, and a chevron or a "view all" button printed on it
// is a promise the medium cannot keep.
//
// Caps: several of these lists are unbounded in the data (locations, dormant
// pallets, repeat offenders, staff). A fixed page cannot hold an unbounded list,
// so each is cut to a top-N -- and every one of them prints
// `report.showingTopOf(shown, total)` underneath when it actually cut something.
// A silently truncated table on paper is indistinguishable from a complete one,
// which is the one failure mode a report must not have.

type T = Dictionary;

/** Rows shown before a table says so and stops. */
const TABLE_CAP = 8;
const LOCATION_CAP = 10;
const STAFF_CAP = 8;

const pct = (part: number, whole: number): string =>
    whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : '—';

/**
 * `formatDuration`, with "no measurement" kept distinct from "measured zero".
 *
 * The helper renders 0 hours as "0 hr". On a screen that is fine -- the sample
 * count is one hover away. On paper, a line labelled "Median" showing "0 hr"
 * asserts that these pallets came back instantly, when what actually happened is
 * that no trip closed inside the window and there is no median at all. An em
 * dash is the only honest mark for that.
 */
const duration = (hours: number, locale: string): string =>
    Number.isFinite(hours) && hours > 0 ? formatDuration(hours, locale) : '—';

/**
 * The note under a capped list, or nothing when nothing was cut.
 *
 * Returning `undefined` rather than an empty string matters: `ReportFigure`
 * omits the whole note row when there is no note, and a report that printed a
 * blank line under every complete table would look like it had lost something.
 */
const capNote = (t: T, shown: number, total: number): string | undefined =>
    total > shown ? t.dashboard.report.showingTopOf(shown, total) : undefined;

// --- FLEET ------------------------------------------------------------------

export const KpiStrip: React.FC<{ analytics: DashboardAnalytics; t: T; overdueDays: number }> = ({
    analytics,
    t,
    overdueDays,
}) => {
    const kpi = t.dashboard.analytics.kpi;
    const fleet = analytics.fleet;

    return (
        <ReportStats
            items={[
                {
                    key: 'total',
                    label: kpi.totalFleet,
                    value: fleet.total,
                    caption: kpi.totalFleetCaption,
                },
                {
                    key: 'utilisation',
                    label: kpi.utilisation,
                    value: `${fleet.utilisationPct}%`,
                    caption: kpi.utilisationCaption,
                },
                {
                    key: 'overdue',
                    label: kpi.overdue,
                    value: fleet.overdue,
                    caption: kpi.overdueCaption(overdueDays),
                },
                {
                    key: 'damaged',
                    label: kpi.damaged,
                    value: fleet.damaged,
                    caption: kpi.damagedCaption,
                },
            ]}
        />
    );
};

export const FleetHealthFigure: React.FC<{ analytics: DashboardAnalytics; t: T }> = ({
    analytics,
    t,
}) => {
    const fleet = analytics.fleet;
    // Three statuses, never four. `fleet.total` already excludes scrapped
    // pallets, so these three sum to exactly 100%. A scrapped slice would break
    // that identity and, worse, would imply a written-off pallet is part of the
    // fleet -- it is the footnote under the figure instead.
    const statuses = ['available', 'in_use', 'damaged'] as const;
    const slices = statuses.map((status) => ({
        key: status,
        label: t.status[status],
        value: fleet[status],
        color: statusColor(status),
    }));

    return (
        <ReportFigure
            title={t.dashboard.fleetHealth}
            subtitle={t.dashboard.fleetHealthSub}
            meta={t.dashboard.analytics.range.asOfNow}
            note={fleet.scrapped > 0 ? t.dashboard.scrappedFootnote(fleet.scrapped) : undefined}
        >
            <div className="flex items-center gap-6">
                <ReportDonut
                    slices={slices}
                    size={132}
                    centerValue={fleet.total}
                    centerLabel={t.dashboard.analytics.kpi.totalFleet}
                />
                {/* The legend carries the counts AND the percentages, so nothing
                    about this figure depends on judging arc lengths by eye --
                    which is the whole weakness of a donut and the reason it is
                    only used here, where there are three parts of one whole. */}
                <ul className="flex min-w-0 flex-1 flex-col gap-2">
                    {slices.map((slice) => (
                        <li key={slice.key} className="flex items-baseline gap-2">
                            <span
                                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                                style={{ backgroundColor: slice.color }}
                                aria-hidden="true"
                            />
                            <span className="min-w-0 flex-1 text-[10px] text-slate-600">
                                {slice.label}
                            </span>
                            <span className="shrink-0 text-[13px] font-semibold tabular-nums text-slate-900">
                                {slice.value}
                            </span>
                            <span className="w-12 shrink-0 text-right text-[9px] tabular-nums text-slate-500">
                                {pct(slice.value, fleet.total)}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </ReportFigure>
    );
};

export const LocationFigure: React.FC<{ analytics: DashboardAnalytics; t: T }> = ({
    analytics,
    t,
}) => {
    const all = analytics.fleet.byLocation;
    const shown = all.slice(0, LOCATION_CAP);
    const rows: HBarRow[] = shown.map((row) => ({
        key: row.name,
        // The sentinel is resolved to a display label exactly here. Everything
        // downstream reads `label`, so the raw '__other__' cannot reach paper.
        label: row.name === OTHER_LOCATION_KEY ? t.dashboard.analytics.chart.othersLabel : row.name,
        value: row.count,
    }));

    return (
        <ReportFigure
            title={t.dashboard.locationUsage}
            subtitle={t.dashboard.locationUsageSub}
            meta={t.dashboard.analytics.range.asOfNow}
            note={capNote(t, shown.length, all.length)}
        >
            <ReportHBars
                rows={rows}
                rowHeight={19}
                labelWidth={120}
                emptyLabel={t.dashboard.noLocationData}
            />
        </ReportFigure>
    );
};

export const RiskFigure: React.FC<{ analytics: DashboardAnalytics; t: T; overdueDays: number }> = ({
    analytics,
    t,
    overdueDays,
}) => {
    // The folded tail is dropped before the risk list sees it. `__other__` is an
    // aggregate of every location past the 12th, so its issue ratio is an
    // average of a dozen unrelated places -- ranking that against a single real
    // department would be meaningless.
    const all = analytics.fleet.byLocation
        .filter((row) => row.name !== OTHER_LOCATION_KEY)
        .map((row) => ({ ...row, issues: row.overdue + row.damaged }))
        .sort((a, b) => b.issues / (b.count || 1) - a.issues / (a.count || 1));
    const shown = all.slice(0, TABLE_CAP);

    return (
        <ReportFigure
            title={t.dashboard.highRiskZones}
            subtitle={t.dashboard.highRiskZonesSub}
            meta={t.dashboard.criticalOverdueSub(overdueDays)}
            note={capNote(t, shown.length, all.length)}
        >
            <ReportTable
                emptyLabel={t.dashboard.allSystemsNormal}
                columns={[
                    { key: 'name', label: t.common.location },
                    { key: 'count', label: t.dashboard.assets, numeric: true, width: '14%' },
                    { key: 'overdue', label: t.dashboard.overdue, numeric: true, width: '14%' },
                    { key: 'damaged', label: t.status.damaged, numeric: true, width: '14%' },
                    { key: 'ratio', label: t.dashboard.issues, numeric: true, width: '14%' },
                ]}
                rows={shown.map((row) => ({
                    name: row.name,
                    count: row.count,
                    overdue: row.overdue,
                    damaged: row.damaged,
                    // The ratio, not just the count: three issues out of four
                    // units is a different statement from three out of forty,
                    // and the ranking above is by ratio -- so the column the
                    // rows are sorted on has to be visible.
                    ratio: pct(row.issues, row.count),
                }))}
            />
        </ReportFigure>
    );
};

// --- MOVEMENT ---------------------------------------------------------------

export const MovementFigure: React.FC<{ analytics: DashboardAnalytics; t: T }> = ({
    analytics,
    t,
}) => {
    const a = t.dashboard.analytics;
    const label: Record<string, string> = {
        check_out: a.movement.checkOut,
        check_in: a.movement.checkIn,
        acquisition: t.dashboard.legendAcquisition,
        report_damage: a.qualityTrend.damage,
        scrap: a.qualityTrend.scrap,
        repair: a.qualityTrend.repair,
    };

    return (
        <ReportFigure
            title={a.movement.title}
            subtitle={a.movement.subtitle}
            // Each strip derives its own scale, and saying so is not optional.
            // Five strips of equal height read as one shared axis unless the
            // sheet states otherwise, and on a fleet this size the series totals
            // differ by an order of magnitude -- a reader comparing bar heights
            // across strips would be comparing nothing. The dates ARE shared, so
            // a spike on the 12th still lines up down the whole column.
            note={t.dashboard.report.stripScaleNote}
        >
            {analytics.trend.length === 0 ? (
                <p className="text-[9px] text-slate-400">{a.chart.noDataInRange}</p>
            ) : (
                <div className="flex flex-col gap-1.5">
                    {TREND_SERIES.map((key, index) => {
                        const total = analytics.trend.reduce((sum, p) => sum + p[key], 0);
                        const isLast = index === TREND_SERIES.length - 1;
                        return (
                            <div key={key} className="flex items-end gap-2">
                                {/* The same 104px gutter the screen's strips use
                                    (`grid-cols-[6.5rem_...]` in TrendStrips.tsx),
                                    carrying the same two lines in the same order:
                                    a colour dot with the series name, and the
                                    range total under it. */}
                                <div className="w-[104px] shrink-0 pb-1">
                                    <div className="flex items-start gap-1">
                                        <span
                                            className="mt-[3px] h-2 w-2 shrink-0 rounded-full"
                                            style={{ backgroundColor: TREND_COLORS[key] }}
                                            aria-hidden="true"
                                        />
                                        <span className="min-w-0 text-[9px] leading-snug text-slate-600">
                                            {label[key]}
                                        </span>
                                    </div>
                                    <span className="block pl-3 text-[12px] font-semibold leading-none tabular-nums text-slate-900">
                                        {total}
                                    </span>
                                </div>
                                <ReportSparkArea
                                    points={analytics.trend.map((p) => ({
                                        key: p.key,
                                        label: p.label,
                                        value: p[key],
                                    }))}
                                    height={46}
                                    color={TREND_COLORS[key]}
                                    // Unique per strip and stable across renders.
                                    // Five <linearGradient> elements sharing one
                                    // id would all resolve to whichever the
                                    // browser parsed last, and every strip would
                                    // paint in one colour.
                                    gradientId={`nmt-report-trend-${key}`}
                                    // Only the bottom strip draws dates. The five
                                    // share one x-domain, so one axis labels all
                                    // of them and four repeated copies would be
                                    // pure ink.
                                    showAxis={isLast}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </ReportFigure>
    );
};

export const QualityTrendFigure: React.FC<{ analytics: DashboardAnalytics; t: T }> = ({
    analytics,
    t,
}) => {
    const a = t.dashboard.analytics;
    const stack = [
        { key: 'report_damage' as const, label: a.qualityTrend.damage },
        { key: 'scrap' as const, label: a.qualityTrend.scrap },
        { key: 'repair' as const, label: a.qualityTrend.repair },
    ];

    const points = analytics.trend.map((p) => ({
        key: p.key,
        label: p.label,
        segments: stack.map((s) => ({
            key: s.key,
            value: p[s.key],
            color: SERIES_COLORS[s.key],
        })),
        total: stack.reduce((sum, s) => sum + p[s.key], 0),
    }));

    const legend: LegendItem[] = stack.map((s) => ({
        key: s.key,
        label: s.label,
        color: SERIES_COLORS[s.key],
        value: analytics.trend.reduce((sum, p) => sum + p[s.key], 0),
    }));

    return (
        <ReportFigure
            title={a.qualityTrend.title}
            subtitle={a.qualityTrend.subtitle}
            note={<ReportLegend items={legend} />}
        >
            {points.length === 0 ? (
                <p className="text-[9px] text-slate-400">{a.chart.noDataInRange}</p>
            ) : (
                <ReportStackColumns points={points} height={130} />
            )}
        </ReportFigure>
    );
};

// --- LIFECYCLE --------------------------------------------------------------

export const DwellFigure: React.FC<{ analytics: DashboardAnalytics; t: T; locale: string }> = ({
    analytics,
    t,
    locale,
}) => {
    const a = t.dashboard.analytics;
    const dwell = analytics.dwell;
    const rows = dwellBands(dwell.histogram, a.dwell);

    return (
        <ReportFigure
            title={a.dwell.title}
            subtitle={a.dwell.subtitle}
            note={a.dwell.samples(dwell.samples)}
        >
            <div className="flex flex-col gap-2">
                <ReportStats
                    items={[
                        {
                            key: 'median',
                            label: a.dwell.median,
                            value: duration(dwell.medianHours, locale),
                        },
                        {
                            key: 'p90',
                            label: a.dwell.p90,
                            value: duration(dwell.p90Hours, locale),
                        },
                        // "Still out", never "currently checked out". This is a
                        // FLOOR bounded by the fetch window -- a pallet checked
                        // out before it began has no opening event in the scan.
                        // It is not interchangeable with fleet.in_use.
                        { key: 'open', label: a.dwell.openCount, value: dwell.openCount },
                    ]}
                />
                <ReportHBars
                    rows={rows.map((row) => ({ key: row.key, label: row.label, value: row.count }))}
                    rowHeight={17}
                    labelWidth={72}
                    emptyLabel={a.chart.noDataInRange}
                />
            </div>
        </ReportFigure>
    );
};

export const OverdueAgeFigure: React.FC<{
    analytics: DashboardAnalytics;
    t: T;
    overdueDays: number;
}> = ({ analytics, t, overdueDays }) => {
    const a = t.dashboard.analytics;
    const rows = overdueBands(analytics.aging.overdueHistogram, a.agingOverdue);

    return (
        <ReportFigure
            title={a.agingOverdue.title}
            subtitle={a.agingOverdue.subtitle}
            meta={a.range.asOfNow}
            // A breaching band never ships as colour alone: the fill, the ✱ at
            // the end of the bar and this sentence naming the threshold are three
            // signals for one fact.
            note={
                <span className="flex items-start gap-1 text-red-700">
                    <span
                        className="mt-[3px] h-2 w-2.5 shrink-0 rounded-[1px]"
                        style={{ backgroundColor: BREACH_COLOR }}
                        aria-hidden="true"
                    />
                    <span>{a.agingOverdue.breachNote(overdueDays)}</span>
                </span>
            }
        >
            <ReportHBars
                rows={rows.map((row) => ({
                    key: row.key,
                    label: row.label,
                    value: row.count,
                    color: row.isBreach ? BREACH_COLOR : DISTRIBUTION_COLOR,
                    flag: row.isBreach ? (
                        <span className="text-red-700" aria-hidden="true">
                            ✱
                        </span>
                    ) : undefined,
                }))}
                rowHeight={17}
                labelWidth={72}
                emptyLabel={a.chart.noDataInRange}
            />
        </ReportFigure>
    );
};

export const DormantFigure: React.FC<{ analytics: DashboardAnalytics; t: T }> = ({
    analytics,
    t,
}) => {
    const a = t.dashboard.analytics;
    const all = analytics.aging.dormant;
    const shown = all.slice(0, TABLE_CAP);

    return (
        <ReportFigure
            title={a.dormant.title}
            subtitle={a.dormant.subtitle}
            meta={a.range.asOfNow}
            note={capNote(t, shown.length, all.length)}
        >
            <ReportTable
                emptyLabel={a.chart.noDataInRange}
                columns={[
                    { key: 'id', label: a.dormant.palletId, width: '18%' },
                    { key: 'status', label: a.dormant.status, width: '22%' },
                    { key: 'location', label: a.dormant.location },
                    { key: 'days', label: a.dormant.daysIdle, numeric: true, width: '18%' },
                ]}
                rows={shown.map((row) => ({
                    id: <span className="font-medium text-slate-900">{row.palletId}</span>,
                    status: t.status[row.status],
                    location: row.location,
                    days: row.daysIdle.toFixed(1),
                }))}
            />
        </ReportFigure>
    );
};

// --- QUALITY ----------------------------------------------------------------

export const FunnelFigure: React.FC<{ analytics: DashboardAnalytics; t: T }> = ({
    analytics,
    t,
}) => {
    const a = t.dashboard.analytics;
    const f = analytics.damage;
    const resolved = f.repaired + f.scrapped;
    // Rounded once, here, and used for both the label and the arc. Formatting it
    // twice is how a gauge and its caption end up disagreeing by a point.
    const ratePct = f.reported > 0 ? Math.round((resolved / f.reported) * 100) : 0;

    const slices = [
        { key: 'repaired', label: a.funnel.repaired, value: f.repaired, color: SERIES_COLORS.repair },
        { key: 'scrapped', label: a.funnel.scrapped, value: f.scrapped, color: SERIES_COLORS.scrap },
        {
            key: 'open',
            label: a.funnel.stillOpen,
            value: f.stillOpen,
            color: DISTRIBUTION_COLOR,
        },
    ];

    return (
        <ReportFigure title={a.funnel.title} subtitle={a.funnel.subtitle}>
            <div className="flex items-center gap-6">
                <ReportDonut
                    slices={slices}
                    size={112}
                    centerValue={`${ratePct}%`}
                    centerLabel={a.funnel.resolved}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <ReportStats
                        items={[
                            { key: 'reported', label: a.funnel.reported, value: f.reported },
                            { key: 'repaired', label: a.funnel.repaired, value: f.repaired },
                            { key: 'scrapped', label: a.funnel.scrapped, value: f.scrapped },
                            { key: 'open', label: a.funnel.stillOpen, value: f.stillOpen },
                        ]}
                    />
                    {/* The identity, spelled out. The three outcomes are defined
                        to sum to `reported`, and a reader who cannot see that
                        will try to reconcile these four numbers against the
                        quality trend above -- which counts EVENTS in the window
                        and does not sum to a cohort. */}
                    <p className="text-[9px] leading-snug text-slate-500">
                        {a.funnel.reported} = {a.funnel.repaired} + {a.funnel.scrapped} +{' '}
                        {a.funnel.stillOpen}
                    </p>
                </div>
            </div>
        </ReportFigure>
    );
};

export const ResolveFigure: React.FC<{ analytics: DashboardAnalytics; t: T; locale: string }> = ({
    analytics,
    t,
    locale,
}) => {
    const a = t.dashboard.analytics;
    const r = analytics.damage.resolution;
    const rows = dwellBands(r.histogram, a.resolve);

    return (
        <ReportFigure
            title={a.resolve.title}
            subtitle={a.resolve.subtitle}
            meta={`${a.resolve.median} ${duration(r.medianHours, locale)}`}
            note={a.dwell.samples(r.samples)}
        >
            <ReportHBars
                rows={rows.map((row) => ({ key: row.key, label: row.label, value: row.count }))}
                rowHeight={17}
                labelWidth={72}
                emptyLabel={a.chart.noDataInRange}
            />
        </ReportFigure>
    );
};

export const OffendersFigure: React.FC<{ analytics: DashboardAnalytics; t: T }> = ({
    analytics,
    t,
}) => {
    const a = t.dashboard.analytics;
    const all = analytics.damage.repeatOffenders;
    const shown = all.slice(0, TABLE_CAP);

    return (
        <ReportFigure
            title={a.offenders.title}
            subtitle={a.offenders.subtitle}
            note={capNote(t, shown.length, all.length)}
        >
            <ReportTable
                emptyLabel={a.chart.noDataInRange}
                columns={[
                    { key: 'id', label: a.offenders.palletId, width: '18%' },
                    { key: 'damage', label: a.offenders.damageCount, numeric: true, width: '18%' },
                    { key: 'repair', label: a.offenders.repairCount, numeric: true, width: '16%' },
                    { key: 'scrapped', label: a.offenders.isScrapped, width: '16%' },
                    { key: 'last', label: a.offenders.lastEvent, numeric: true },
                ]}
                rows={shown.map((row) => ({
                    id: <span className="font-medium text-slate-900">{row.palletId}</span>,
                    damage: row.damageCount,
                    repair: row.repairCount,
                    // A dash, not an empty cell: an empty cell in a printed table
                    // reads as a missing value rather than as "no".
                    scrapped: row.scrapped ? '✓' : '—',
                    // formatDate, never toLocaleDateString('th-TH') -- that
                    // renders 2026 as พ.ศ. 2569.
                    last: row.lastEventISO ? formatDate(row.lastEventISO) : '—',
                }))}
            />
        </ReportFigure>
    );
};

// --- STAFF ------------------------------------------------------------------

export const StaffFigure: React.FC<{ analytics: DashboardAnalytics; t: T }> = ({ analytics, t }) => {
    const a = t.dashboard.analytics;
    const all = analytics.staff;
    const shown = all.slice(0, STAFF_CAP);

    const rows: StackRow[] = shown.map((row) => ({
        key: row.userId,
        label: row.name,
        total: row.total,
        segments: SERIES_ORDER.map((action) => ({
            key: action,
            value: row.byAction[action],
            color: SERIES_COLORS[action],
        })),
    }));

    const legend: LegendItem[] = SERIES_ORDER.map((action) => ({
        key: action,
        label: t.action[action],
        color: SERIES_COLORS[action],
    }));

    const cap = capNote(t, shown.length, all.length);

    return (
        <ReportFigure
            title={a.staff.title}
            subtitle={a.staff.subtitle}
            meta={a.staff.activeStaff(analytics.activeStaffCount, analytics.totalStaffCount)}
            note={
                <div className="flex flex-col gap-1">
                    <ReportLegend items={legend} />
                    {cap && <span>{cap}</span>}
                </div>
            }
        >
            <ReportStackBars
                rows={rows}
                rowHeight={21}
                labelWidth={120}
                emptyLabel={a.chart.noDataInRange}
            />
        </ReportFigure>
    );
};

// --- TIMING -----------------------------------------------------------------

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export const HeatFigure: React.FC<{ analytics: DashboardAnalytics; t: T }> = ({ analytics, t }) => {
    const a = t.dashboard.analytics;
    // 24 columns, always. The screen bins to 4 or 2 hours on narrow viewports
    // because a phone cannot hold 24 cells; a 703px sheet can, so the report
    // never coarsens the data. Nothing here asks how wide anything is.
    const grid: number[][] = DAY_KEYS.map(() => Array(24).fill(0));
    for (const cell of analytics.heat) grid[cell.day][cell.hour] = cell.count;

    return (
        <ReportFigure
            title={a.heat.title}
            subtitle={a.heat.subtitle}
            meta={a.heat.binNote(1)}
            note={
                <span className="flex items-center gap-1.5">
                    <span>{a.heat.legendLow}</span>
                    {HEAT_SCALE.map((step) => (
                        <span
                            key={step}
                            className="h-2 w-4 rounded-[1px]"
                            style={{ backgroundColor: step }}
                            aria-hidden="true"
                        />
                    ))}
                    <span>{a.heat.legendHigh}</span>
                </span>
            }
        >
            <div>
                <div className="flex gap-px pl-[28px] text-[7px] tabular-nums text-slate-500">
                    {Array.from({ length: 24 }, (_, hour) => (
                        <span key={hour} className="min-w-0 flex-1 text-center">
                            {hour % 2 === 0 ? String(hour).padStart(2, '0') : ''}
                        </span>
                    ))}
                </div>
                {DAY_KEYS.map((day, dayIndex) => (
                    <div key={day} className="flex items-center gap-px">
                        <span className="w-[28px] shrink-0 pr-1 text-right text-[8px] text-slate-600">
                            {a.heat[day]}
                        </span>
                        {grid[dayIndex].map((count, hour) => {
                            const fill = heatColor(count, analytics.heatMax);
                            return (
                                <span
                                    key={hour}
                                    className="min-w-0 flex-1 rounded-[1px]"
                                    style={{
                                        height: 13,
                                        // `null` means no activity, and it is
                                        // deliberately NOT the lightest step of
                                        // the ramp: absence is not the lowest of
                                        // five levels, it is a different thing.
                                        backgroundColor: fill ?? '#ffffff',
                                        boxShadow: fill ? undefined : 'inset 0 0 0 1px #f1f5f9',
                                    }}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
        </ReportFigure>
    );
};

export const WeekdayFigure: React.FC<{ analytics: DashboardAnalytics; t: T }> = ({
    analytics,
    t,
}) => {
    const a = t.dashboard.analytics;
    const totals = DAY_KEYS.map((_, day) =>
        analytics.heat.filter((c) => c.day === day).reduce((sum, c) => sum + c.count, 0),
    );

    return (
        <ReportFigure title={a.heat.weekdayTotals} subtitle={a.heat.subtitle}>
            <ReportHBars
                rows={DAY_KEYS.map((day, i) => ({
                    key: day,
                    label: a.heat[day],
                    value: totals[i],
                }))}
                rowHeight={19}
                labelWidth={56}
                emptyLabel={a.chart.noDataInRange}
            />
        </ReportFigure>
    );
};

