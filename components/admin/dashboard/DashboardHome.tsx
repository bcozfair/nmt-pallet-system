import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, CircleAlert, RefreshCw } from 'lucide-react';

import { Pallet } from '../../../types';
import { formatDateTime } from '../common/AdminHelpers';
import { useT } from '../../../hooks/useT';
import { useOverdueThreshold } from '../../../hooks/useOverdueThreshold';
import { useDashboardData } from '../../../hooks/dashboard/useDashboardData';
import { usePrintLayout } from '../../../hooks/dashboard/usePrintLayout';
import { SkeletonCard } from '../../ui';
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
 *    only scroll container in the app. It is also the precondition for
 *    printing: a box clamped to 100vh has nothing below the fold to send to
 *    the printer, so the report came out one screen long.
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
 * `import()` kept as a named function per section so it can be called twice: once
 * by React.lazy when the section is rendered, and once by the print handler to
 * force the chunk down before the dialog opens. The module registry dedupes, so
 * the second call is free.
 *
 * These are lazy for chunking, not for laziness: vite.config.ts splits `recharts`
 * into its own chunk, and that chunk is only referenced from these five modules.
 * A static import here would pull all of Recharts into the entry bundle, so
 * every admin who opens Inventory pays for charts they never see.
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

const preloadAllSections = () =>
    Promise.all([
        importFleetSection(),
        importLifecycleSection(),
        importQualitySection(),
        importStaffSection(),
        importTimeSection(),
    ]);

/**
 * Section ids, in document order. The rail spies on these and the anchor buttons
 * scroll to them, so this array is the single source for both -- a section added
 * to one and not the other is the kind of drift that leaves a dead chip.
 *
 * `dashboard-` prefixed because these ids live in the same document as
 * `dashboard-printable-area` and every modal the shell can open.
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
    /** Set while preparing a print, so nothing is missing from the report. */
    forceMount: boolean;
    placeholder: React.ReactNode;
    children: React.ReactNode;
}

const DeferredSection: React.FC<DeferredSectionProps> = ({
    id,
    eager = false,
    forceMount,
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

    const isMounted = inView || forceMount;

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
            className="scroll-mt-20 print-avoid-break"
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

    const printRef = usePrintLayout<HTMLDivElement>();

    const [mountAllSections, setMountAllSections] = useState(false);
    // Collapsed by default. Not persisted: the point of the default is that
    // the page opens on what needs acting on today, and a preference that
    // survived a session would quietly undo that for whoever set it once.
    const [showDeep, setShowDeep] = useState(false);
    const [isPreparingPrint, setIsPreparingPrint] = useState(false);

    // `error` from the hook is a raw Error.message -- a Supabase string, in
    // English, with a status code in it. It is useful to whoever is debugging
    // and meaningless to an admin, so it goes to the console and the banner
    // below shows the dictionary's sentence instead.
    useEffect(() => {
        if (error) console.error('[DashboardHome] Failed to load dashboard analytics:', error);
    }, [error]);

    /**
     * Print.
     *
     * `window.print()` on the page itself, which is the entire point of the
     * layout note at the top of this file. The version this replaces opened a
     * blank window, injected `innerHTML` into it and loaded Tailwind v3 from a
     * CDN -- a build that resolves none of this app's `brand-*` utilities, needs
     * the network to print at all, and copied each chart's on-screen pixel width
     * onto an A4 page.
     *
     * The two awaits are what a deferred-mount page owes the printer: sections
     * the reader never scrolled to have neither their chunk nor their DOM, and
     * `window.print()` is synchronous, so without them the report would stop at
     * whatever the reader happened to have looked at. usePrintLayout pins the
     * paper width on `beforeprint` from there.
     */
    const handlePrint = useCallback(async () => {
        setMountAllSections(true);
        setIsPreparingPrint(true);
        try {
            await preloadAllSections();
            // Two frames, not one: the first lets React commit the newly mounted
            // sections, the second lets each ResponsiveContainer measure the box
            // that commit created.
            await new Promise<void>((resolve) => {
                requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
            });
            window.print();
        } finally {
            setIsPreparingPrint(false);
        }
    }, []);

    // Best effort for Ctrl+P, which cannot be intercepted usefully: the chunks
    // are async, so this cannot complete in time for the print job that fired
    // it. It does mean everything is mounted for the second attempt, and for
    // every print after that.
    useEffect(() => {
        const onBeforePrint = () => setMountAllSections(true);
        window.addEventListener('beforeprint', onBeforePrint);
        return () => window.removeEventListener('beforeprint', onBeforePrint);
    }, []);

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
        <div id="dashboard-printable-area" ref={printRef} className="flex flex-col gap-6">
            {/* On paper only. The screen already has the sidebar, the tab and
                the page header to say what this is; the printed sheet has none
                of them and would otherwise start with an unlabelled KPI row.
                Each chart still carries its own range chip onto the page, so a
                printed report says which window every figure covers. */}
            <div className="hidden print:block border-b border-slate-200 pb-4">
                <h1 className="text-2xl font-semibold text-slate-900">{t.dashboard.reportTitle}</h1>
                <p className="mt-1 text-sm text-slate-500">
                    {t.dashboard.reportGeneratedOn(formatDateTime(new Date()))}
                </p>
            </div>

            {/* No range control here any more -- it lives on each card the
                range actually scopes, and its static twin (AsOfNowChip) on each
                card it does not. See the note at the top of RangeMenu.tsx: a
                page-level picker governed one of the five blocks on screen and
                needed a printed disclaimer to admit it. */}
            <PageHeader
                onPrint={handlePrint}
                onExportSummary={handleExportSummary}
                onExportInventory={handleExportInventory}
                onExportHistory={handleExportHistory}
                isBusy={isLoading || isPreparingPrint}
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
                sections the rail navigates. */}
            <div className="print-avoid-break">
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
                forceMount={mountAllSections}
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
                        forceMount={mountAllSections}
                        placeholder={<SectionPlaceholder cards={3} />}
                    >
                        <LifecycleSection
                            analytics={analytics}
                            isLoading={isLoading}
                            isRefreshing={isRefreshing}
                            overdueDays={overdueDays}
                            range={range}
                            onRangeChange={setRange}
                            onSelectPallet={onSelectPallet}
                        />
                    </DeferredSection>

                    <DeferredSection
                        id="dashboard-quality"
                        forceMount={mountAllSections}
                        placeholder={<SectionPlaceholder cards={4} />}
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
                        forceMount={mountAllSections}
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
                        forceMount={mountAllSections}
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

            <div className="hidden print:block text-center text-xs text-slate-400">
                {t.dashboard.printedFooter(formatDateTime(new Date()))}
            </div>
        </div>
    );
};
