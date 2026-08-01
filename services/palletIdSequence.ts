// Running pallet numbers.
//
// A pure module: no Supabase, no DOM, no dictionary. It is given the ids that
// already exist and answers what the next one should be. That is the whole
// reason it is a file of its own rather than three helpers inside
// AddPalletModal -- the interesting behaviour here is entirely edge cases (a
// fleet with no pallets at all, ids that do not fit the pattern, widths that
// disagree, a number that outgrows its padding), and none of them can be
// exercised through a modal without opening it and typing.
//
// ---------------------------------------------------------------------------
// IDS ARE NEVER REUSED.
//
// Deleting P010 does not free P010. The next id is always one past the highest
// number seen, so a fleet that has been through P023 continues at P024 even if
// half of those rows are gone.
//
// That is not tidiness -- it is what the sticker on the physical pallet costs.
// The id is printed into a QR code and stuck to a wooden pallet in a warehouse.
// Handing a retired pallet's number to a new one merges two pallets' histories
// under one id in every report and every scan from then on, and there is no way
// to tell afterwards which rows belonged to which piece of wood.
// ---------------------------------------------------------------------------

export interface ParsedPalletId {
    /** The letters before the digits. May be empty. */
    prefix: string;
    /** The trailing digits as a number. */
    number: number;
    /** How many digits were written, i.e. how far the number is zero-padded. */
    width: number;
}

// Letters then digits, anchored at both ends.
//
// `[A-Za-z]*` and not `.*?` on purpose. A permissive prefix would parse
// 'SPECIAL-01' as prefix 'SPECIAL-' plus 1 -- and then palletIdRange would
// happily generate SPECIAL-02, SPECIAL-03 from an id that was clearly written by
// hand as a one-off. Restricting the prefix to letters is what makes "this id
// has no sequence to continue" a state the caller can detect and act on, which
// is what the quantity lock in AddPalletModal is built from.
const PALLET_ID_PATTERN = /^([A-Za-z]*)(\d+)$/;

/** What a brand-new database gets. */
const DEFAULT_PREFIX = 'P';
const DEFAULT_WIDTH = 3;

/**
 * Splits an id into its prefix, its number and its zero-padding width.
 *
 * Returns null for anything that is not letters-then-digits -- 'TEST' (no
 * number to continue), 'SPECIAL-01' (a separator), '' (nothing at all).
 */
export const parsePalletId = (id: string): ParsedPalletId | null => {
    const match = PALLET_ID_PATTERN.exec(id.trim());
    if (!match) return null;

    const [, prefix, digits] = match;
    return { prefix, number: Number(digits), width: digits.length };
};

/**
 * Formats a number back into an id, padded to `width`.
 *
 * A number too big for its width is NOT truncated and NOT reset: P999 is
 * followed by P1000. The id gets one character longer, which is ugly and
 * correct -- the alternatives are refusing to create a pallet or wrapping round
 * to P000, and the second one collides with an id that is already on a sticker.
 */
const formatPalletId = (prefix: string, value: number, width: number): string =>
    `${prefix}${String(value).padStart(width, '0')}`;

/**
 * The id a new pallet should get, given every id already in the database.
 *
 * Ids that do not parse are skipped rather than rejected: a fleet is allowed to
 * contain hand-written oddities, and one of them must not stop the counter.
 *
 * --- CHOOSING THE PREFIX ---
 *
 * Not "the highest number in the whole list". Ids are grouped by prefix, and the
 * group with the MOST MEMBERS wins; ties are broken by whichever group reaches
 * the higher number.
 *
 * The straightforward rule fails on a realistic fleet. Given P001, P002 and a
 * single stray X900 -- a pallet somebody labelled by hand once -- taking the
 * global maximum makes X the prefix, and every pallet created from then on is
 * X901, X902, ... The one oddity would have silently renamed the fleet. Counting
 * members instead asks "what are these pallets actually called", which is the
 * question being answered.
 *
 * --- CHOOSING THE WIDTH ---
 *
 * The width of the entry holding the highest number, not the widest or the most
 * common. Given P9 and P010, the counter is at 10, so 'P011' continues what is
 * visibly the current convention rather than reviving the 'P11' the oldest row
 * used. Ties on the number itself go to the wider entry, so the result is
 * deterministic when the same number is written two ways.
 */
export const nextPalletId = (existingIds: string[]): string => {
    const parsed = existingIds
        .map(parsePalletId)
        .filter((p): p is ParsedPalletId => p !== null);

    // An empty fleet, or one where nothing follows the pattern at all.
    if (parsed.length === 0) return formatPalletId(DEFAULT_PREFIX, 1, DEFAULT_WIDTH);

    const groups = new Map<string, ParsedPalletId[]>();
    for (const entry of parsed) {
        const group = groups.get(entry.prefix);
        if (group) group.push(entry);
        else groups.set(entry.prefix, [entry]);
    }

    let winner: ParsedPalletId[] | null = null;
    let winnerMax = -1;
    for (const group of groups.values()) {
        const max = Math.max(...group.map((e) => e.number));
        if (
            winner === null ||
            group.length > winner.length ||
            (group.length === winner.length && max > winnerMax)
        ) {
            winner = group;
            winnerMax = max;
        }
    }

    // Non-null by construction: `parsed` is non-empty, so at least one group
    // exists and the loop above assigns on its first iteration.
    const group = winner!;
    const highest = group.reduce((best, entry) => {
        if (entry.number > best.number) return entry;
        // Same number written two ways ('P10' and 'P010') -- take the wider, so
        // the answer does not depend on the order the rows came back in.
        if (entry.number === best.number && entry.width > best.width) return entry;
        return best;
    });

    return formatPalletId(highest.prefix, highest.number + 1, highest.width);
};

/**
 * `count` consecutive ids starting at `startId`.
 *
 * Used twice per keystroke in AddPalletModal: once to show the reader the range
 * they are about to create, and once to build the rows that are actually
 * inserted. The same function for both, so the preview cannot promise ids the
 * insert does not produce.
 *
 * Throws when the start id has no number to count from. The modal never lets
 * this happen -- it locks the quantity to 1 when parsePalletId returns null --
 * so reaching it means a caller skipped that check, and a thrown error is the
 * honest answer. Returning [startId] instead would quietly create one pallet
 * where twenty were asked for.
 */
export const palletIdRange = (startId: string, count: number): string[] => {
    const parsed = parsePalletId(startId);
    if (!parsed) {
        throw new Error(`[palletIdRange] "${startId}" has no numeric suffix to count from.`);
    }
    if (!Number.isInteger(count) || count < 1) {
        throw new Error(`[palletIdRange] count must be a positive integer, got ${count}.`);
    }

    return Array.from({ length: count }, (_, i) =>
        formatPalletId(parsed.prefix, parsed.number + i, parsed.width),
    );
};
