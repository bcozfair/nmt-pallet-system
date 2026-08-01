export type PageOrientation = 'portrait' | 'landscape';

/**
 * The page margin, in millimetres, on all four sides.
 *
 * It has to agree with the `@page` rule in index.css AND with the size of the
 * A4 reports' pages (components/report/ReportPage.tsx), which are boxes drawn to fit the
 * printable area exactly. Exported so neither can restate it as a literal and
 * then drift: a page box computed from a margin the printer is not using either
 * clips its own right-hand column or spills a blank sheet after every real one,
 * silently, on paper only.
 */
export const PAGE_MARGIN_MM = 12;

/** A4, in millimetres, long edge first. */
export const A4_LONG_MM = 297;
export const A4_SHORT_MM = 210;

/**
 * The printable area for a given orientation, in millimetres.
 *
 * Millimetres and not CSS pixels, deliberately. This used to return px, for a
 * width pin that no longer exists -- the dashboard is not printed in place any
 * more. Its one consumer now is a box that has to line up with a physical sheet,
 * and the px conversion (25.4mm per inch, 96 px per inch) rounds: 273mm becomes
 * 1032px, which converts back to 273.05mm. A page box a twentieth of a
 * millimetre too tall spills a blank sheet after every real one, so the
 * conversion is left to the browser at the last possible moment.
 */
export const printableAreaMm = (
    orientation: PageOrientation,
): { widthMm: number; heightMm: number } => {
    const acrossMm = orientation === 'landscape' ? A4_LONG_MM : A4_SHORT_MM;
    const downMm = orientation === 'landscape' ? A4_SHORT_MM : A4_LONG_MM;
    return {
        widthMm: acrossMm - PAGE_MARGIN_MM * 2,
        heightMm: downMm - PAGE_MARGIN_MM * 2,
    };
};

const STYLE_ELEMENT_ID = 'nmt-page-orientation';

// Module-level, not React state, and deliberately so: `@page` is a property of
// THE DOCUMENT. There is exactly one printed sheet size at a time no matter how
// many components are mounted, so a per-component copy of this value could only
// ever be a way for two of them to disagree. The report print hook reads it
// through getPageOrientation() below so it can put back whatever the document was
// on before it forced portrait -- see report/useReportPrint.ts.
//
// The default matches the `@page` rule index.css ships, so a reader who hits
// Ctrl+P without going through a button gets what that rule promises.
let currentOrientation: PageOrientation = 'landscape';

export const getPageOrientation = (): PageOrientation => currentOrientation;

/**
 * Rewrites the document's `@page` rule.
 *
 * An at-rule cannot be set through an element's inline style -- there is no
 * element to hang it on; it describes the sheet of paper. So the rule itself is
 * replaced, in one <style> tag this module owns and reuses. Appending a second
 * tag per print would leave a stack of contradictory `size:` declarations where
 * the last one silently wins.
 *
 * It stays in <head> after printing rather than being torn down, so that a
 * follow-up Ctrl+P uses the orientation the reader last chose instead of
 * reverting to the stylesheet default without saying so.
 *
 * It also stamps the orientation onto <html> as `data-print-orientation`.
 *
 * Nothing in the app styles off that attribute today -- the `.print-paper-grid`
 * rules that did are gone with the attempt to print the dashboard in place. It
 * is kept because it is the only way to see, in devtools, which orientation the
 * document is actually in when a print comes out rotated, and that has been the
 * cause of a wrong-looking print more than once.
 */
export const setPageOrientation = (orientation: PageOrientation): void => {
    currentOrientation = orientation;

    if (typeof document === 'undefined') return;

    let style = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
    if (!style) {
        style = document.createElement('style');
        style.id = STYLE_ELEMENT_ID;
        document.head.appendChild(style);
    }

    style.textContent = `@page { size: A4 ${orientation}; margin: ${PAGE_MARGIN_MM}mm; }`;
    document.documentElement.dataset.printOrientation = orientation;
};

// `usePageOrientation` -- the hook this file is named after -- used to live here.
// It was `setPageOrientation` plus one frame plus `window.print()`, which is
// exactly the right shape for a screen that prints ITSELF: the frame is
// load-bearing, because writing `style.textContent` only queues a stylesheet
// invalidation and a synchronous `window.print()` would otherwise snapshot the
// page before the new `@page` rule had been parsed -- so the first print after a
// switch came out in the previous orientation and the second was correct, which
// is the most confusing possible failure.
//
// No screen prints itself any more. All three mount a real A4 document and print
// that, and the waiting they need is longer and different: React has to commit
// the report, and its images have to decode. That handler is
// components/report/useReportPrint.ts, and it calls `setPageOrientation` above
// directly -- along with putting the previous value back afterwards, which this
// hook never did and which is why a report printed from one screen used to leave
// the next screen's Ctrl+P rotated.
//
// The module keeps its name because everything left in it is still about the
// page: the margin, the printable area, and the one `@page` rule the document
// owns.
