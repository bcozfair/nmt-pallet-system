import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pallet, Transaction, User } from '../../types';
import { fetchTransactions } from '../../services/transactionService';
import { fetchUsers } from '../../services/userService';
import { useOverdueThreshold } from '../useOverdueThreshold';
import {
    computeDashboardAnalytics,
    DashboardAnalytics,
    TrendBucket,
} from '../../services/analytics/dashboardAnalytics';

/**
 * Fetching and orchestration for the redesigned dashboard.
 *
 * All the arithmetic lives in services/analytics/dashboardAnalytics.ts, which is
 * pure. This hook does the three things that cannot be pure: it decides what
 * window to ask the server for, it keeps the two kinds of "loading" apart, and
 * it makes sure a slow response cannot overwrite a fast one that came after it.
 */

const MS_PER_DAY = 86400000;

export type DashboardRange = '7d' | '30d' | '90d' | '12m';

/**
 * How far BEFORE rangeStart to fetch transactions.
 *
 * Dwell time is a pair: a `check_out` and whichever of `check_in` / `repair` /
 * `scrap` closes it. Those two events can be weeks apart, and a naive fetch of
 * exactly [rangeStart, rangeEnd] loses every pair whose opening event fell
 * before the window. The pallet that went out 40 days ago and came back
 * yesterday simply disappears from the histogram -- and it is precisely the long
 * trips that a dwell chart exists to show, so the failure mode is that the
 * numbers look healthy specifically because the unhealthy cases were dropped.
 *
 * Ninety days covers essentially every real trip while keeping the request
 * bounded. The extra rows do not distort anything else: computeDashboardAnalytics
 * receives rangeStart/rangeEnd separately from this fetch window and counts a
 * dwell pair only when its CLOSING event falls inside the range, while the
 * trend, heat, staff and funnel totals ignore out-of-range rows entirely.
 */
const DWELL_LOOKBACK_DAYS = 90;

/**
 * Granularity per range. Chosen so every window lands between roughly 7 and 30
 * bars: daily bars over a year are unreadable, monthly bars over a week are one
 * bar.
 */
const BUCKET_BY_RANGE: Record<DashboardRange, TrendBucket> = {
    '7d': 'day',
    '30d': 'day',
    '90d': 'week',
    '12m': 'month',
};

/**
 * Start of the window, aligned to a whole bucket in LOCAL time.
 *
 * Alignment is not cosmetic. An unaligned start puts a partial bucket at the
 * left edge -- half a day, three days of a week -- and a short bar next to full
 * ones reads as a collapse in activity rather than as a boundary artefact. It
 * also matters for correctness: the reducer gates every row on
 * [rangeStart, rangeEnd], so an unaligned weekly start would produce a first bar
 * that genuinely counts fewer days than the ones beside it. Snapping the 90-day
 * window back to its Sunday makes the window a few days longer than 90; that is
 * the right trade for a chart whose unit is a week.
 */
const rangeStartFor = (range: DashboardRange, now: Date): Date => {
    switch (range) {
        case '7d':
            // -6, not -7: today counts as one of the seven.
            return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        case '30d':
            return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        case '90d': {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89);
            // Back up to the Sunday that starts this week, matching the weekly
            // bucketing in dashboardAnalytics.
            return new Date(start.getFullYear(), start.getMonth(), start.getDate() - start.getDay());
        }
        case '12m':
            // The 1st of the month eleven months back: twelve whole months
            // including the current (partial) one.
            return new Date(now.getFullYear(), now.getMonth() - 11, 1);
    }
};

/**
 * Everything the reducer needs that came from the network, captured together.
 *
 * `now`, `rangeStart` and `rangeEnd` are stored alongside the rows rather than
 * recomputed at render time on purpose. The reducer takes `now` as an argument
 * so its output is deterministic; if this hook called `new Date()` during
 * render, `now` would differ on every pass, the memo below would never hit, and
 * a full O(T + P) recompute would run on every unrelated re-render of the page.
 * Freezing the clock at fetch time gives the memo a stable identity and makes
 * the numbers on screen consistent with each other -- all of them describe the
 * same instant rather than each describing whenever it happened to be computed.
 */
interface Snapshot {
    transactions: Transaction[];
    users: Pick<User, 'id' | 'full_name'>[];
    rangeStart: Date;
    rangeEnd: Date;
    now: Date;
    bucket: TrendBucket;
}

export interface DashboardData {
    analytics: DashboardAnalytics | null;
    /** First load for a given range -> render skeletons. */
    isLoading: boolean;
    /** Realtime-triggered refetch -> hold the previous frame at reduced opacity. */
    isRefreshing: boolean;
    /** A plain message, deliberately untranslated. See the catch block. */
    error: string | null;
    range: DashboardRange;
    setRange: (r: DashboardRange) => void;
    reload: () => void;
}

export const useDashboardData = (
    pallets: Pallet[],
    palletsLoading: boolean,
): DashboardData => {
    const { days: overdueDays } = useOverdueThreshold();

    const [range, setRange] = useState<DashboardRange>('30d');
    const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reloadNonce, setReloadNonce] = useState(0);

    /**
     * Monotonic id for the in-flight request. The guard against a stale response
     * overwriting a newer one: every fetch takes the next id, and a response
     * only commits if its id is still the current one. Clicking 7d then 30d
     * fires two requests, and if the 7d query happens to be the slower of the
     * two -- entirely possible, they hit different index ranges -- its result
     * would otherwise land last and leave the screen showing seven days of data
     * under a "30 days" label, with no error and nothing to retry.
     *
     * A ref rather than state because it must be readable synchronously by a
     * closure that started several renders ago, and changing it must not itself
     * cause a render.
     */
    const requestIdRef = useRef(0);

    /**
     * Which range currently has data on screen. This is what separates
     * `isLoading` from `isRefreshing`: a fetch for a range we have never shown
     * gets skeletons, and a fetch for the range already displayed keeps the
     * existing frame.
     */
    const loadedRangeRef = useRef<DashboardRange | null>(null);

    /**
     * A cheap content signature for the pallet list, used as the refetch trigger
     * instead of the array's identity.
     *
     * The parent re-subscribes to pallet changes over realtime and hands down a
     * fresh array; depending on that array's identity would refetch on every
     * parent render, including renders caused by this hook's own state updates
     * -- an infinite request loop. Length plus the newest timestamp changes
     * exactly when a row is written, which is exactly when there is a new
     * transaction to go and read. ISO strings with a fixed offset compare
     * lexicographically in the same order they compare chronologically, so a
     * plain string comparison is sufficient and avoids parsing P dates.
     */
    const palletSignature = useMemo(() => {
        let latest = '';
        for (const p of pallets) {
            const stamp = p.last_transaction_date || p.last_checkout_date || p.created_at || '';
            if (stamp > latest) latest = stamp;
        }
        return `${pallets.length}:${latest}`;
    }, [pallets]);

    useEffect(() => {
        // Wait for the pallet list. The analytics needs both halves, and firing
        // now would mean a second identical request the moment pallets arrive
        // and change the signature above.
        if (palletsLoading) return;

        let cancelled = false;
        const myId = ++requestIdRef.current;

        const firstForRange = loadedRangeRef.current !== range;
        if (firstForRange) {
            setIsLoading(true);
            setIsRefreshing(false);
        } else {
            // The realtime path. Skeletons here would make the page strobe: this
            // app pushes a pallet row change per pallet, so a 30-pallet bulk
            // check-out lands as a burst of updates and the whole dashboard
            // would blink to grey and back thirty times. Holding the previous
            // frame at reduced opacity shows the same information, slightly
            // dimmed, until the new numbers replace it in place.
            setIsRefreshing(true);
        }

        // Frozen once per fetch and carried through to the reducer. See Snapshot.
        const now = new Date();
        const rangeEnd = now;
        const rangeStart = rangeStartFor(range, now);
        const since = new Date(rangeStart.getTime() - DWELL_LOOKBACK_DAYS * MS_PER_DAY).toISOString();

        (async () => {
            try {
                const [transactions, users] = await Promise.all([
                    // No `until`: rangeEnd is `now`, so there is nothing beyond
                    // it to exclude, and the reducer clamps to the range anyway.
                    // Ascending because the reducer is a forward scan whose
                    // dwell pairing is order-dependent.
                    fetchTransactions({ since, order: 'asc' }),
                    // Deliberately degraded rather than fatal. fetchUsers() is an
                    // admin-gated RPC used here only to turn user ids into names,
                    // and the reducer already has a designed fallback for an
                    // unresolvable id. Letting a name lookup blank out the entire
                    // dashboard would trade every number on the page for a
                    // cosmetic one.
                    fetchUsers().catch((e): User[] => {
                        console.warn('[useDashboardData] Could not load users; staff names will fall back to short ids.', e);
                        return [];
                    }),
                ]);

                if (cancelled || requestIdRef.current !== myId) return;

                setSnapshot({
                    transactions,
                    users,
                    rangeStart,
                    rangeEnd,
                    now,
                    bucket: BUCKET_BY_RANGE[range],
                });
                setError(null);
                loadedRangeRef.current = range;
            } catch (e) {
                if (cancelled || requestIdRef.current !== myId) return;

                // A raw message, not a translated sentence. This hook has no
                // business holding user-facing text: the component owns the
                // dictionary and can decide whether to show a generic key or
                // this string. The previous snapshot is deliberately left in
                // place so a transient network blip shows an error banner over
                // the last good numbers rather than wiping the screen.
                setError(e instanceof Error ? e.message : String(e));
                // Marked as attempted even though it failed, so a retry refreshes
                // in place instead of dropping back to skeletons.
                loadedRangeRef.current = range;
            } finally {
                if (cancelled || requestIdRef.current !== myId) return;
                setIsLoading(false);
                setIsRefreshing(false);
            }
        })();

        // Covers unmount and any dependency change. The id check above covers
        // out-of-order completions; this covers a response arriving after the
        // component is gone, which would otherwise be a setState on an unmounted
        // tree. Both are needed: neither subsumes the other.
        return () => {
            cancelled = true;
        };
    }, [range, palletSignature, reloadNonce, palletsLoading]);

    /**
     * Keyed on the pallet array's identity, not on palletSignature.
     *
     * The signature is a deliberate approximation, good enough to decide whether
     * to spend a network request; recomputing is local and cheap, so it keys on
     * the real thing and cannot miss a change the signature failed to notice.
     */
    const analytics = useMemo(() => {
        if (!snapshot) return null;
        return computeDashboardAnalytics({
            transactions: snapshot.transactions,
            pallets,
            users: snapshot.users,
            overdueDays,
            rangeStart: snapshot.rangeStart,
            rangeEnd: snapshot.rangeEnd,
            bucket: snapshot.bucket,
            now: snapshot.now,
        });
    }, [snapshot, pallets, overdueDays]);

    const reload = useCallback(() => {
        setReloadNonce((n) => n + 1);
    }, []);

    return {
        analytics,
        // A manual reload on the current range counts as a refresh, not a first
        // load, so it too holds the frame instead of flashing skeletons.
        isLoading: palletsLoading || isLoading,
        isRefreshing,
        error,
        range,
        setRange,
        reload,
    };
};
