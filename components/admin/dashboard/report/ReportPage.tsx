import React from 'react';
import { printableAreaMm } from '../../../../hooks/usePageOrientation';

// ONE SHEET OF A4, AND THE REASON THIS FILE EXISTS AT ALL.
//
// =============================================================================
// WHY THE REPORT IS NOT THE DASHBOARD WITH PRINT CSS ON TOP
//
// It was, for three rounds of fixes, and each round moved the defect rather
// than removing it. The dashboard is built for a viewport -- a column of
// unlimited height, sized by breakpoints that measure the WINDOW, with plot
// heights chosen in JavaScript for a screen. A4 is a fixed box. Two things about
// that mismatch cannot be fixed from a stylesheet:
//
//   1. CARD HEIGHT IS A JAVASCRIPT CONSTANT. DONUT_PLOT_HEIGHT is 220,
//      STRIP_HEIGHT is 52 and there are five of them. CSS cannot reach any of
//      it, so the tallest lever print CSS has is padding -- about 20px, against
//      rows that overshoot a landscape sheet by more than that.
//
//   2. THE ENGINE DECIDES WHERE PAGES BREAK, NOT US. A 475px card meeting 460px
//      of remaining sheet is moved whole by `break-inside: avoid`, and the 460px
//      it left behind is printed blank. There is no CSS that says "these two
//      figures share page 3"; a fixed-size box is the only thing that does.
//
// So the report declares its pages. Every figure below is drawn at a size this
// file knows, on a sheet this file knows the height of, and the page breaks are
// ours. A page that overflows is CLIPPED rather than spilled -- see `overflow`
// in the .report-page rule in index.css -- which turns "the report silently grew
// a blank page" into something visible in the preview, where it can be fixed.
//
// The second consequence is that NOTHING IN THE REPORT MEASURES THE DOM. Every
// chart here is HTML and CSS, or SVG at an explicit pixel size. There is no
// ResponsiveContainer, no ResizeObserver, and therefore no race against
// `window.print()` -- which is what put the fleet donut's total outside its own
// hole on the previous attempt.
// =============================================================================

// A4 portrait, minus the `@page` margin. 186 x 273mm.
//
// COMPUTED from PAGE_MARGIN_MM rather than written as `186`, because the margin
// and the page box are two halves of one measurement: a box sized for a 12mm
// margin printed against a 15mm one either loses its right-hand column or spills
// a blank sheet after every real one, and neither shows up anywhere except on
// paper. hooks/usePageOrientation.ts owns the margin; this reads it.
//
// Millimetres and not pixels, all the way to the DOM. 273mm is 1032px at the CSS
// reference resolution, and 1032px converts back to 273.05mm -- five hundredths
// of a millimetre of overflow, once per page, is a blank sheet after every one
// of them. Handing the browser mm lets it do the conversion once, at print time,
// against the sheet it is actually using.
const AREA = printableAreaMm('portrait');

export const PAGE_WIDTH_MM = AREA.widthMm;
/** One millimetre under the printable height, as rounding slack. */
export const PAGE_HEIGHT_MM = AREA.heightMm - 1;

export interface ReportPageProps {
    /** 1-based. Printed in the foot as "Page 3 of 8". */
    page: number;
    total: number;
    /** The running head's right side: which part of the report this sheet is. */
    section: string;
    /** The running head's left side. The report's own name, on every sheet. */
    documentTitle: string;
    /** Page 1 only: replaces the running head with the full masthead. */
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
}) => (
    <article
        className="report-page"
        // Inline rather than in the stylesheet, so the one place the page size is
        // decided is the one place the margin is read from. A `width: 186mm` in
        // index.css would be a second copy of an arithmetic result, free to
        // disagree with PAGE_MARGIN_MM the day somebody changes it.
        style={{ width: `${PAGE_WIDTH_MM}mm`, height: `${PAGE_HEIGHT_MM}mm` }}
        aria-label={pageLabel}
    >
        {masthead ?? (
            // The running head. Deliberately quiet -- 3mm of ink whose only job
            // is to tell a reader holding page 5 what they are holding. Ruled
            // underneath rather than boxed: a box would read as content.
            <header className="flex shrink-0 items-baseline justify-between gap-4 border-b border-slate-200 pb-1.5 text-[9px] tracking-wide text-slate-500">
                <span className="truncate">{documentTitle}</span>
                <span className="shrink-0 font-medium text-slate-600">{section}</span>
            </header>
        )}

        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">{children}</div>

        <footer className="mt-2 flex shrink-0 items-baseline justify-between gap-4 border-t border-slate-200 pt-1.5 text-[9px] text-slate-500">
            {/* Left is empty on purpose. A page number belongs on the outer
                edge of a spread, and a single-sided report has only a right
                edge -- putting anything on the left would make the reader check
                whether the two lines are related. */}
            <span />
            <span className="shrink-0 tabular-nums">
                {page} / {total}
            </span>
        </footer>
    </article>
);
