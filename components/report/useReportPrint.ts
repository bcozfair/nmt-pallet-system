import { useCallback, useEffect, useState } from 'react';
import { getPageOrientation, setPageOrientation } from '../../hooks/usePageOrientation';
import type { PageOrientation } from '../../hooks/usePageOrientation';

// Printing an A4 report, with no preview in front of it.
//
// There WAS a preview -- a full-screen viewer showing the sheets at 1:1 before
// anything reached a printer. It is gone at the reader's request, and what
// replaces it is the browser's own print preview, which shows the same pages.
//
// ===========================================================================
// WHY THIS IS SAFE HERE AND WAS NOT SAFE ON THE SCREENS THEMSELVES
//
// The last three attempts all failed on the same race: `window.print()` is
// SYNCHRONOUS, and the dashboard's charts size themselves from a width they
// measure with a ResizeObserver -- which is delivered at the end of a frame,
// after the engine has already snapshotted the page. So the charts printed at
// whatever width they last had on screen.
//
// Nothing in a report measures anything. Every figure is HTML, CSS, or SVG drawn
// in a fixed viewBox, and every table row is a box of a declared height. So the
// only things that have to have happened before printing are that REACT HAS
// COMMITTED THE DOM and that any IMAGES HAVE DECODED -- both of which are
// awaitable, unlike an observer callback, and both of which are waited for
// below.
// ===========================================================================

/** Two frames: one for React to commit the report, one for the browser to lay it out. */
const nextCommit = (): Promise<void> =>
    new Promise((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
        });
    });

/** Longest this will hold the print dialog back waiting for pictures. */
const IMAGE_TIMEOUT_MS = 8000;

/**
 * Waits for every <img> inside the mounted report to be decodable.
 *
 * The inventory report ends in an appendix of damage photos fetched from signed
 * URLs. An image whose bytes have not arrived prints as a blank box -- and
 * because `window.print()` is synchronous there is no second chance: the sheet
 * is already at the printer. `decode()` is the only promise in the platform that
 * means "this will paint", which is the actual question.
 *
 * Failures are swallowed on purpose. A photo whose signed URL has expired should
 * cost that one frame on the page, not the whole report; the appendix caption
 * still names the pallet, so a reader can see which picture is missing.
 *
 * The overall race is the backstop for the case `decode()` cannot cover: a
 * request that never resolves at all. Eight seconds of waiting is a slow print;
 * an indefinite wait is a frozen button with nothing on screen explaining it.
 */
const imagesReady = (root: ParentNode): Promise<unknown> => {
    const images = Array.from(root.querySelectorAll('img'));
    if (images.length === 0) return Promise.resolve();

    const decoded = Promise.all(images.map((img) => img.decode().catch(() => undefined)));
    const timeout = new Promise((resolve) => setTimeout(resolve, IMAGE_TIMEOUT_MS));
    return Promise.race([decoded, timeout]);
};

/**
 * Every report is A4 PORTRAIT, and there is no control anywhere offering
 * anything else.
 *
 * The two table reports briefly did offer the choice, inheriting it from the
 * screens' old in-place printing where it made sense -- a wide table really is
 * easier to read across a landscape sheet. It does not survive the move to
 * declared pages. A report laid out for one sheet and printed on the other is
 * not a rotation, it is a different document: different rows per page, different
 * page count, a masthead sized for a different column width. Offering both
 * meant two layouts to keep honest, of which a reader would only ever see one.
 *
 * `@page` elsewhere in the app stays landscape. That default is for a bare
 * Ctrl+P, which reaches no JavaScript and therefore no report -- and a raw
 * screenshot of a seven-column table is better off wide.
 */
const REPORT_ORIENTATION: PageOrientation = 'portrait';

export interface ReportPrintJob {
    /**
     * The instant the report describes.
     *
     * Doubles as the render flag, and that is on purpose: "the report is
     * mounted" and "this is the moment it is a snapshot of" cannot drift apart if
     * they are the same piece of state. Kept out of the render path otherwise --
     * these screens re-render on every realtime change, so a live `new Date()`
     * would print a different time from the one the reader asked for.
     */
    at: Date;
}

export interface ReportPrint {
    /** The job in flight, or `null` when nothing is being printed. */
    job: ReportPrintJob | null;
    print: () => void;
}

export const useReportPrint = (): ReportPrint => {
    const [job, setJob] = useState<ReportPrintJob | null>(null);

    const print = useCallback(() => setJob({ at: new Date() }), []);

    useEffect(() => {
        if (!job) return;

        const root = document.documentElement;
        // `@page` is DOCUMENT state, not this hook's. Whatever the previous value
        // was is put back below -- otherwise the next thing anybody printed, on a
        // screen that never opened a report, would come out portrait.
        const savedOrientation = getPageOrientation();
        setPageOrientation(REPORT_ORIENTATION);
        // What the print rules in index.css key on, so that everything except the
        // report is hidden for the duration.
        root.dataset.reportOpen = 'true';

        let cancelled = false;

        void (async () => {
            await nextCommit();
            if (cancelled) return;
            await imagesReady(document);
            if (cancelled) return;
            try {
                window.print();
            } finally {
                // `window.print()` blocks until the dialog is dismissed in every
                // engine this app runs in, so by here the job is done. The
                // teardown is in a `finally` rather than after the call because a
                // print that throws must not strand the document with everything
                // hidden and the orientation changed.
                setJob(null);
            }
        })();

        return () => {
            cancelled = true;
            delete root.dataset.reportOpen;
            setPageOrientation(savedOrientation);
        };
    }, [job]);

    return { job, print };
};
