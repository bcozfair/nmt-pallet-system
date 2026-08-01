import { useCallback } from 'react';

export type PageOrientation = 'portrait' | 'landscape';

/**
 * The page margin, in millimetres, on all four sides.
 *
 * It has to agree with the `@page` rule in index.css AND with the size of the
 * A4 report's pages (report/ReportPage.tsx), which are boxes drawn to fit the
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

/**
 * Lets a screen offer "print in portrait" / "print in landscape".
 *
 * Returns one function because the two steps must not be separable: choosing an
 * orientation without printing changes nothing a reader can see, and printing
 * without having chosen is what the browser's own Ctrl+P already does.
 *
 * The frame between the two is what makes it work. Writing `style.textContent`
 * only queues a stylesheet invalidation; `window.print()` is synchronous and
 * would otherwise snapshot the page before the new `@page` rule has been parsed,
 * so the first print after a switch would come out in the previous orientation
 * and the second would be correct -- the most confusing possible failure.
 */
export const usePageOrientation = () => {
    const printWithOrientation = useCallback(
        (orientation: PageOrientation): Promise<void> => {
            setPageOrientation(orientation);
            return new Promise<void>((resolve) => {
                requestAnimationFrame(() => {
                    window.print();
                    resolve();
                });
            });
        },
        [],
    );

    return { printWithOrientation };
};
