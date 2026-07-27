import { useEffect, useRef } from 'react';

// Recharts does not lay out for paper on its own.
//
// A ResponsiveContainer sizes its SVG from a width it measured with a
// ResizeObserver. Printing does not resize anything, so whatever the browser
// window happened to be is what lands on the page: a 2560px-wide monitor prints
// charts 2560px wide onto A4, and a phone-width window prints a report of
// unreadable slivers. Neither is what the reader asked for.
//
// The fix is to give the dashboard a fixed, paper-shaped width for the duration
// of the print, and let the observer do the rest. Every chart re-measures and
// re-renders at that width before the print dialog snapshots the page, which is
// why this is a width pin and not a CSS `transform: scale()` -- scaling would
// shrink the axis labels along with the plot.
//
// PRINT_WIDTH_PX is A4 landscape minus the 12mm margins declared in index.css
// (297mm - 24mm = 273mm), converted at the CSS reference of 96dpi. Keeping the
// two in step matters: a pin wider than the printable area silently clips the
// right-hand column of every grid.
const PRINT_WIDTH_PX = Math.round((297 - 24) / 25.4 * 96); // ~1032

interface PrintLayoutOptions {
    /** Skip the pin, e.g. while the dashboard is still showing skeletons. */
    enabled?: boolean;
}

/**
 * Prepares a dashboard subtree for `Ctrl+P` and restores it afterwards.
 *
 * Attach the returned ref to the element wrapping everything that should print.
 */
export const usePrintLayout = <T extends HTMLElement = HTMLDivElement>(
    options: PrintLayoutOptions = {},
) => {
    const { enabled = true } = options;
    const ref = useRef<T | null>(null);

    // Holds the inline values that were there before the pin, so restoring
    // writes back exactly what it found rather than assuming they were empty.
    // A caller that legitimately sets its own inline width would otherwise lose
    // it the first time anyone printed.
    const previous = useRef<{ width: string; maxWidth: string } | null>(null);

    useEffect(() => {
        if (!enabled) return;

        const applyPin = () => {
            const el = ref.current;
            if (!el || previous.current) return;

            previous.current = {
                width: el.style.width,
                maxWidth: el.style.maxWidth,
            };
            el.style.width = `${PRINT_WIDTH_PX}px`;
            // The shell caps content at max-w-7xl (1280px). That cap is below
            // the pin at some widths and above it at others, so it is cleared
            // rather than fought with -- otherwise the pin would apply on a
            // narrow window and be ignored on a wide one.
            el.style.maxWidth = 'none';

            // An open chart tooltip is real DOM and would be captured mid-page,
            // and a focus ring on whichever button was last clicked prints as a
            // stray outline. Both are cheap to clear and confusing to leave.
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
        };

        const removePin = () => {
            const el = ref.current;
            const saved = previous.current;
            if (!el || !saved) return;

            el.style.width = saved.width;
            el.style.maxWidth = saved.maxWidth;
            previous.current = null;
        };

        window.addEventListener('beforeprint', applyPin);
        window.addEventListener('afterprint', removePin);

        // Safari fires neither event; it only flips this media query. Both
        // paths are registered because the two overlap harmlessly -- applyPin
        // and removePin are each guarded against running twice.
        const mql = window.matchMedia?.('print');
        const onMediaChange = (e: MediaQueryListEvent) => {
            if (e.matches) applyPin();
            else removePin();
        };
        mql?.addEventListener?.('change', onMediaChange);

        return () => {
            window.removeEventListener('beforeprint', applyPin);
            window.removeEventListener('afterprint', removePin);
            mql?.removeEventListener?.('change', onMediaChange);
            // Unmounting mid-print would otherwise strand the pin on a detached
            // node, and on a remount the saved values would be the pinned ones.
            removePin();
        };
    }, [enabled]);

    return ref;
};
