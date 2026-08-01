/**
 * Cuts a list into pages, where the first page holds fewer than the rest.
 *
 * The asymmetry is the whole point. Page 1 of a report carries a masthead --
 * title, timestamp, the filters the rows were produced under, the summary band
 * -- and every page after it carries a one-line running head instead. Paginating
 * against a single capacity means either wasting a quarter of every later page
 * or overflowing the first one, and on a document whose pages are clipped, the
 * second of those loses rows without saying so.
 *
 * Always returns at least one page. An empty result set still prints a sheet:
 * "no rows matched these filters" is a finding, and a report that prints nothing
 * at all is indistinguishable from a report that failed.
 *
 * The capacities are floored at 1 rather than trusted. They are computed from a
 * page height divided by a row height, and a caller that gets that arithmetic
 * wrong would otherwise hand in 0 and spin here forever -- a frozen tab is a
 * much worse way to find out than a report with one row per page.
 */
export const chunkPages = <T>(
    rows: readonly T[],
    firstCapacity: number,
    restCapacity: number,
): T[][] => {
    const first = Math.max(1, Math.floor(firstCapacity));
    const rest = Math.max(1, Math.floor(restCapacity));

    if (rows.length === 0) return [[]];

    const pages: T[][] = [];
    let cursor = 0;
    while (cursor < rows.length) {
        const capacity = pages.length === 0 ? first : rest;
        pages.push(rows.slice(cursor, cursor + capacity));
        cursor += capacity;
    }
    return pages;
};
