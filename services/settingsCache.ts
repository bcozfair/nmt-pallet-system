import { fetchSystemSetting } from './settingsService';

// The overdue threshold, cached in a module singleton -- the same shape as
// services/i18n.ts, and for the same reason: not every caller can hold a hook.
//
// This replaces three copies of `localStorage.getItem('nmt_setting_overdue_days')`
// in DashboardHome, LocationView and useInventoryFilters. Nothing in the app has
// ever WRITTEN that key. The settings screen saves to system_settings.overdue_days,
// which until now only the LINE edge function read, so every number on screen was
// pinned to the hardcoded 7 and could silently disagree with the report that got
// sent to the floor. One source, read from the database, is the fix.
//
// Deliberately not a React context. Two of the current readers are components,
// but the value is a plain fact about the system rather than a piece of view
// state, and the i18n module already documents what a provider costs here:
// anything outside the tree (utils/exportHelpers.ts, the hooks/inventory/*
// helpers) would be locked out of it. Components subscribe through
// hooks/useOverdueThreshold.ts; everything else calls getOverdueDays() directly.

/** Matches DEFAULT_SETTINGS.overdue_days in settingsService.ts and the edge function's own fallback. */
export const DEFAULT_OVERDUE_DAYS = 7;

// null means "not fetched yet", which is distinct from "fetched and it happened
// to be 7" -- ensureOverdueDays() uses that difference to decide whether to hit
// the network.
let cached: number | null = null;
let inFlight: Promise<number> | null = null;

// Bumped by invalidateSettings(). A fetch that was already in the air when the
// cache was invalidated captures the old value here and, seeing it no longer
// matches, throws its result away instead of writing a pre-save number back
// over a post-save one.
let generation = 0;

const listeners = new Set<() => void>();

const notify = (): void => {
    listeners.forEach(listener => listener());
};

/**
 * A settings outage must not silently zero the overdue count, so anything that
 * is not a usable number falls back to the default.
 *
 * The guard is the point. The bug this module replaces read the value with a
 * bare `parseInt(setting)` and compared `days > overdueThreshold`: on a corrupt
 * value that is `days > NaN`, which is false for every pallet, so the count
 * quietly dropped to zero and looked like good news. Non-positive is rejected
 * for the mirror-image reason -- an overdue threshold of 0 marks the entire
 * fleet overdue the moment it is checked out.
 */
const normalise = (raw: string | null): number => {
    if (raw === null) return DEFAULT_OVERDUE_DAYS;

    const parsed = parseInt(raw, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        console.warn(`[settingsCache] Ignoring unusable overdue_days value: ${JSON.stringify(raw)}`);
        return DEFAULT_OVERDUE_DAYS;
    }
    return parsed;
};

/**
 * The current threshold in days. Synchronous, so it is safe to call during
 * render or from a plain function.
 *
 * Returns the default until ensureOverdueDays() has resolved. That is
 * intentional: a caller gets a sane number immediately rather than having to
 * handle "not loaded yet" everywhere, and the subscribers re-render when the
 * real value lands.
 */
export const getOverdueDays = (): number => cached ?? DEFAULT_OVERDUE_DAYS;

/**
 * Loads the threshold once and hands every caller the same value.
 *
 * The in-flight promise is stored, not just the result. Three components mount
 * together on a dashboard load; without this they would fire three identical
 * requests, because none of them would have finished writing the cache before
 * the others started reading it.
 */
export const ensureOverdueDays = (): Promise<number> => {
    if (cached !== null) return Promise.resolve(cached);
    if (inFlight) return inFlight;

    const gen = generation;

    inFlight = fetchSystemSetting('overdue_days')
        .then(normalise)
        .catch(error => {
            // fetchSystemSetting already swallows the PostgREST error and
            // returns null, so reaching here means something further out broke
            // (offline, auth). Same answer either way: keep the default.
            console.warn('[settingsCache] Could not load overdue_days, using the default', error);
            return DEFAULT_OVERDUE_DAYS;
        })
        .then(days => {
            // Invalidated mid-flight: this answer predates the save that
            // invalidated it. Drop it and leave the cache empty so the next
            // ensureOverdueDays() refetches.
            if (gen !== generation) return days;

            cached = days;
            inFlight = null;
            notify();
            return days;
        });

    return inFlight;
};

/**
 * Wired to useSyncExternalStore in hooks/useOverdueThreshold.ts, which is also
 * what re-fetches after an invalidation -- returning the unsubscribe function is
 * what that hook expects.
 */
export const subscribeSettings = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

/**
 * Called after the settings screen saves. Drops the cached value and any
 * in-flight fetch, then wakes the subscribers so the dashboard, the location
 * table and the inventory filter all pick the new threshold up without a page
 * reload -- which is the whole reason those three used to disagree.
 */
export const invalidateSettings = (): void => {
    generation++;
    cached = null;
    inFlight = null;
    notify();
};
