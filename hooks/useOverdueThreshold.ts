import { useEffect, useState, useSyncExternalStore } from 'react';
import { ensureOverdueDays, getOverdueDays, subscribeSettings } from '../services/settingsCache';

// Same shape as hooks/useT.ts: no provider to mount, each component subscribes
// straight to the module holding the value. A screen that never shows an overdue
// number never subscribes and so never re-renders when the threshold changes.

/**
 * The configured overdue threshold, in days.
 *
 * `days` is usable on the very first render -- it is the default until the fetch
 * resolves, never undefined -- so most callers can ignore `isLoading` entirely
 * and just do the arithmetic. `isLoading` is there for a screen that would
 * rather withhold a number than show one that is about to change.
 */
export const useOverdueThreshold = (): { days: number; isLoading: boolean } => {
    const days = useSyncExternalStore(subscribeSettings, getOverdueDays, getOverdueDays);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Cancelled on unmount: ensureOverdueDays() is shared between every
        // mounted consumer, so it outlives any one of them.
        let alive = true;

        ensureOverdueDays().finally(() => {
            if (alive) setIsLoading(false);
        });

        // Re-fetch on notification, rather than only on mount. invalidateSettings()
        // empties the cache, so a mounted screen would otherwise fall back to the
        // default and sit there until someone navigated away and back. This
        // terminates: the ensure below finds the cache already warm on the
        // notification it fires itself, and returns without notifying again.
        const unsubscribe = subscribeSettings(() => {
            ensureOverdueDays();
        });

        return () => {
            alive = false;
            unsubscribe();
        };
    }, []);

    return { days, isLoading };
};
