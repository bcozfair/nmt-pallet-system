import type {
    DwellBucketKey,
    DwellHistogramBin,
    OverdueHistogramBin,
} from '../../../services/analytics/dashboardAnalytics';

// The six day-bands, and the two ways of turning a reducer histogram into rows
// a chart can draw.
//
// Lifted out of LifecycleSection.tsx, where it was module-private, when the
// printable report grew a second set of charts over the same three histograms
// (dwell time, overdue ageing, time to resolve). Copying it would have put the
// BAND ORDER in two places, and the order is the whole contract: two readings of
// a chart whose categories appear, disappear or swap places cannot be compared,
// which is the defect rule 6 in LifecycleSection.tsx exists to prevent.
//
// Kept as a local list rather than imported from the reducer because the reducer
// keeps its key array private -- and because the order is what everything here
// depends on, so it should be visible at the point of use.
export const BAND_KEYS: readonly DwellBucketKey[] = [
    '0_1d',
    '2_3d',
    '4_7d',
    '8_14d',
    '15_30d',
    '30d_plus',
];

export type BandLabelKey = 'b0_1' | 'b2_3' | 'b4_7' | 'b8_14' | 'b15_30' | 'b30plus';

// One lookup serves all three charts. `agingOverdue` and `resolve` repeat the
// same six keys as `dwell` on purpose (the dictionary says so where they are
// defined), so a single map from reducer key -> dictionary key covers them all.
export const BAND_LABEL_KEY: Record<DwellBucketKey, BandLabelKey> = {
    '0_1d': 'b0_1',
    '2_3d': 'b2_3',
    '4_7d': 'b4_7',
    '8_14d': 'b8_14',
    '15_30d': 'b15_30',
    '30d_plus': 'b30plus',
};

/** Any of the three dictionary groups; all carry the same six band labels. */
export type BandLabels = Record<BandLabelKey, string>;

export interface BandRow {
    key: DwellBucketKey;
    label: string;
    count: number;
    /** Only the overdue histogram has a breach concept; the others are always false. */
    isBreach: boolean;
}

// Inclusive upper bound of each band in whole days -- the same edges as
// DAY_BUCKET_MAX in services/analytics/dashboardAnalytics.ts. Duplicated (not
// imported: the reducer keeps it private) for exactly one job, placing a median
// marker in the band the reducer would have counted it into. If those edges ever
// move, this list moves with them.
const BAND_MAX_DAYS: readonly number[] = [1, 3, 7, 14, 30, Infinity];

export const bandIndexForDays = (days: number): number => {
    const d = days < 0 ? 0 : days;
    for (let i = 0; i < BAND_MAX_DAYS.length; i++) {
        if (d <= BAND_MAX_DAYS[i]) return i;
    }
    return BAND_MAX_DAYS.length - 1;
};

// Built from BAND_KEYS, never from the histogram: that is what guarantees six
// bands in a stable order even if a future reducer emits a subset.
export const dwellBands = (
    histogram: readonly DwellHistogramBin[],
    labels: BandLabels,
): BandRow[] =>
    BAND_KEYS.map((key) => ({
        key,
        label: labels[BAND_LABEL_KEY[key]],
        count: histogram.find((bin) => bin.bucket === key)?.count ?? 0,
        isBreach: false,
    }));

export const overdueBands = (
    histogram: readonly OverdueHistogramBin[],
    labels: BandLabels,
): BandRow[] =>
    BAND_KEYS.map((key) => {
        const bin = histogram.find((b) => b.bucket === key);
        return {
            key,
            label: labels[BAND_LABEL_KEY[key]],
            count: bin?.count ?? 0,
            isBreach: bin?.isBreach ?? false,
        };
    });

export const bandTotal = (rows: readonly BandRow[]): number =>
    rows.reduce((sum, row) => sum + row.count, 0);
