import { useSyncExternalStore } from 'react';

// Recharts animates in JavaScript, not CSS -- it interpolates path `d` and bar
// geometry frame by frame. That means the `@media (prefers-reduced-motion:
// reduce)` block in index.css, which switches off every `.animate-*` utility in
// this app, cannot reach a single chart. The only lever is the library's own
// `isAnimationActive` prop, and that needs the preference as a JS value.
//
// Hence this hook. Every `<Line>`, `<Bar>`, `<Area>` and `<Pie>` on the
// dashboard is expected to carry `isAnimationActive={!useReducedMotion()}`, or
// the reduced-motion promise the rest of the app keeps is broken by the noisiest
// part of the page.

const QUERY = '(prefers-reduced-motion: reduce)';

// matchMedia is missing in non-browser environments (and in older Safari the
// listener API differs). Both are handled here rather than at each call site.
const subscribe = (onChange: () => void): (() => void) => {
    if (typeof window === 'undefined' || !window.matchMedia) return () => { };

    const list = window.matchMedia(QUERY);

    // addEventListener is the modern form; addListener is the deprecated one
    // Safari < 14 still needs. Prefer the former, fall back rather than throw.
    if (typeof list.addEventListener === 'function') {
        list.addEventListener('change', onChange);
        return () => list.removeEventListener('change', onChange);
    }

    list.addListener(onChange);
    return () => list.removeListener(onChange);
};

const getSnapshot = (): boolean => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(QUERY).matches;
};

// The server snapshot is `false` rather than `true`: with no window there is no
// user preference to honour, and defaulting to "reduced" would strip animation
// from the first client render for everyone before hydration corrects it.
const getServerSnapshot = (): boolean => false;

/**
 * `true` when the user has asked the OS to reduce motion.
 *
 * Pass the negation to Recharts: `isAnimationActive={!reduced}`.
 */
export const useReducedMotion = (): boolean =>
    useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
