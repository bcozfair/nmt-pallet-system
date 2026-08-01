import React from 'react';

import { ReportPage } from '../../../report';
import {
    DormantFigure,
    DwellFigure,
    FleetHealthFigure,
    FunnelFigure,
    HeatFigure,
    KpiStrip,
    LocationFigure,
    MovementFigure,
    OffendersFigure,
    OverdueAgeFigure,
    QualityTrendFigure,
    ResolveFigure,
    RiskFigure,
    StaffFigure,
    WeekdayFigure,
} from './ReportFigures';
import { formatDateTime } from '../../common/AdminHelpers';
import { useLang, useT } from '../../../../hooks/useT';
import type { DashboardAnalytics } from '../../../../services/analytics/dashboardAnalytics';
import type { DashboardRange } from '../../../../hooks/dashboard/useDashboardData';

// THE DOCUMENT: which figure goes on which sheet.
//
// This file is the thing print CSS could never be. `break-inside: avoid` can ask
// an engine not to split a box; it cannot say "the fleet donut and the location
// bars share page 1". Here that is just an array, and the page count is known
// before anything renders -- which is also the only reason the foot of each
// sheet can honestly say "3 / 4".
//
// The order is a reading order, not the screen's. On screen the deep-dive
// sections are collapsed behind a disclosure because an admin opens the
// dashboard for today's four numbers; a report is read start to finish, so it
// runs summary -> movement -> quality -> workload, each page answering one
// question.
//
// EVERY RANGE-SCOPED FIGURE IS COVERED BY THE ONE LINE IN THE MASTHEAD. The
// screen carries a range chip on each card that needs one, because the range is
// changeable there and the cards it does not scope have to say so. Paper is a
// snapshot: the range cannot change while it is being read, so it is stated once
// at the top, and the figures that are NOT range-scoped carry `asOfNow` in their
// own meta slot instead.

/** The dictionary key for each range, so the masthead can name the window. */
const RANGE_LABEL_KEY: Record<DashboardRange, 'd7' | 'd30' | 'd90' | 'm12'> = {
    '7d': 'd7',
    '30d': 'd30',
    '90d': 'd90',
    '12m': 'm12',
};

export interface DashboardReportProps {
    analytics: DashboardAnalytics;
    range: DashboardRange;
    overdueDays: number;
    /** Passed in rather than read from the clock here, so every sheet of one
     *  print carries the same timestamp -- this screen re-renders on every
     *  realtime pallet change, and a live `new Date()` would drift between the
     *  moment the reader pressed the button and the moment the dialog opened. */
    generatedAt: Date;
}

export const DashboardReport: React.FC<DashboardReportProps> = ({
    analytics,
    range,
    overdueDays,
    generatedAt,
}) => {
    const t = useT();
    const lang = useLang();
    // Durations follow the app's date policy in spirit: one presentation in both
    // languages where the value is a date, but a unit is a unit, so this one does
    // follow the active language.
    const locale = lang === 'th' ? 'th' : 'en-GB';

    const r = t.dashboard.report;
    const when = formatDateTime(generatedAt);
    const rangeLabel = t.dashboard.analytics.range[RANGE_LABEL_KEY[range]];

    const masthead = (
        <header className="shrink-0 border-b-2 border-slate-800 pb-2.5">
            <div className="flex items-baseline justify-between gap-6">
                <h1 className="text-[19px] font-semibold tracking-tight text-slate-900">
                    {t.dashboard.reportTitle}
                </h1>
                <p className="shrink-0 text-[9px] text-slate-600">
                    {t.common.generatedOn(when)}
                </p>
            </div>
            <p className="mt-1 text-[10px] text-slate-600">{r.subtitle}</p>
            {/* The scope of the whole document, in one line. Separated with a
                middot rather than a comma: both halves contain their own commas
                in one language or the other. */}
            <p className="mt-1.5 text-[9px] text-slate-500">
                {r.rangeLine(rangeLabel)} · {r.asOfLine(when)}
            </p>
        </header>
    );

    // Four sheets, and the split is by how much each figure actually occupies
    // rather than by which dashboard section it came from. An A4 page holds
    // about 950 points of content once the running head and the foot are paid
    // for; every page below carries 700-800 of that.
    //
    // The earlier split followed the screen's five sections and produced a page
    // 2 that was one third full -- which is the same complaint that started this
    // rewrite, reproduced in a layout that could actually have avoided it.
    const pages: { section: string; body: React.ReactNode }[] = [
        {
            section: r.pages.summary,
            body: (
                <>
                    <KpiStrip analytics={analytics} t={t} overdueDays={overdueDays} />
                    <FleetHealthFigure analytics={analytics} t={t} />
                    <LocationFigure analytics={analytics} t={t} />
                    <RiskFigure analytics={analytics} t={t} overdueDays={overdueDays} />
                </>
            ),
        },
        {
            // Dwell time joins the movement page rather than opening a lifecycle
            // page of its own: both answer "how much is moving, and for how
            // long", and read together they are one argument.
            section: r.pages.movement,
            body: (
                <>
                    <MovementFigure analytics={analytics} t={t} />
                    <QualityTrendFigure analytics={analytics} t={t} />
                    <DwellFigure analytics={analytics} t={t} locale={locale} />
                </>
            ),
        },
        {
            section: r.pages.quality,
            body: (
                <>
                    <OverdueAgeFigure analytics={analytics} t={t} overdueDays={overdueDays} />
                    <FunnelFigure analytics={analytics} t={t} />
                    <ResolveFigure analytics={analytics} t={t} locale={locale} />
                    <OffendersFigure analytics={analytics} t={t} />
                </>
            ),
        },
        {
            section: r.pages.workload,
            body: (
                <>
                    <DormantFigure analytics={analytics} t={t} />
                    <StaffFigure analytics={analytics} t={t} />
                    <HeatFigure analytics={analytics} t={t} />
                    <WeekdayFigure analytics={analytics} t={t} />
                </>
            ),
        },
    ];

    return (
        <div className="report-sheet-stack">
            {pages.map((page, index) => (
                <ReportPage
                    key={page.section}
                    page={index + 1}
                    total={pages.length}
                    section={page.section}
                    documentTitle={t.dashboard.reportTitle}
                    pageLabel={t.common.pageOf(index + 1, pages.length)}
                    masthead={index === 0 ? masthead : undefined}
                >
                    {page.body}
                </ReportPage>
            ))}
        </div>
    );
};
