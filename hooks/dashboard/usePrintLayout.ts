import { useCallback, useEffect, useRef } from 'react';
import {
    getPageOrientation,
    printableWidthPx,
    setPageOrientation,
} from '../usePageOrientation';
import type { PageOrientation } from '../usePageOrientation';

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
// The pin width FOLLOWS THE CHOSEN ORIENTATION. It used to be the landscape
// number, ~1032px, baked in as a constant -- which was correct for as long as
// landscape was the only thing this app could print.
//
// The moment the header offered "print in portrait", that constant became a bug
// with no symptom on screen: A4 portrait has 703px of printable width, so every
// chart was laid out 329px wider than the paper and the right-hand edge of every
// grid was cut off. Nothing warns about it -- the preview simply shows a chart
// running off the sheet.
//
// printableWidthPx and the `@page` rule are computed from the same margin
// constant (hooks/usePageOrientation.ts), which is what keeps them in step.
// getPageOrientation() is read at pin time, not at mount: the reader picks the
// orientation from a menu after this hook has already run.
//
// ===========================================================================
// WHY THE PIN CANNOT BE APPLIED FROM `beforeprint`, WHICH IS WHERE IT WAS
//
// The paragraph above says "every chart re-measures ... before the print dialog
// snapshots the page". For as long as the pin was applied from a `beforeprint`
// listener that was simply not true, and the printed sheets showed it:
//
//   - `window.print()` is SYNCHRONOUS. `beforeprint` fires inside it, the
//     listeners run, and the engine snapshots the layout the moment they
//     return.
//   - A ResizeObserver callback is NOT synchronous. The browser delivers it at
//     the end of a frame, and the React state update it makes needs a commit
//     after that.
//
// So the width was pinned, the snapshot was taken, and the ResizeObserver ran
// afterwards -- against a page that had already been sent to the printer. Every
// chart went onto the paper at the width it had last measured ON SCREEN, inside
// a card the print grid had since resized. The symptom was per-card and looked
// like several unrelated bugs: the fleet donut's total drifted out of its hole
// (the HTML overlay centres on the CARD, the SVG did not), bar charts stopped
// three quarters of the way across their card, and a card wide on screen
// overflowed a narrower one on paper.
//
// printForPaper() below is the fix, and the ordering is the whole of it: pin,
// WAIT for the observer and the commit, and only then call window.print().
// The `beforeprint` listener stays as the fallback for a plain Ctrl+P, which
// JavaScript cannot get in front of -- it still pins the width, which is better
// than nothing, and it is the reason applyPin is written to be idempotent.
// ===========================================================================

interface PrintLayoutOptions {
    /** Skip the pin, e.g. while the dashboard is still showing skeletons. */
    enabled?: boolean;
}

/**
 * Three frames and a task, which is what it costs to see a ResizeObserver
 * through to rendered DOM.
 *
 * One frame lets the browser deliver the observer callback. The next lets React
 * commit the state update that callback made -- these are ordinary updates, not
 * flushSync, so they are not visible in the frame that scheduled them. The third
 * plus a macrotask is slack: Recharts re-derives its scales and re-renders the
 * SVG during that commit, and there is no event that says "the chart has
 * finished". It costs ~50ms against a print dialog that takes a second to open.
 */
const settleLayout = (): Promise<void> =>
    new Promise((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setTimeout(resolve, 0);
                });
            });
        });
    });

/**
 * Prepares a dashboard subtree for paper and restores it afterwards.
 *
 * Attach `ref` to the element wrapping everything that should print, and call
 * `printForPaper(orientation)` instead of `window.print()`. The two belong to
 * one hook because they are one sequence: the orientation decides the pin
 * width, the pin decides what the charts measure, and printing before the
 * charts have re-measured is the defect documented above.
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

    const applyPin = useCallback(() => {
        const el = ref.current;
        // The `previous.current` guard is what makes this safe to call twice:
        // printForPaper() pins ahead of time and `beforeprint` then fires with
        // the pin already in place. The second call must not overwrite the saved
        // values with the pinned ones.
        if (!el || previous.current) return;

        previous.current = {
            width: el.style.width,
            maxWidth: el.style.maxWidth,
        };
        const orientation = getPageOrientation();
        el.style.width = `${printableWidthPx(orientation)}px`;
        // The shell caps content at max-w-7xl (1280px). That cap is below
        // the pin at some widths and above it at others, so it is cleared
        // rather than fought with -- otherwise the pin would apply on a
        // narrow window and be ignored on a wide one.
        el.style.maxWidth = 'none';
        // The same stamp setPageOrientation writes, repeated here because
        // this is the one code path EVERY print goes through. A plain Ctrl+P
        // never calls setPageOrientation at all, so on a first-ever print the
        // attribute would be missing and index.css's `.print-paper-grid`
        // rules would fall back to their landscape default -- which happens
        // to be right, but only by luck. Written from getPageOrientation()
        // rather than from a literal, so it stays right after the reader has
        // used the menu once and then goes back to Ctrl+P.
        document.documentElement.dataset.printOrientation = orientation;

        // An open chart tooltip is real DOM and would be captured mid-page,
        // and a focus ring on whichever button was last clicked prints as a
        // stray outline. Both are cheap to clear and confusing to leave.
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    }, []);

    const removePin = useCallback(() => {
        const el = ref.current;
        const saved = previous.current;
        if (!el || !saved) return;

        el.style.width = saved.width;
        el.style.maxWidth = saved.maxWidth;
        previous.current = null;
    }, []);

    useEffect(() => {
        if (!enabled) return;

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
    }, [enabled, applyPin, removePin]);

    /**
     * Lay the subtree out for the chosen sheet, let it settle, then print.
     *
     * Replaces `usePageOrientation().printWithOrientation()` for this screen and
     * for any other screen that draws charts. That one rewrites `@page` and
     * prints a frame later, which is enough for a page of tables and is not
     * enough for anything measured by a ResizeObserver -- see the block at the
     * top of this file.
     *
     * The pin is removed in a `finally` rather than left to `afterprint`. Every
     * engine fires that event or flips the media query, so this is normally a
     * no-op; it is here so that a print that fails, is cancelled in a way the
     * engine does not report, or throws, cannot leave the dashboard stranded at
     * 703px on a 1440px screen with no way back except a reload.
     */
    const printForPaper = useCallback(
        async (orientation: PageOrientation): Promise<void> => {
            // First, because applyPin reads the orientation back out of it to
            // choose the width, and because the `@page` rule needs to be in the
            // stylesheet before the engine builds its preview.
            setPageOrientation(orientation);
            applyPin();
            try {
                await settleLayout();
                window.print();
            } finally {
                removePin();
            }
        },
        [applyPin, removePin],
    );

    return { ref, printForPaper };
};
