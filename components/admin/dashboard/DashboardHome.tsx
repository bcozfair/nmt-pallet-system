import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, CircleAlert, RefreshCw } from 'lucide-react';

import { Pallet } from '../../../types';
import { useT } from '../../../hooks/useT';
import { useOverdueThreshold } from '../../../hooks/useOverdueThreshold';
import { useDashboardData } from '../../../hooks/dashboard/useDashboardData';
import { SkeletonCard } from '../../ui';
import { ReportPrintHost } from './report/ReportPrintHost';
import { useReportPrint } from './report/useReportPrint';
import {
    exportDashboardSummaryCSV,
    exportHistoryCSV,
    exportInventoryCSV,
} from '../../../utils/exportHelpers';

import { KpiRow } from './sections/KpiRow';
import { PageHeader } from './sections/PageHeader';

/**
 * The analytics dashboard: a page header, a KPI row and five chart sections.
 *
 * The range selector is deliberately NOT here. It sits in the header of each
 * card it scopes, and its static counterpart on each card it does not -- see
 * the note at the top of RangeMenu.tsx for the measurements behind that.
 *
 * Three things about this file are load-bearing and easy to undo by accident.
 *
 * 1. THE ROOT CARRIES NO HEIGHT AND NO OVERFLOW. It used to be
 *    `h-[calc(100vh-70px)] ... overflow-hidden` wrapping a second
 *    `overflow-y-auto` scroller, inside a shell that was itself `h-screen
 *    overflow-auto` -- three nested scroll containers, which is why the
 *    scrollbar never matched the page and why the wheel stopped dead at a
 *    boundary. The shell has since dropped its own, so the document is now the
 *    only scroll container in the app.
 *
 * 2. NO SERVICE CALL LIVES HERE. The previous version ran
 *    `fetchPalletHistory('')` in an effect -- an unbounded query that PostgREST
 *    silently truncates at 1000 rows, which is exactly why the old trend chart
 *    was wrong: it looked like a complete history and was not. All fetching now
 *    goes through useDashboardData, which asks for a bounded, paged,
 *    date-windowed slice.
 *
 * 3. DEFERRED SECTIONS MUST GENUINELY MOUNT, never be hidden. See
 *    DeferredSection below.
 */

/**
 * Lazy for CHUNKING, not for laziness: vite.config.ts splits `recharts` into a
 * chunk of its own, and that chunk is only referenced from these five modules. A
 * static import here would pull all of Recharts into the entry bundle, so every
 * admin who opens Inventory would pay for charts they never see.
 *
 * They were named functions so the print handler could call each one a second
 * time and force its chunk down before the dialog opened. `preloadAllSections`
 * went with that handler: the A4 report reads the analytics object and draws its
 * own figures in plain HTML, so it needs none of these modules loaded. The names
 * stay because React.lazy reads better with them than with five inline arrows.
 */
const importFleetSection = () =>
    import('./sections/FleetSection').then((m) => ({ default: m.FleetSection }));
const importLifecycleSection = () =>
    import('./sections/LifecycleSection').then((m) => ({ default: m.LifecycleSection }));
const importQualitySection = () =>
    import('./sections/QualitySection').then((m) => ({ default: m.QualitySection }));
const importStaffSection = () =>
    import('./sections/StaffSection').then((m) => ({ default: m.StaffSection }));
const importTimeSection = () =>
    import('./sections/TimeSection').then((m) => ({ default: m.TimeSection }));

const FleetSection = React.lazy(importFleetSection);
const LifecycleSection = React.lazy(importLifecycleSection);
const QualitySection = React.lazy(importQualitySection);
const StaffSection = React.lazy(importStaffSection);
const TimeSection = React.lazy(importTimeSection);

/**
 * Section ids, in document order. The rail spies on these and the anchor buttons
 * scroll to them, so this array is the single source for both -- a section added
 * to one and not the other is the kind of drift that leaves a dead chip.
 *
 * `dashboard-` prefixed because these ids share a document with every modal the
 * shell can open, and while a report is printing, with its sheets too.
 */
const SECTION_IDS = [
    'dashboard-fleet',
    'dashboard-lifecycle',
    'dashboard-quality',
    'dashboard-staff',
    'dashboard-time',
] as const;

type SectionId = (typeof SECTION_IDS)[number];

/** The panel the disclosure button owns, for aria-controls. */
const DEEP_PANEL_ID = 'dashboard-deep-dive';

/**
 * How far ahead of the viewport a section starts mounting.
 *
 * 400px is roughly a slow flick of the thumb: far enough that the chunk has
 * landed and the charts have measured before the reader arrives, close enough
 * that opening the page does not fetch every section anyway.
 */
const DEFER_ROOT_MARGIN = '400px';

/**
 * What stands in for a section until it mounts.
 *
 * It has to be a real element with a real box, not `null`: the observer needs
 * something to watch, and a zero-height placeholder would put the whole page's
 * worth of sections inside the root margin at once, which defeats the deferral.
 * The card count per section keeps the scrollbar roughly honest.
 */
const SectionPlaceholder: React.FC<{ cards?: number }> = ({ cards = 2 }) => (
    <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-2" aria-hidden="true">
        {Array.from({ length: cards }, (_, i) => (
            <SkeletonCard key={i} />
        ))}
    </div>
);

interface DeferredSectionProps {
    id: SectionId;
    /** Above the fold: skip the observer and mount on the first commit. */
    eager?: boolean;
    placeholder: React.ReactNode;
    children: React.ReactNode;
}

// `forceMount` is gone. It existed for one caller -- the print handler, which
// had to mount every section before `window.print()` so the report would not
// stop at whatever the reader had scrolled to. The report is a separate document
// now and reads the analytics object directly, so nothing on this screen needs
// mounting to produce it. A prop whose only argument was `false` is a lever with
// nothing on the other end.
const DeferredSection: React.FC<DeferredSectionProps> = ({
    id,
    eager = false,
    placeholder,
    children,
}) => {
    const ref = useRef<HTMLElement | null>(null);

    // The `typeof` guard is the difference between a progressive enhancement and
    // a blank page: without it, a browser with no IntersectionObserver would
    // never fire the callback, so the four deferred sections would show
    // skeletons forever with no way to recover. Missing API -> mount everything.
    const [inView, setInView] = useState(
        () => eager || typeof IntersectionObserver === 'undefined',
    );

    const isMounted = inView;

    useEffect(() => {
        if (isMounted) return;
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    // One-way latch. Unmounting a section that scrolled away
                    // would throw away the chunk-load and every measurement in
                    // it, and re-mounting on the way back up would replay the
                    // whole animation -- a scroll up the page would look like a
                    // page reload.
                    setInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin: DEFER_ROOT_MARGIN },
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [isMounted]);

    return (
        <section
            id={id}
            ref={ref}
            // scroll-mt-20 pays for the sticky mobile top bar in
            // AdminDashboard: without it, an in-page jump below `lg` parks the
            // section heading underneath it and the reader lands on a chart
            // with no title.
            //
            // `print-avoid-break` used to be here too and is gone. It never did
            // anything: a section is several A4 pages tall and the engine drops
            // the rule for any box taller than one page. Leaving a rule in place
            // that reads as working is worse than not having it -- the guard is
            // on components/ui/Card.tsx now, at a size that fits on a sheet.
            className="scroll-mt-20"
        >
            {isMounted ? <Suspense fallback={placeholder}>{children}</Suspense> : placeholder}
        </section>
    );
};

export interface DashboardHomeProps {
    pallets: Pallet[];
    palletsLoading: boolean;
    palletsError: string | null;
    onNavigateToInventory: (filter: string, location?: string) => void;
    onSelectPallet?: (palletId: string) => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
    pallets,
    palletsLoading,
    // Accepted and deliberately not rendered. AdminDashboard already shows this
    // banner above the tab content, because a failed pallet fetch empties every
    // tab and not just this one -- a second copy here would be the same sentence
    // twice on the same screen.
    palletsError: _palletsError,
    onNavigateToInventory,
    onSelectPallet,
}) => {
    const t = useT();
    const deepDive = t.dashboard.analytics.deepDive;

    const { analytics, isLoading, isRefreshing, error, range, setRange, reload } =
        useDashboardData(pallets, palletsLoading);

    // The same source the inventory filter, the location table and the LINE
    // report read. It used to come from a localStorage key the settings screen
    // never wrote, so this page was pinned to 7 days while the report used
    // whatever system_settings said, and the two could disagree about which
    // pallets were late.
    const { days: overdueDays } = useOverdueThreshold();

    // Collapsed by default. Not persisted: the point of the default is that
    // the page opens on what needs acting on today, and a preference that
    // survived a session would quietly undo that for whoever set it once.
    const [showDeep, setShowDeep] = useState(false);

    // THE A4 REPORT.
    //
    // `window.print()` on THIS page produced a document nobody wanted: cards
    // sized for a scrolling viewport, cut into sheets by an engine that left a
    // third of every page blank, and charts laid out at whatever width the
    // reader's browser window happened to be. Three rounds of print CSS moved
    // that defect around without removing it -- report/ReportPage.tsx carries
    // the two reasons it cannot be removed from a stylesheet at all.
    //
    // So the report is a separate A4 document built from the same
    // `DashboardAnalytics` object. The button mounts it and prints it; the
    // browser's own print dialog is where the reader checks it.
    //
    // `mountAllSections` and `preloadAllSections` went with the old handler.
    // They existed so a print would not stop at whatever the reader had
    // scrolled to; the report reads the analytics object directly and does not
    // care which sections happen to be on screen.
    //
    // `printingAt` is both the render flag and the instant the sheet claims to
    // describe -- see the hook for why those are one value.
    const { printingAt, print: printReport } = useReportPrint();

    // `error` from the hook is a raw Error.message -- a Supabase string, in
    // English, with a status code in it. It is useful to whoever is debugging
    // and meaningless to an admin, so it goes to the console and the banner
    // below shows the dictionary's sentence instead.
    useEffect(() => {
        if (error) console.error('[DashboardHome] Failed to load dashboard analytics:', error);
    }, [error]);

    const handleExportSummary = useCallback(() => {
        // Nothing to summarise before the first computation lands. The button is
        // already disabled through `isBusy` at that point; this is the guard for
        // the case where the fetch failed and `analytics` never arrived.
        if (!analytics) return;
        exportDashboardSummaryCSV(analytics, range);
    }, [analytics, range]);

    const handleExportInventory = useCallback(() => {
        // Both of these fetch their own data and report through toasts, so there
        // is nothing to await and nothing to show here.
        void exportInventoryCSV();
    }, []);

    const handleExportHistory = useCallback(() => {
        void exportHistoryCSV();
    }, []);

    return (
        // No height, no overflow. See the note at the top of the file.
        // No entrance animation on the root either: every Card inside already
        // carries `animate-surface-in`, and the `animate-in fade-in duration-500`
        // that used to be here is one of the 30 dead tailwindcss-animate classes
        // index.css:317 documents -- it never rendered a frame.
        <div className="flex flex-col gap-6">
            {/* No PrintReportHeader here any more, and no `print:` anything: this
                screen is not what gets printed. The report is its own document
                (report/DashboardReport.tsx) with its own masthead, and leaving a
                second, hidden one on the dashboard would be a header nobody can
                see, on a page nobody prints, that still has to be kept in step
                with the one that is real. The primitive stays exported -- the
                inventory and transaction screens do still print in place. */}
            {/* No range control here any more -- it lives on each card the
                range actually scopes, and its static twin (AsOfNowChip) on each
                card it does not. See the note at the top of RangeMenu.tsx: a
                page-level picker governed one of the five blocks on screen and
                needed a printed disclaimer to admit it. */}
            <PageHeader
                onOpenReport={printReport}
                onExportSummary={handleExportSummary}
                onExportInventory={handleExportInventory}
                onExportHistory={handleExportHistory}
                isBusy={isLoading}
                canOpenReport={!!analytics}
            />

            {error && (
                <div
                    role="alert"
                    className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700 animate-auth-banner-in"
                >
                    <CircleAlert size={16} className="mt-0.5 shrink-0 text-red-500" />
                    <span className="flex-1">{t.dashboard.analytics.state.loadFailed}</span>
                    {/* The previous snapshot is deliberately left on screen
                        behind this banner, so a transient blip shows stale
                        numbers with a warning rather than an empty page. */}
                    <button
                        type="button"
                        onClick={reload}
                        disabled={isRefreshing}
                        className="flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1 font-semibold text-red-700 transition hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                        {t.dashboard.analytics.state.retry}
                    </button>
                </div>
            )}

            {/* Outside the rail's row: the KPI figures are as of now and are not
                scoped by the range selector, so they are not one of the five
                sections the rail navigates.

                No `print-avoid-break` on this wrapper any more. Each tile now
                carries the guard itself (components/ui/StatTile.tsx), which is
                both smaller than a page and the unit a reader would object to
                seeing cut. Keeping it on the row as well would only ask the
                engine to keep four tiles together, and in portrait -- where they
                stack -- that is a box it would silently ignore. */}
            <div>
                <KpiRow
                    fleet={analytics?.fleet ?? null}
                    overdueDays={overdueDays}
                    isLoading={isLoading}
                    isRefreshing={isRefreshing}
                    onNavigate={onNavigateToInventory}
                />
            </div>

            {/* No rail and no right-hand gutter any more: with four cards
                above the fold and the rest behind the disclosure below, the page
                is short enough to scroll. The rail also cost 176px of content
                width, which is why the KPI row used to span wider than the cards
                under it -- the mismatch a reader sees as "not quite square". */}
            <DeferredSection
                id="dashboard-fleet"
                // Above the fold on every viewport, so it skips the observer
                // entirely -- waiting a frame for the first callback would flash
                // a skeleton at the top of the page on every load.
                eager
                placeholder={<SectionPlaceholder />}
            >
                <FleetSection
                    analytics={analytics}
                    isLoading={isLoading}
                    isRefreshing={isRefreshing}
                    overdueDays={overdueDays}
                    range={range}
                    onRangeChange={setRange}
                    onNavigate={onNavigateToInventory}
                />
            </DeferredSection>

            {/* The disclosure.
                Everything below answers a question an admin asks occasionally --
                how long trips take, which pallets keep breaking, who recorded
                what, which hours are busy -- rather than one they opened the page
                for. Collapsed, the dashboard is four cards and four figures; open,
                it is the full analysis. The old page showed all sixteen at once,
                which is what made the handful that matter hard to find.

                Rendered conditionally, NOT hidden with `display:none`: a Recharts
                ResponsiveContainer inside a display:none box measures 0 and stays
                0 even after it is revealed. It also means printing matches what is
                on screen -- expand first if the report should include it. */}
            <div className="print:hidden">
                <button
                    type="button"
                    onClick={() => setShowDeep((v) => !v)}
                    aria-expanded={showDeep}
                    aria-controls={DEEP_PANEL_ID}
                    className="flex w-full min-h-12 items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-3 text-sm font-semibold text-slate-600 transition duration-200 hover:border-brand-300 hover:bg-white hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                >
                    <ChevronDown
                        size={16}
                        className={`shrink-0 transition-transform duration-200 ${showDeep ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                    />
                    <span className="whitespace-nowrap">
                        {showDeep ? deepDive.hide : deepDive.show}
                    </span>
                    {/* The subtitle is what stops this reading as a mystery
                        button. Hidden on the narrowest column, where the label
                        alone already fills the row. */}
                    {!showDeep && (
                        <span className="hidden text-xs font-normal text-slate-400 sm:inline">
                            — {deepDive.note}
                        </span>
                    )}
                </button>
            </div>

            {showDeep && (
                <div id={DEEP_PANEL_ID} className="flex flex-col gap-6 animate-surface-in">
                    <DeferredSection
                        id="dashboard-lifecycle"
                        placeholder={<SectionPlaceholder cards={2} />}
                    >
                        <LifecycleSection
                            analytics={analytics}
                            isLoading={isLoading}
                            isRefreshing={isRefreshing}
                            overdueDays={overdueDays}
                            range={range}
                            onRangeChange={setRange}
                        />
                    </DeferredSection>

                    {/* Five cards, not four: the dormant-pallet table moved
                        here from the lifecycle section so it could share a row
                        with the quality trend. See DormantPalletsCard.tsx --
                        the section boundary between the two is invisible on
                        screen, so what the reader saw was two full-width blocks
                        stacked. */}
                    <DeferredSection
                        id="dashboard-quality"
                        placeholder={<SectionPlaceholder cards={5} />}
                    >
                        <QualitySection
                            analytics={analytics}
                            isLoading={isLoading}
                            isRefreshing={isRefreshing}
                            range={range}
                            onRangeChange={setRange}
                            onSelectPallet={onSelectPallet}
                        />
                    </DeferredSection>

                    <DeferredSection
                        id="dashboard-staff"
                        placeholder={<SectionPlaceholder cards={1} />}
                    >
                        <StaffSection
                            analytics={analytics}
                            isLoading={isLoading}
                            isRefreshing={isRefreshing}
                            range={range}
                            onRangeChange={setRange}
                        />
                    </DeferredSection>

                    <DeferredSection
                        id="dashboard-time"
                        placeholder={<SectionPlaceholder cards={1} />}
                    >
                        <TimeSection
                            analytics={analytics}
                            isLoading={isLoading}
                            isRefreshing={isRefreshing}
                            range={range}
                            onRangeChange={setRange}
                        />
                    </DeferredSection>
                </div>
            )}

            {/* Mounted only while a print is in flight, and only once
                `analytics` exists. It portals four sheets of figures into
                <body>; building that on every dashboard load, for a reader who
                never presses the button, would be pure cost. */}
            {printingAt && analytics && (
                <ReportPrintHost
                    analytics={analytics}
                    range={range}
                    overdueDays={overdueDays}
                    generatedAt={printingAt}
                />
            )}
        </div>
    );
};
