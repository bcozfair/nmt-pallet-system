import { useCallback, useEffect, useState } from 'react';
import { getPageOrientation, setPageOrientation } from '../../../../hooks/usePageOrientation';

// Printing the A4 report, with no preview in front of it.
//
// There WAS a preview -- a full-screen viewer showing the sheets at 1:1 before
// anything reached a printer. It is gone at the reader's request, and what
// replaces it is the browser's own print preview, which shows the same pages.
//
// ===========================================================================
// WHY THIS IS SAFE HERE AND WAS NOT SAFE ON THE DASHBOARD
//
// The last three attempts all failed on the same race: `window.print()` is
// SYNCHRONOUS, and the dashboard's charts size themselves from a width they
// measure with a ResizeObserver -- which is delivered at the end of a frame,
// after the engine has already snapshotted the page. So the charts printed at
// whatever width they last had on screen.
//
// Nothing in the report measures anything. Every figure is HTML, CSS, or SVG
// drawn in a fixed viewBox (see ReportPrimitives.tsx). So the only thing that
// has to have happened before printing is that REACT HAS COMMITTED THE DOM --
// which is what the two frames below wait for, and which cannot be raced by an
// observer that does not exist.
// ===========================================================================

/** Two frames: one for React to commit the report, one for the browser to lay it out. */
const nextCommit = (): Promise<void> =>
    new Promise((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
        });
    });

export interface ReportPrint {
    /**
     * The instant the report describes, or `null` when nothing is being printed.
     *
     * Doubles as the render flag, and the two are one fact on purpose: "the
     * report is mounted" and "this is the moment it is a snapshot of" cannot
     * drift apart if they are the same piece of state. Kept out of the render
     * path otherwise -- this component re-renders on every realtime pallet
     * change, so a live `new Date()` would print a different time from the one
     * the reader asked for.
     */
    printingAt: Date | null;
    print: () => void;
}

export const useReportPrint = (): ReportPrint => {
    const [printingAt, setPrintingAt] = useState<Date | null>(null);

    const print = useCallback(() => setPrintingAt(new Date()), []);

    useEffect(() => {
        if (!printingAt) return;

        const root = document.documentElement;
        // `@page` is DOCUMENT state, not this hook's. The inventory and
        // transaction screens print themselves in place and are laid out for
        // landscape, so the previous value is put back below -- otherwise the
        // next thing anybody printed, on a screen that never opened this one,
        // would come out rotated.
        const savedOrientation = getPageOrientation();
        setPageOrientation('portrait');
        // What the print rules in index.css key on, so that everything except
        // the report is hidden for the duration.
        root.dataset.reportOpen = 'true';

        let cancelled = false;

        void (async () => {
            await nextCommit();
            if (cancelled) return;
            try {
                window.print();
            } finally {
                // `window.print()` blocks until the dialog is dismissed in every
                // engine this app runs in, so by here the job is done. The
                // teardown is in a `finally` rather than after the call because
                // a print that throws must not strand the document with
                // everything hidden and the orientation on portrait.
                setPrintingAt(null);
            }
        })();

        return () => {
            cancelled = true;
            delete root.dataset.reportOpen;
            setPageOrientation(savedOrientation);
        };
    }, [printingAt]);

    return { printingAt, print };
};
