import { useCallback } from 'react';

export type PageOrientation = 'portrait' | 'landscape';

/**
 * The page margin, in millimetres, on all four sides.
 *
 * It has to agree with the `@page` rule in index.css AND with the width the
 * dashboard pins for its charts (usePrintLayout). Exported so neither of those
 * can restate it as a literal and then drift: a pinned width computed from a
 * margin the printer is not using clips the right-hand column of every grid,
 * silently, on paper only.
 */
export const PAGE_MARGIN_MM = 12;

/** A4, in millimetres, long edge first. */
const A4_LONG_MM = 297;
const A4_SHORT_MM = 210;

/**
 * How many CSS pixels wide the printable area is for a given orientation.
 *
 * 25.4mm per inch, 96 CSS pixels per inch -- the CSS reference pixel, not the
 * printer's real DPI. That is the unit `width: 1032px` is measured in, so it is
 * the right one for a layout pin.
 */
export const printableWidthPx = (orientation: PageOrientation): number => {
    const acrossMm = orientation === 'landscape' ? A4_LONG_MM : A4_SHORT_MM;
    return Math.round(((acrossMm - PAGE_MARGIN_MM * 2) / 25.4) * 96);
};

const STYLE_ELEMENT_ID = 'nmt-page-orientation';

// Module-level, not React state, and deliberately so: `@page` is a property of
// THE DOCUMENT. There is exactly one printed sheet size at a time no matter how
// many components are mounted, so a per-component copy of this value could only
// ever be a way for two of them to disagree. usePrintLayout reads it through
// getPageOrientation() below to size its width pin, which is the one place the
// two halves of "print in portrait" have to agree.
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
