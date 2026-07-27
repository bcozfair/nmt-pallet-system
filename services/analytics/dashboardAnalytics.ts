import { ActionType, Pallet, PalletStatus, Transaction, User } from '../../types';

/**
 * The dashboard's single source of numeric truth.
 *
 * Every figure the redesigned dashboard renders -- and every figure the CSV
 * exports write -- comes out of this one function. That is the whole reason it
 * is a pure function taking `now` as an argument rather than a hook: an export
 * that recomputed its own totals would eventually disagree with the screen it
 * was exported from, and a report that contradicts the dashboard is worse than
 * no report at all. Anything that needs a number asks here.
 *
 * Purity also makes it testable. There is no `new Date()` without an argument
 * anywhere below, no import from any `*Service.ts`, and no React. Feed it a
 * fixed `now` and a fixed transaction list and it returns the same object
 * forever, which is what lets the dwell-time and overdue maths be checked at
 * all -- both are "how long ago", and "ago" from an ambient clock is untestable.
 *
 * It replaces hooks/charts/useTrendChartData.ts, which was O(buckets x T): for
 * each of up to 12 buckets it re-filtered the entire transaction list and
 * allocated a `new Date()` per element, so the monthly view made twelve full
 * passes and ~12T Date objects. This is one forward pass.
 */

// --- CONSTANTS -------------------------------------------------------------

const MS_PER_HOUR = 3600000;
const MS_PER_DAY = 86400000;

/**
 * 'Warehouse' is a magic string in `pallets.current_location` meaning "not
 * checked out anywhere". checkInPallet() and resolveDamage() both write it
 * literally; it is NOT a row in the `departments` table. Every existing chart
 * (LocationInventoryChart, LocationRiskMatrix) skips it, because a bar chart of
 * "where are the pallets" that is 80% Warehouse says nothing.
 */
const WAREHOUSE = 'Warehouse';

/**
 * Location names are joined by NAME with no foreign key: `transactions.
 * department_dest` and `pallets.current_location` hold a copied string, and
 * updateDepartment() rewrites `departments.name` without touching either. So
 * renaming "Assembly" to "Assembly Line 1" splits one real location into two
 * series -- the new name collecting new movements, the old name holding
 * whatever was checked out before the rename and has not come back yet.
 *
 * Emitting a bar per orphan turns the location chart into a long tail of stale
 * near-empty names. Instead the top N by holdings are kept and everything else
 * is folded into one bucket keyed by the sentinel below. The caller labels that
 * sentinel from its own dictionary -- this file is language-agnostic on purpose,
 * so the same numbers can be rendered in Thai on screen and in English in a CSV.
 */
const MAX_LOCATION_SERIES = 12;
export const OTHER_LOCATION_KEY = '__other__';

/**
 * `transactions.user_id` has no enforced relationship to a live user row, so a
 * deleted account leaves an orphan UUID behind on its history. A raw UUID must
 * never reach a chart axis (rule: it is unreadable and 36 characters wide), so
 * orphans degrade to a short handle and a genuinely absent id degrades to this
 * sentinel, which the caller translates the same way it translates the location
 * sentinel above.
 */
export const UNKNOWN_USER_KEY = '__unknown_user__';
const ORPHAN_ID_LENGTH = 8;

/**
 * Runaway guard only. The real bucket counts are 7, 30, ~14 and 12; anything
 * near this ceiling means rangeStart/rangeEnd were passed nonsense and the loop
 * should stop rather than allocate until the tab dies.
 */
const MAX_TREND_BUCKETS = 400;

/** A pallet nobody has touched in this many days is worth surfacing. */
const DORMANT_AFTER_DAYS = 30;
/** The dormant list is a table, not a data dump; the caller gets the worst few. */
const MAX_DORMANT_ROWS = 20;
/** Two damage reports in one window is the point at which a pallet is a pattern. */
const REPEAT_OFFENDER_MIN_DAMAGE = 2;
const MAX_REPEAT_OFFENDERS = 10;

/**
 * Dates are deliberately NOT translated, exactly as documented in
 * components/admin/common/AdminHelpers.tsx:65. One format means what is on
 * screen matches what lands in the exported CSV and in the report filename, and
 * it sidesteps the Buddhist-era question entirely: `th-TH` would render 2026 as
 * พ.ศ. 2569, so a Thai-language screen and its own English CSV would disagree
 * about what year it is.
 */
const DATE_LOCALE = 'en-GB';

/**
 * Shared day-band edges, used by both the dwell histogram and the overdue
 * histogram so the caller needs exactly one label dictionary for both charts.
 * All six are always emitted, even when empty, so the axis does not reflow when
 * the user switches range -- a chart whose categories appear and disappear
 * makes two adjacent readings impossible to compare.
 */
const DAY_BUCKET_KEYS = ['0_1d', '2_3d', '4_7d', '8_14d', '15_30d', '30d_plus'] as const;
export type DwellBucketKey = typeof DAY_BUCKET_KEYS[number];

/** Inclusive upper bound of each band, in whole days. The last is open-ended. */
const DAY_BUCKET_MAX = [1, 3, 7, 14, 30, Infinity];
/** Lower bound of each band, in whole days -- used to flag overdue breaches. */
const DAY_BUCKET_MIN = [0, 2, 4, 8, 15, 31];

// --- PUBLIC TYPES ----------------------------------------------------------

export type TrendBucket = 'day' | 'week' | 'month';

export interface AnalyticsInput {
    /** Ascending by timestamp. The single pass below depends on it: dwell-time
     *  pairing is a state machine and a check_in seen before its check_out
     *  would silently drop the pair. */
    transactions: Transaction[];
    pallets: Pallet[];
    users: Pick<User, 'id' | 'full_name'>[];
    /** From system_settings via useOverdueThreshold, not a database column. */
    overdueDays: number;
    /** Inclusive. Should already be aligned to a `bucket` boundary -- see the
     *  comment on the trend loop for what happens when it is not. */
    rangeStart: Date;
    /** Inclusive. */
    rangeEnd: Date;
    bucket: TrendBucket;
    /** Injected rather than read from the clock, so results are deterministic
     *  and every "days ago" figure below can be asserted in a test. */
    now: Date;
}

export interface TrendPoint {
    /** Stable, sortable, locale-independent. Safe as a React key and as a CSV
     *  column, unlike `label`, whose formatting is presentational. */
    key: string;
    /** Display text for the axis. Never translated -- see DATE_LOCALE. */
    label: string;
    check_out: number;
    check_in: number;
    report_damage: number;
    repair: number;
    scrap: number;
    /** Pallets whose `created_at` falls in this bucket: fleet growth, not a
     *  transaction. It is the only series here not sourced from the log. */
    acquisition: number;
}

export interface DwellHistogramBin {
    bucket: DwellBucketKey;
    count: number;
}

export interface DwellStats {
    /** Number of completed check_out -> close pairs counted. */
    samples: number;
    medianHours: number;
    p90Hours: number;
    /** Always all six bands, in order, even when every count is zero. */
    histogram: DwellHistogramBin[];
    /** Checkouts still open at the end of the scan. See the note in the reducer:
     *  this is bounded by the fetch window, so it is a floor, not fleet.in_use. */
    openCount: number;
}

export interface RepeatOffender {
    palletId: string;
    damageCount: number;
    repairCount: number;
    /** True if the pallet was written off during the scanned history. */
    scrapped: boolean;
    lastEventISO: string | null;
}

export interface ResolutionStats {
    samples: number;
    medianHours: number;
    p90Hours: number;
    /** The same six day-bands as the dwell histogram, over time-to-resolve.
     *  Computed here rather than left to the component for the reason the whole
     *  file exists: a chart that re-bucketed these samples itself would be a
     *  second implementation of the same statistic, free to drift from the
     *  median printed beside it. */
    histogram: DwellHistogramBin[];
}

export interface DamageFunnel {
    reported: number;
    repaired: number;
    scrapped: number;
    stillOpen: number;
    resolution: ResolutionStats;
    repeatOffenders: RepeatOffender[];
}

export interface StaffRow {
    /** A real user id, or UNKNOWN_USER_KEY when the transaction carried none. */
    userId: string;
    /** Resolved full name, a short handle for an orphan id, or the sentinel.
     *  Never a raw UUID. */
    name: string;
    total: number;
    /** All five action types are always present, so a stacked bar chart does not
     *  have to null-check a segment. */
    byAction: Record<ActionType, number>;
    lastActiveISO: string | null;
}

export interface HeatCell {
    /** 0 = Sunday, matching Date.getDay(). */
    day: number;
    /** 0-23, browser-local. */
    hour: number;
    count: number;
}

export interface OverdueHistogramBin {
    /** One of DAY_BUCKET_KEYS. Typed as string per the agreed return shape; the
     *  caller labels it from the same dictionary it uses for the dwell chart. */
    bucket: string;
    count: number;
    /** True when *every* pallet in this band is past the configured threshold. */
    isBreach: boolean;
}

export interface DormantPallet {
    palletId: string;
    status: PalletStatus;
    location: string;
    daysIdle: number;
}

export interface LocationRow {
    /** A department name, or OTHER_LOCATION_KEY for the folded tail. */
    name: string;
    count: number;
    overdue: number;
    damaged: number;
}

export interface FleetStats {
    /** The WORKING fleet: scrapped pallets have left it. */
    total: number;
    available: number;
    in_use: number;
    damaged: number;
    scrapped: number;
    /** Derived, not stored. */
    overdue: number;
    /** in_use / total * 100, where total already excludes scrapped. */
    utilisationPct: number;
    byLocation: LocationRow[];
}

export interface AgingStats {
    overdueHistogram: OverdueHistogramBin[];
    dormant: DormantPallet[];
}

export interface DashboardAnalytics {
    trend: TrendPoint[];
    dwell: DwellStats;
    damage: DamageFunnel;
    /** Descending by total. */
    staff: StaffRow[];
    /** Always exactly 168 cells, day-major. */
    heat: HeatCell[];
    heatMax: number;
    aging: AgingStats;
    fleet: FleetStats;
    /** Distinct users with at least one transaction inside the range. */
    activeStaffCount: number;
    /** Headcount of known users, i.e. the denominator for the one above.
     *  "8 active" reads as good news whether the team is nine people or ninety,
     *  so the caption needs both halves and both must come from here. */
    totalStaffCount: number;
}

// --- SMALL HELPERS ---------------------------------------------------------

const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n));

/**
 * Linear-interpolated quantile over an already-sorted ascending array.
 *
 * Interpolating rather than picking the nearest element matters at these sample
 * sizes: with 8 completed trips a nearest-rank p90 is just "the 8th value", so
 * the headline number jumps discontinuously every time one pallet comes back.
 */
const quantile = (sortedAsc: number[], q: number): number => {
    if (sortedAsc.length === 0) return 0;
    if (sortedAsc.length === 1) return sortedAsc[0];
    const pos = (sortedAsc.length - 1) * q;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    if (lo === hi) return sortedAsc[lo];
    return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (pos - lo);
};

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** Which of the six day-bands a whole-day count falls into. */
const dayBucketIndex = (days: number): number => {
    const d = days < 0 ? 0 : days;
    for (let i = 0; i < DAY_BUCKET_MAX.length; i++) {
        if (d <= DAY_BUCKET_MAX[i]) return i;
    }
    return DAY_BUCKET_MAX.length - 1;
};

/**
 * Bucket key for a moment in time, in BROWSER-LOCAL time.
 *
 * Local, not UTC, and consistently so. `timestamp` is stored UTC, but this is a
 * Thai warehouse (UTC+7 with no DST): a shift that runs 08:00-17:00 local spans
 * 01:00-10:00 UTC, so a UTC hour-of-day heatmap shows peak activity in the
 * middle of the night and a UTC day boundary cuts the working day in half.
 *
 * The trap this avoids is MIXING the two. `toISOString().slice(0,10)` is a UTC
 * date string; `getHours()` and `getDay()` are local. Bucketing days by the
 * former while reading hours from the latter puts every event between 00:00 and
 * 07:00 ICT on the wrong calendar day -- an off-by-one that only shows up in the
 * early-morning shift and looks like noise rather than a bug. Everything below
 * reads local accessors and nothing calls toISOString() for a bucket key.
 *
 * The function is built once per invocation rather than switching per row, so
 * the branch is paid O(1) times instead of O(T).
 */
const makeBucketKeyFn = (bucket: TrendBucket): ((d: Date) => string) => {
    switch (bucket) {
        case 'day':
            return (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
        case 'week':
            // Weeks start on Sunday, matching the getDay()-based grouping the
            // old useTrendChartData used, so a report saved before this rewrite
            // and one saved after agree about where a week begins.
            return (d) => {
                const s = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
                return `${s.getFullYear()}-${pad2(s.getMonth() + 1)}-${pad2(s.getDate())}`;
            };
        case 'month':
            return (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
    }
};

/** First instant of the bucket containing `d`, in local time. */
const startOfBucket = (d: Date, bucket: TrendBucket): Date => {
    switch (bucket) {
        case 'day':
            return new Date(d.getFullYear(), d.getMonth(), d.getDate());
        case 'week':
            return new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
        case 'month':
            return new Date(d.getFullYear(), d.getMonth(), 1);
    }
};

/**
 * Start of the bucket after `start`.
 *
 * Built from local calendar components rather than by adding 86400000ms.
 * Thailand has no DST so the two agree today, but the browser is whatever the
 * admin's laptop is set to, and a fixed-millisecond step drifts an hour across
 * a DST boundary until it eventually skips or repeats a bucket. The Date
 * constructor normalises overflow (month 12 -> January of the next year, day 32
 * -> the 1st), so no wrap-around arithmetic is needed here.
 */
const nextBucketStart = (start: Date, bucket: TrendBucket): Date => {
    switch (bucket) {
        case 'day':
            return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
        case 'week':
            return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
        case 'month':
            return new Date(start.getFullYear(), start.getMonth() + 1, 1);
    }
};

/**
 * Axis text for a bucket. Called once per bucket (at most a few dozen times),
 * never per transaction -- toLocaleDateString is expensive enough that the old
 * implementation's per-element Date churn was a measurable part of its cost.
 */
const bucketLabel = (start: Date, bucket: TrendBucket): string => {
    switch (bucket) {
        case 'day':
        case 'week':
            // A week is labelled by the date it starts on. Same format as a day
            // deliberately: the axis is already unambiguous from its density,
            // and "21 Jul" reads better in a narrow column than a "21-27 Jul"
            // range that has to wrap or be truncated.
            return start.toLocaleDateString(DATE_LOCALE, { day: '2-digit', month: 'short' });
        case 'month':
            // The year is included because a 12-month window always straddles a
            // year boundary, and two bars both labelled "Jul" are unreadable.
            // '2-digit' keeps it short; en-GB renders it CE, not พ.ศ.
            return start.toLocaleDateString(DATE_LOCALE, { month: 'short', year: '2-digit' });
    }
};

const emptyActionCounts = (): Record<ActionType, number> => ({
    check_out: 0,
    check_in: 0,
    report_damage: 0,
    repair: 0,
    scrap: 0,
});

/**
 * A display name that is never a raw UUID.
 *
 * Three cases, all of which occur in the live data: the user still exists; the
 * user was deleted and left an orphan id on its history; the transaction was
 * written with no user at all (the legacy anonymous repair path did this before
 * scrapPallet() started refusing it).
 */
const resolveStaffName = (userId: string, byId: Map<string, string>): string => {
    if (!userId) return UNKNOWN_USER_KEY;
    const known = byId.get(userId);
    if (known && known.trim()) return known;
    return `#${userId.slice(0, ORPHAN_ID_LENGTH)}`;
};

// --- THE ENGINE ------------------------------------------------------------

export const computeDashboardAnalytics = (input: AnalyticsInput): DashboardAnalytics => {
    const { transactions, pallets, users, overdueDays, rangeStart, rangeEnd, bucket, now } = input;

    const rangeStartMs = rangeStart.getTime();
    const rangeEndMs = rangeEnd.getTime();
    const nowMs = now.getTime();

    const userNameById = new Map<string, string>();
    for (const u of users) userNameById.set(u.id, u.full_name);

    const keyOf = makeBucketKeyFn(bucket);

    // --- PRE-ALLOCATION ----------------------------------------------------
    // Everything the loops write into is built before they start, so the hot
    // paths are pure increments against a known index. This is the structural
    // difference from useTrendChartData: it derived the bucket set per pass and
    // rescanned the data once per bucket; here the bucket set is built once and
    // each row finds its slot through an O(1) Map lookup.

    const trend: TrendPoint[] = [];
    const trendIndex = new Map<string, number>();
    {
        let cursor = startOfBucket(rangeStart, bucket);
        for (let guard = 0; guard < MAX_TREND_BUCKETS; guard++) {
            if (cursor.getTime() > rangeEndMs) break;
            const key = keyOf(cursor);
            trendIndex.set(key, trend.length);
            trend.push({
                key,
                label: bucketLabel(cursor, bucket),
                check_out: 0,
                check_in: 0,
                report_damage: 0,
                repair: 0,
                scrap: 0,
                acquisition: 0,
            });
            cursor = nextBucketStart(cursor, bucket);
        }
    }

    // 7 days x 24 hours, day-major, allocated flat and indexed arithmetically.
    // Always exactly 168 cells whatever the data contains: a heatmap grid with
    // holes in it is not a grid, and the renderer should never have to ask
    // whether Tuesday 3am exists.
    const heat: HeatCell[] = new Array(168);
    for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) heat[d * 24 + h] = { day: d, hour: h, count: 0 };
    }

    // --- PASS 1: ONE FORWARD SCAN OVER TRANSACTIONS ------------------------

    /**
     * Open check-outs, keyed by pallet. THE SUBTLE ONE.
     *
     * Closed by `check_in` OR `repair` OR `scrap` -- not by `check_in` alone.
     * resolveDamage() in services/transactionService.ts sets the pallet to
     * status 'available', current_location 'Warehouse', last_checkout_date null
     * and logs a **`repair`** transaction; it never writes a `check_in`.
     * scrapPallet() does the same with a `scrap`. So a perfectly ordinary pallet
     * life is `check_out -> report_damage -> repair` with no check_in anywhere
     * in it, and the pallet is demonstrably back in the warehouse at the end.
     *
     * Closing only on `check_in` therefore leaks: that pallet's entry sits in
     * this map forever, gets no dwell sample, and -- worse -- is still open when
     * the pallet is checked out again weeks later, at which point the new
     * check_out overwrites the stale timestamp and the eventual check_in
     * measures a trip that never happened. Every damaged pallet in the fleet
     * would either vanish from the histogram or contribute one absurd multi-week
     * sample, dragging the median long in exactly the direction that makes the
     * number look alarming.
     */
    const openCheckout = new Map<string, number>();

    /**
     * Open damage reports, keyed by pallet, carrying whether the report itself
     * fell inside the display range. Closed by `repair` or `scrap` -- the only
     * two transitions out of 'damaged' that exist. The `inRange` flag is what
     * makes the funnel a genuine cohort; see the counters below.
     */
    const openDamage = new Map<string, { at: number; inRange: boolean }>();

    interface PalletTally {
        damage: number;
        repair: number;
        scrapped: boolean;
        last: string | null;
    }
    const perPallet = new Map<string, PalletTally>();

    const perUser = new Map<string, StaffRow>();

    const dwellHours: number[] = [];
    const resolutionHours: number[] = [];

    // Funnel counters. `reported` counts damage reports raised inside the range;
    // `repaired` and `scrapped` count how many of *those same reports* were
    // subsequently closed each way. They are deliberately NOT the raw number of
    // repair/scrap events in the window: a funnel whose stages come from
    // different cohorts cannot be read as a funnel, because "repaired" could
    // exceed "reported" simply by clearing a backlog. The raw per-period event
    // counts are not lost -- they are the `repair` and `scrap` series on the
    // trend chart, which is where a rate belongs.
    let damageReported = 0;
    let damageRepaired = 0;
    let damageScrapped = 0;

    for (const tx of transactions) {
        const ts = new Date(tx.timestamp);
        const ms = ts.getTime();
        if (Number.isNaN(ms)) continue;

        const inRange = ms >= rangeStartMs && ms <= rangeEndMs;
        const palletId = tx.pallet_id;
        const action = tx.action_type;

        // -- State machines. These run on EVERY row, including rows from before
        // rangeStart. That is the entire point of the caller's lookback window:
        // a pallet checked out 40 days ago and returned yesterday has its
        // opening event outside a 30-day range, and if the scan started at
        // rangeStart the pair would never form. The pair is *counted* only when
        // its closing event lands in range (below), so the extra history widens
        // the histogram's coverage without inflating any of the range totals.
        if (action === 'check_out') {
            openCheckout.set(palletId, ms);
        } else if (action === 'check_in' || action === 'repair' || action === 'scrap') {
            const openedAt = openCheckout.get(palletId);
            if (openedAt !== undefined) {
                openCheckout.delete(palletId);
                // Guard against a clock-skewed row producing a negative trip.
                if (inRange && ms >= openedAt) dwellHours.push((ms - openedAt) / MS_PER_HOUR);
            }
        }

        if (action === 'report_damage') {
            openDamage.set(palletId, { at: ms, inRange });
            if (inRange) damageReported++;
        } else if (action === 'repair' || action === 'scrap') {
            const open = openDamage.get(palletId);
            if (open !== undefined) {
                openDamage.delete(palletId);
                if (open.inRange) {
                    if (action === 'repair') damageRepaired++;
                    else damageScrapped++;
                    if (ms >= open.at) resolutionHours.push((ms - open.at) / MS_PER_HOUR);
                }
            }
        }

        // -- Everything from here is range-scoped: the lookback rows exist only
        // to feed the two state machines above and must not reach any total.
        if (!inRange) continue;

        // Trend. The `inRange` gate above is load-bearing for weekly and monthly
        // buckets: the bucket containing rangeStart also contains the days
        // *before* it, so a lookback row can hash to a real bucket key. Gating
        // means an unaligned rangeStart yields a short first bar rather than one
        // silently padded with history from outside the window -- the safe
        // failure. (The hook aligns rangeStart to a bucket boundary so that
        // first bar is whole in practice.)
        const slot = trendIndex.get(keyOf(ts));
        if (slot !== undefined) trend[slot][action]++;

        // Heat. Local day-of-week and hour-of-day, per the note on
        // makeBucketKeyFn: UTC hours describe a warehouse nobody works in.
        heat[ts.getDay() * 24 + ts.getHours()].count++;

        // Per-pallet tally for repeat offenders.
        let tally = perPallet.get(palletId);
        if (!tally) {
            tally = { damage: 0, repair: 0, scrapped: false, last: null };
            perPallet.set(palletId, tally);
        }
        if (action === 'report_damage') tally.damage++;
        else if (action === 'repair') tally.repair++;
        else if (action === 'scrap') tally.scrapped = true;
        // Transactions arrive ascending, so the last write wins without a compare.
        tally.last = tx.timestamp;

        // Per-user tally. The id is normalised to the sentinel up front so every
        // downstream consumer sees a non-empty key, and orphan UUIDs are turned
        // into a short handle exactly once per user rather than once per row.
        const userId = tx.user_id || UNKNOWN_USER_KEY;
        let row = perUser.get(userId);
        if (!row) {
            row = {
                userId,
                name: userId === UNKNOWN_USER_KEY ? UNKNOWN_USER_KEY : resolveStaffName(tx.user_id, userNameById),
                total: 0,
                byAction: emptyActionCounts(),
                lastActiveISO: null,
            };
            perUser.set(userId, row);
        }
        row.total++;
        row.byAction[action]++;
        row.lastActiveISO = tx.timestamp;
    }

    // --- PASS 2: ONE SCAN OVER PALLETS -------------------------------------
    // Fleet counts, the derived overdue figure, the aging histogram, dormancy
    // and the acquisition series all come out of this single loop.

    let total = 0;
    let available = 0;
    let inUse = 0;
    let damaged = 0;
    let scrapped = 0;
    let overdue = 0;

    const overdueBuckets = new Array<number>(DAY_BUCKET_KEYS.length).fill(0);
    const locations = new Map<string, LocationRow>();
    const dormant: DormantPallet[] = [];

    for (const p of pallets) {
        // Acquisition is fleet growth rather than an action, so it is the one
        // trend series sourced from the pallet table. Same bucketing function,
        // same range gate.
        if (p.created_at) {
            const created = new Date(p.created_at);
            const createdMs = created.getTime();
            if (!Number.isNaN(createdMs) && createdMs >= rangeStartMs && createdMs <= rangeEndMs) {
                const slot = trendIndex.get(keyOf(created));
                if (slot !== undefined) trend[slot].acquisition++;
            }
        }

        switch (p.status) {
            case 'available': available++; break;
            case 'in_use': inUse++; break;
            case 'damaged': damaged++; break;
            case 'scrapped': scrapped++; break;
        }

        // `total` is the WORKING fleet. Scrapped pallets are excluded here and
        // from the utilisation divisor below, which is what the entire rest of
        // the codebase already does: DashboardHome.tsx:36, LocationRiskMatrix
        // .tsx:16, LocationInventoryChart.tsx:13, LocationView.tsx, the 'all'
        // branch of useInventoryFilters.ts, and the Supabase edge function that
        // builds the LINE report. Counting them would overstate the asset base,
        // deflate utilisation, and -- the real damage -- make this dashboard
        // quietly disagree with every other screen in the app about how many
        // pallets exist. A retired asset is not idle capacity.
        if (p.status === 'scrapped') continue;
        total++;

        // Overdue is DERIVED, not a column: there is no `is_overdue` in the
        // database because the threshold is a setting an admin can change, and
        // a stored flag would go stale the moment they did. Same arithmetic as
        // DashboardHome.tsx:43-47, but against the injected `now`.
        let daysOut = -1;
        if (p.status === 'in_use' && p.last_checkout_date) {
            const outMs = new Date(p.last_checkout_date).getTime();
            if (!Number.isNaN(outMs)) {
                daysOut = (nowMs - outMs) / MS_PER_DAY;
                if (daysOut > overdueDays) overdue++;
                // Every checked-out pallet enters the histogram, not just the
                // late ones: the shape of the healthy part of the distribution
                // is what makes the tail legible.
                overdueBuckets[dayBucketIndex(Math.floor(daysOut))]++;
            }
        }

        // Dormancy. `last_transaction_date` is the pallet's own high-water mark,
        // maintained by every write path; the fallbacks cover rows created
        // before that column was populated so an old pallet does not read as
        // freshly touched.
        const lastTouch = p.last_transaction_date || p.last_checkout_date || p.created_at;
        if (lastTouch) {
            const touchMs = new Date(lastTouch).getTime();
            if (!Number.isNaN(touchMs)) {
                const daysIdle = (nowMs - touchMs) / MS_PER_DAY;
                if (daysIdle >= DORMANT_AFTER_DAYS) {
                    dormant.push({
                        palletId: p.pallet_id,
                        status: p.status,
                        location: p.current_location,
                        daysIdle: round1(daysIdle),
                    });
                }
            }
        }

        // Per-location holdings. 'Warehouse' is skipped for the reason given on
        // the constant: it means "not out anywhere", so it is not a location.
        if (p.current_location && p.current_location !== WAREHOUSE) {
            let loc = locations.get(p.current_location);
            if (!loc) {
                loc = { name: p.current_location, count: 0, overdue: 0, damaged: 0 };
                locations.set(p.current_location, loc);
            }
            loc.count++;
            if (p.status === 'damaged') loc.damaged++;
            if (daysOut > overdueDays) loc.overdue++;
        }
    }

    // --- ASSEMBLY: THE FOUR SMALL SORTS ------------------------------------

    dwellHours.sort((a, b) => a - b);
    resolutionHours.sort((a, b) => a - b);

    // Both histograms always emit all six bands, in order, even when every count
    // is zero -- see DAY_BUCKET_KEYS. Built by mapping the key list rather than
    // by discovering keys from the data, which is what guarantees it.
    const dwellHistogram: DwellHistogramBin[] = DAY_BUCKET_KEYS.map((key) => ({ bucket: key, count: 0 }));
    for (const hours of dwellHours) dwellHistogram[dayBucketIndex(Math.floor(hours / 24))].count++;

    const resolutionHistogram: DwellHistogramBin[] = DAY_BUCKET_KEYS.map((key) => ({ bucket: key, count: 0 }));
    for (const hours of resolutionHours) resolutionHistogram[dayBucketIndex(Math.floor(hours / 24))].count++;

    const staff = Array.from(perUser.values()).sort(
        // Name is the tiebreaker so the bar order is stable between refetches.
        // Without it two staff on the same count can swap places on a realtime
        // refresh, which reads as the chart flickering for no reason.
        (a, b) => b.total - a.total || a.name.localeCompare(b.name),
    );

    const repeatOffenders: RepeatOffender[] = Array.from(perPallet.entries())
        .filter(([, t]) => t.damage >= REPEAT_OFFENDER_MIN_DAMAGE)
        .map(([palletId, t]) => ({
            palletId,
            damageCount: t.damage,
            repairCount: t.repair,
            scrapped: t.scrapped,
            lastEventISO: t.last,
        }))
        .sort((a, b) => b.damageCount - a.damageCount || a.palletId.localeCompare(b.palletId))
        .slice(0, MAX_REPEAT_OFFENDERS);

    dormant.sort((a, b) => b.daysIdle - a.daysIdle);

    // Location folding. Sorted by holdings, the head kept as-is and the tail
    // summed into one sentinel row. This is what stops a renamed department
    // from spraying near-empty bars across the chart -- see OTHER_LOCATION_KEY.
    // The tail is summed rather than dropped so the bars still add up to the
    // number of pallets that are out.
    const sortedLocations = Array.from(locations.values()).sort(
        (a, b) => b.count - a.count || a.name.localeCompare(b.name),
    );
    const byLocation: LocationRow[] = sortedLocations.slice(0, MAX_LOCATION_SERIES);
    if (sortedLocations.length > MAX_LOCATION_SERIES) {
        const tail: LocationRow = { name: OTHER_LOCATION_KEY, count: 0, overdue: 0, damaged: 0 };
        for (let i = MAX_LOCATION_SERIES; i < sortedLocations.length; i++) {
            tail.count += sortedLocations[i].count;
            tail.overdue += sortedLocations[i].overdue;
            tail.damaged += sortedLocations[i].damaged;
        }
        byLocation.push(tail);
    }

    const overdueHistogram: OverdueHistogramBin[] = DAY_BUCKET_KEYS.map((key, i) => ({
        bucket: key,
        count: overdueBuckets[i],
        // A band is flagged only when its LOWER bound already exceeds the
        // threshold -- i.e. every pallet in it is late, not merely some of them.
        // A half-breaching bar rendered red would overstate the problem, and the
        // exact number is available either way as fleet.overdue.
        isBreach: DAY_BUCKET_MIN[i] > overdueDays,
    }));

    let heatMax = 0;
    for (const cell of heat) if (cell.count > heatMax) heatMax = cell.count;

    return {
        trend,
        dwell: {
            samples: dwellHours.length,
            medianHours: round1(quantile(dwellHours, 0.5)),
            p90Hours: round1(quantile(dwellHours, 0.9)),
            histogram: dwellHistogram,
            // Open pairs observed within the scanned history only. A pallet
            // checked out before the lookback window began has no opening event
            // here, so this is a lower bound and NOT interchangeable with
            // fleet.in_use, which is exact because it reads the pallet rows.
            openCount: openCheckout.size,
        },
        damage: {
            reported: damageReported,
            repaired: damageRepaired,
            scrapped: damageScrapped,
            // The cohort remainder, by construction: reports raised in range
            // that had not been closed by the end of the scan. Never negative,
            // because both closers only increment for reports counted here.
            stillOpen: damageReported - damageRepaired - damageScrapped,
            resolution: {
                samples: resolutionHours.length,
                medianHours: round1(quantile(resolutionHours, 0.5)),
                p90Hours: round1(quantile(resolutionHours, 0.9)),
                histogram: resolutionHistogram,
            },
            repeatOffenders,
        },
        staff,
        heat,
        heatMax,
        aging: {
            overdueHistogram,
            dormant: dormant.slice(0, MAX_DORMANT_ROWS),
        },
        fleet: {
            total,
            available,
            in_use: inUse,
            damaged,
            scrapped,
            overdue,
            // Divisor already excludes scrapped. One decimal place, matching the
            // .toFixed(1) the old DashboardHome used, so the redesigned tile
            // shows the same string the current one does.
            utilisationPct: total > 0 ? round1((inUse / total) * 100) : 0,
            byLocation,
        },
        activeStaffCount: perUser.size,
        totalStaffCount: users.length,
    };
};
