import React from 'react';
import { printableAreaMm } from '../../hooks/usePageOrientation';
import type { PageOrientation } from '../../hooks/usePageOrientation';

// ONE SHEET OF A4, AND THE REASON THIS FOLDER EXISTS AT ALL.
//
// =============================================================================
// WHY THE REPORTS ARE NOT THE SCREENS WITH PRINT CSS ON TOP
//
// They were, for three rounds of fixes, and each round moved the defect rather
// than removing it. A screen is built for a viewport -- a column of unlimited
// height, sized by breakpoints that measure the WINDOW. A4 is a fixed box. Two
// things about that mismatch cannot be fixed from a stylesheet:
//
//   1. SIZES THAT MATTER ARE JAVASCRIPT CONSTANTS. On the dashboard,
//      DONUT_PLOT_HEIGHT is 220 and STRIP_HEIGHT is 52 with five of them. On the
//      table screens it is the page size -- 20 rows, chosen for a scrolling
//      list, not for a sheet. CSS cannot reach any of it.
//
//   2. THE ENGINE DECIDES WHERE PAGES BREAK, NOT US. A 475px card meeting 460px
//      of remaining sheet is moved whole by `break-inside: avoid`, and the 460px
//      it left behind is printed blank. There is no CSS that says "these two
//      figures share page 3", or "this table gets 45 rows on page 1 and 50 after
//      that"; a fixed-size box is the only thing that does.
//
// So a report DECLARES its pages. Everything on a sheet is drawn at a size the
// document knows, on a box this file knows the height of, and the page breaks
// are ours. A page that overflows is CLIPPED rather than spilled -- see
// `overflow` in the .report-page rule in index.css -- which turns "the report
// silently grew a blank page" into something visible in the print preview, where
// it can be fixed.
//
// The second consequence is that NOTHING IN A REPORT MEASURES THE DOM. Every
// figure is HTML and CSS, or SVG in a fixed viewBox; every table row is a box of
// a declared height. There is no ResponsiveContainer, no ResizeObserver, and
// therefore no race against `window.print()` -- which is what put the fleet
// donut's total outside its own hole on the previous attempt.
// =============================================================================

/**
 * The page box for an orientation, in millimetres.
 *
 * EVERY REPORT IS PORTRAIT -- see REPORT_ORIENTATION in useReportPrint.ts for
 * why the choice the two table reports briefly offered was withdrawn. The
 * parameter stays because `@page` for a bare Ctrl+P is still landscape and this
 * has to keep telling the truth about both, and because a function that took no
 * argument would be stating the orientation in a second place, free to disagree
 * with the one that decides it.
 *
 * COMPUTED from PAGE_MARGIN_MM rather than written as `186 x 273`, because the
 * margin and the page box are two halves of one measurement: a box sized for a
 * 12mm margin printed against a 15mm one either loses its right-hand column or
 * spills a blank sheet after every real one, and neither shows up anywhere
 * except on paper. hooks/usePageOrientation.ts owns the margin; this reads it.
 *
 * Millimetres and not pixels, all the way to the DOM. 273mm is 1032px at the CSS
 * reference resolution, and 1032px converts back to 273.05mm -- five hundredths
 * of a millimetre of overflow, once per page, is a blank sheet after every one of
 * them. Handing the browser mm lets it do the conversion once, at print time,
 * against the sheet it is actually using.
 *
 * The height is one millimetre under the printable area, as rounding slack.
 */
export const pageBoxMm = (orientation: PageOrientation): { widthMm: number; heightMm: number } => {
    const area = printableAreaMm(orientation);
    return { widthMm: area.widthMm, heightMm: area.heightMm - 1 };
};

/** A4 portrait, the size every sheet in every report is fixed at. 186 x 272mm. */
export const PAGE_WIDTH_MM = pageBoxMm('portrait').widthMm;
export const PAGE_HEIGHT_MM = pageBoxMm('portrait').heightMm;

// --- The chrome, as numbers a document can do arithmetic with -----------------
//
// A report that paginates ITSELF -- the table reports decide how many rows fit
// on a sheet before anything renders -- has to know how much of the sheet the
// running head and the foot have already spent. These three are that answer, and
// they are the reason the head and foot below are laid out from fixed type sizes
// rather than from whatever a heading happens to be.
//
// They are the TRUE rendered heights, not round numbers -- 4.8mm is 18.1px,
// which is what a 9px line plus `pb-1` plus a 1px rule actually occupies, and
// 6.9mm is the 26px the foot occupied before it was given a declared height. A
// tidier 5 and 7 would have quietly taken 3px per page away from the dashboard
// report, whose pages are already full and whose overflow is clipped.
//
// Callers that paginate against these subtract their own safety margin on top --
// see SAFETY_MM in ReportTableDocument.tsx.

/** ReportPage's own running head: a 9px line, its `pb-1` and its rule. */
export const RUNNING_HEAD_MM = 4.8;
/** The gap the body carries above itself. */
export const HEAD_GAP_MM = 3.2;
/** The foot: its rule and a centred 9px line. */
export const FOOT_MM = 6.9;

/**
 * How much height `children` actually gets, once the head and the foot are paid
 * for.
 *
 * `headMm` is RUNNING_HEAD_MM for a page using the default running head, or the
 * declared height of a custom masthead for page 1. Custom mastheads must declare
 * a height for exactly this reason -- a content-sized masthead makes this
 * function a guess, and a guess here is a clipped row.
 */
export const bodyHeightMm = (headMm: number = RUNNING_HEAD_MM): number =>
    PAGE_HEIGHT_MM - headMm - HEAD_GAP_MM - FOOT_MM;

export interface ReportPageProps {
    /** 1-based. Printed in the foot as "3 / 8". */
    page: number;
    total: number;
    /** The running head's right side: which part of the report this sheet is. */
    section: string;
    /** The running head's left side. The report's own name, on every sheet. */
    documentTitle: string;
    /**
     * Replaces the running head, normally on page 1 only.
     *
     * Anything passed here MUST declare its own height in mm if the document
     * paginates itself -- see `bodyHeightMm` above.
     */
    masthead?: React.ReactNode;
    /** Already-formatted "Page N of M". Passed in so the wording stays in the
     *  dictionary and this file stays free of it. */
    pageLabel: string;
    children: React.ReactNode;
}

/**
 * One printed sheet: a running head, the body, and a foot carrying the page
 * number.
 *
 * The body is `flex-1 min-h-0 overflow-hidden`. `min-h-0` is load-bearing rather
 * than tidying: a flex child defaults to `min-height: auto`, which means it
 * refuses to shrink below its content -- so a body one figure too tall would
 * push the foot off the sheet instead of being clipped, and the page number
 * would silently disappear from that page only.
 */
export const ReportPage: React.FC<ReportPageProps> = ({
    page,
    total,
    section,
    documentTitle,
    masthead,
    pageLabel,
    children,
}) => {
    return (
        <article
            className="report-page"
            // Inline rather than in the stylesheet, so the one place the page size
            // is decided is the one place the margin is read from. A
            // `width: 186mm` in index.css would be a second copy of an arithmetic
            // result, free to disagree with PAGE_MARGIN_MM the day somebody
            // changes it.
            style={{ width: `${PAGE_WIDTH_MM}mm`, height: `${PAGE_HEIGHT_MM}mm` }}
            aria-label={pageLabel}
        >
            {masthead ?? (
                // The running head. Deliberately quiet -- 5mm of ink whose only
                // job is to tell a reader holding page 5 what they are holding.
                // Ruled underneath rather than boxed: a box would read as content.
                //
                // The height is declared, not left to the type, because
                // RUNNING_HEAD_MM above is arithmetic other files depend on.
                <header
                    className="flex shrink-0 items-end justify-between gap-4 border-b border-slate-200 pb-1 text-[9px] tracking-wide text-slate-500"
                    style={{ height: `${RUNNING_HEAD_MM}mm` }}
                >
                    <span className="truncate">{documentTitle}</span>
                    <span className="shrink-0 font-medium text-slate-600">{section}</span>
                </header>
            )}

            <div
                className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden"
                style={{ marginTop: `${HEAD_GAP_MM}mm` }}
            >
                {children}
            </div>

            <footer
                className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-200 text-[9px] text-slate-500"
                style={{ height: `${FOOT_MM}mm` }}
            >
                {/* Left is empty on purpose. A page number belongs on the outer
                    edge of a spread, and a single-sided report has only a right
                    edge -- putting anything on the left would make the reader
                    check whether the two lines are related. */}
                <span />
                <span className="shrink-0 tabular-nums">
                    {page} / {total}
                </span>
            </footer>
        </article>
    );
};
