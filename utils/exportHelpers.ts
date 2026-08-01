
import { fetchPallets } from '../services/palletService';
import { fetchUsers } from '../services/userService';
import { fetchTransactions } from '../services/transactionService';
import { CSV_EVIDENCE_URL_TTL_SECONDS, getEvidenceSignedUrlMap } from '../services/storageService';
import { ActionType, Pallet, Transaction } from '../types';
// formatDate/formatDateTime from AdminHelpers are deliberately NOT imported.
// They are the SCREEN's formats -- `21-Jul-2026`, and '-' for a missing value --
// and neither belongs in a data file. See formatCsvDate and CSV_EMPTY below.
import { formatDuration, palletStatusLabel } from '../components/admin/common/AdminHelpers';
import { toast } from '../services/toast';
import { dict, getLang } from '../services/i18n';
import { describeAppError } from '../services/appError';
import { OTHER_LOCATION_KEY, UNKNOWN_USER_KEY } from '../services/analytics/dashboardAnalytics';
import type { DashboardAnalytics, DwellBucketKey } from '../services/analytics/dashboardAnalytics';
import type { DashboardRange } from '../hooks/dashboard/useDashboardData';



// U+FEFF. Excel on Windows ignores the charset in a data: URI and falls back to
// the system ANSI codepage, which turns every Thai character into mojibake. A
// leading byte-order mark is the only thing that makes it read the file as
// UTF-8. Harmless for the all-ASCII case, so it is always emitted.
const UTF8_BOM = '﻿';

// Named in full rather than left as "no filter". The inventory export below
// wants the latest transaction of ANY kind per pallet -- the row that decides
// the Responsible Person and Last Action columns -- and writing that out makes
// it a visible decision instead of an omission. Typed as ActionType[] so the
// list is checked against the union in types.ts rather than being free text.
const ALL_ACTIONS: ActionType[] = ['check_out', 'check_in', 'report_damage', 'repair', 'scrap'];

// Quoting a field stops it breaking the CSV grammar; it does NOT stop Excel,
// LibreOffice and Sheets from treating the value as a formula once the parser
// has stripped the quotes. A department named `=cmd|'/c calc'!A0` or a staff
// member called `+1-800-...` is executed, not displayed -- and every string in
// these exports is free text an operator typed into the database.
//
// The fix is a leading apostrophe, which every spreadsheet reads as "the rest
// of this cell is literal text" and does not itself display. It is applied only
// to the four trigger characters, so ordinary values are untouched: a negative
// number written as a number is fine, but the same characters arriving as text
// are not, which is why the test is on the rendered string.
//
// Applied here rather than at the call sites so all three exports -- inventory,
// history and the dashboard summary -- get it, and so no two of them can render
// the same name differently.
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

/** Two digits, for hours and minutes. Also used by the dashboard summary below. */
const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * "No value", for a spreadsheet.
 *
 * ---------------------------------------------------------------------------
 * A CSV MUST NOT WRITE THE SCREEN'S '-' EMPTY MARKER.
 *
 * `formatDate` and `formatDateTime` return '-' for a missing date, and on screen
 * that is right: a table cell needs something to occupy it, and a dash reads as
 * "nothing here" at a glance. A spreadsheet already has a representation for
 * that, and it is the empty cell -- the one COUNTA skips, the one a filter's
 * "(Blanks)" option finds, the one AVERAGE leaves out. A dash is text, so it
 * gets counted, sorted and charted as a value.
 *
 * It is also visibly broken, which is how this was found. '-' matches
 * FORMULA_TRIGGER, so escapeCell prefixes it with an apostrophe to stop Excel
 * reading `-5` as arithmetic -- and Excel only HIDES a leading apostrophe on a
 * value typed into a cell, not on one parsed out of a CSV. So every one of these
 * cells arrived in the sheet reading literally `'-`.
 *
 * The guard is not the bug and stays as it is. Writing '-' into a data file was.
 * ---------------------------------------------------------------------------
 */
const CSV_EMPTY = '';

/**
 * THE date format for every file this module writes: `dd/mm/yyyy`.
 *
 * ---------------------------------------------------------------------------
 * WHY NOT formatDate() FROM AdminHelpers
 *
 * That one produces `21-Jul-2026`, and it is right for the screen: a month
 * spelled out cannot be read the wrong way round, which matters in a UI used by
 * people who write dates both ways.
 *
 * A spreadsheet cell is not a label, it is a value. `21-Jul-2026` arrives in
 * Excel as TEXT -- it sorts alphabetically (Apr before Jan), it cannot be
 * filtered by month, and a date subtraction over the column produces an error.
 * `21/07/2026` is parsed as a real date, so the column sorts, filters and
 * calculates.
 *
 * It also settles a discrepancy between the two exports. The inventory file used
 * `21-Jul-2026` and the history file used `21/07/2026` -- the same warehouse's
 * data in two shapes, so a lookup across the pair had to be reformatted by hand
 * first. One function, called by everything here, is what stops that recurring.
 * ---------------------------------------------------------------------------
 */
const formatCsvDate = (d: Date): string =>
    `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;

/** `HH:mm`, browser-local -- this is a UTC+7 warehouse and the shift times matter. */
const formatCsvTime = (d: Date): string => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

/** For the few summary cells that are one combined stamp rather than two columns. */
const formatCsvDateTime = (value: string | Date): string => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return CSV_EMPTY;
    return `${formatCsvDate(d)} ${formatCsvTime(d)}`;
};

/**
 * Splits a stored `timestamptz` into a date cell and a time cell.
 *
 * Two columns, not one combined stamp: a combined value is text to a
 * spreadsheet, so it sorts alphabetically and cannot be filtered by hour. Split,
 * the date column stays a real date and the time column answers "which shift
 * recorded this".
 *
 * Both halves are empty when there is no timestamp -- see CSV_EMPTY. What
 * matters is that they are empty rather than midnight: `new Date(null)` is the
 * epoch, so without this guard a pallet that has never been checked out would
 * report a checkout on 01/01/1970 at 07:00.
 */
const splitDateTime = (value: string | Date | null | undefined): [string, string] => {
    if (!value) return [CSV_EMPTY, CSV_EMPTY];
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return [CSV_EMPTY, CSV_EMPTY];
    return [formatCsvDate(d), formatCsvTime(d)];
};

const escapeCell = (cell: string | number | null | undefined): string => {
    const raw = (cell ?? '').toString();

    // A genuine number is never prefixed, even though "-5" trips the test
    // above. Prefixing it would land the value in the sheet as text, where it
    // sorts alphabetically and sums to zero -- breaking the spreadsheet in a
    // quieter way than the injection it was meant to prevent. `Number()` is the
    // right gate rather than `typeof cell === 'number'`, because a numeric
    // string arriving from a formatter is still a number to the reader.
    const isNumeric = raw.trim() !== '' && Number.isFinite(Number(raw));
    const safe = !isNumeric && FORMULA_TRIGGER.test(raw) ? `'${raw}` : raw;

    return `"${safe.replace(/"/g, '""')}"`;
};

export const generateCSV = (headers: string[], rows: (string | number)[][], filename: string) => {

    try {
        const csvContent = UTF8_BOM
            + headers.map(escapeCell).join(",") + "\n"
            + rows.map(e => (Array.isArray(e) ? e : [e]).map(escapeCell).join(",")).join("\n");

        // Blob + object URL rather than a data: URI. encodeURI() leaves the BOM
        // and other non-ASCII characters to be re-encoded by the browser, and
        // data: URIs are additionally capped at a couple of MB in some browsers
        // -- a full transaction history export can exceed that.
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return true;
    } catch (e) {
        console.error("CSV generation failed", e);
        return false;
    }
};

/**
 * The current state of the fleet, one row per pallet.
 *
 * ---------------------------------------------------------------------------
 * THIS IS THE ONLY INVENTORY EXPORT. There used to be a second one --
 * `handleExportFiltered` in hooks/inventory/useInventoryActions.ts -- built by
 * hand for the inventory screen's "Export List" button, because that screen
 * wanted the filtered rows and this function fetched the whole table. Everything
 * else about the two was meant to be the same, and nothing about them was:
 *
 *   * It assembled a `data:text/csv;charset=utf-8,...` URI. Excel on Windows
 *     ignores the charset in a data: URI and decodes the bytes with the system
 *     ANSI codepage, so every Thai column heading and every Thai location name
 *     arrived as mojibake. That is the bug the committee saw. generateCSV
 *     writes a Blob with the UTF-8 BOM, which is the thing that makes Excel read
 *     it as UTF-8.
 *   * It quoted cells as `"${cell}"` with no escaping, so a remark containing a
 *     double quote broke the row into the wrong number of columns.
 *   * It had no formula-injection guard, which escapeCell above exists for.
 *
 * Those three are not bugs to fix twice. `pallets` is the whole difference:
 *
 *   omitted -- fetch every pallet (the dashboard's Export Inventory CSV)
 *   passed  -- write exactly these rows (the inventory screen, already filtered)
 * ---------------------------------------------------------------------------
 */
export const exportInventoryCSV = async (pallets?: Pallet[]) => {

    // dict() throughout: this module is called from event handlers, not rendered.
    const t = dict();

    try {
        toast.info(t.csv.preparingInventory);

        // 1. Fetch all necessary data
        const [palletRows, users, transactions] = await Promise.all([
            // A caller that already has the rows on screen hands them over
            // rather than re-fetching -- and, more importantly, so that the file
            // matches what the operator is looking at. Re-fetching here would
            // silently widen a filtered export back to the whole fleet.
            pallets ? Promise.resolve(pallets) : fetchPallets(),
            fetchUsers(),
            // Pages rather than stopping at PostgREST's 1000-row ceiling. It has
            // to: the reduce below keeps only the first row it sees per pallet,
            // so a truncated fetch does not shorten the report, it silently
            // blanks the Responsible Person and Last Action columns for every
            // pallet whose latest transaction fell past the cut.
            fetchTransactions({ actions: ALL_ACTIONS })
        ]);

        // 2. Create Lookups
        const userMap = users.reduce((acc, u) => ({ ...acc, [u.id]: u.full_name }), {} as Record<string, string>);
        const latestTxMap: Record<string, typeof transactions[0]> = {};

        // Find latest transaction for each pallet to determine "Responsible Person" and "Action Details"
        // Transactions are already ordered by timestamp desc from service, but let's be safe
        transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        transactions.forEach(tx => {
            if (!latestTxMap[tx.pallet_id]) {
                latestTxMap[tx.pallet_id] = tx;
            }
        });

        // 3. Sign the evidence images.
        //
        // The column used to hold the raw `evidence_image_url` field, which is a
        // storage object name -- the damage_reports bucket is private, so that
        // string opens nothing for anybody. These are signed URLs instead, valid
        // for a week (see CSV_EVIDENCE_URL_TTL_SECONDS), so the cell is a link a
        // reader can actually click.
        //
        // Signing is one round-trip PER OBJECT, so this is the slow step of the
        // export. getEvidenceSignedUrlMap drops empty and `image_deleted` values
        // before it signs anything, which is what keeps a 500-pallet fleet with
        // 12 damage photos at 12 requests rather than 500. The
        // "preparing report" toast above is already on screen while it runs.
        const evidenceUrls = await getEvidenceSignedUrlMap(
            palletRows.map((p) => latestTxMap[p.pallet_id]?.evidence_image_url),
            CSV_EVIDENCE_URL_TTL_SECONDS,
        );

        // 4. Define Columns
        //
        // Ordered as the reader walks a pallet's life: what it is, where it is,
        // when it arrived, when it last moved, who moved it, when it went out,
        // how late it is, and the photo. Each of the three timestamps is a date
        // cell followed by its time cell -- see splitDateTime.
        const h = t.csv.header;
        const headers = [
            h.palletId,
            h.status,
            h.currentLocation,
            h.dateAdded,
            h.timeAdded,
            h.lastActivityDate,
            h.lastActivityTime,
            h.lastAction,
            h.responsiblePerson,
            h.lastCheckoutDate,
            h.lastCheckoutTime,
            h.daysOverdue,
            h.evidenceLink
        ];

        const rows = palletRows.map(p => {
            const tx = latestTxMap[p.pallet_id];
            // Empty, not '-': a pallet that has never been touched has no
            // responsible person, and an empty cell is how a spreadsheet says
            // so. See CSV_EMPTY.
            const responsiblePerson = tx ? (userMap[tx.user_id] || tx.user_id) : CSV_EMPTY;

            // Calculate Overdue
            let overdue = 0;
            if (p.status === 'in_use' && p.last_checkout_date) {
                overdue = Math.floor((new Date().getTime() - new Date(p.last_checkout_date).getTime()) / (1000 * 3600 * 24));
            }

            const [addedDate, addedTime] = splitDateTime(p.created_at);
            // The pallet row's own field first, the latest transaction as the
            // fallback -- the same precedence the column had when it was one
            // combined cell.
            const [activityDate, activityTime] = splitDateTime(p.last_transaction_date ?? tx?.timestamp);
            const [checkoutDate, checkoutTime] = splitDateTime(p.last_checkout_date);

            // Empty rather than '-' when there is no photo: '-' in a column of
            // https:// links reads as a broken link, and an empty cell is what a
            // spreadsheet's filters treat as "no value".
            const evidence = tx?.evidence_image_url
                ? (evidenceUrls[tx.evidence_image_url] ?? '')
                : '';

            return [
                p.pallet_id,
                palletStatusLabel(p.status),
                p.current_location,
                addedDate,
                addedTime,
                activityDate,
                activityTime,
                // Was tx.action_type -- the raw enum ("report_damage") in a column
                // headed "Last Action". Same table the history export uses below.
                tx ? (t.action[tx.action_type] ?? tx.action_type) : CSV_EMPTY,
                responsiblePerson,
                checkoutDate,
                checkoutTime,
                overdue > 0 ? overdue.toString() : '0',
                // Straight through escapeCell with no special handling: a signed
                // URL starts with 'h', which does not match FORMULA_TRIGGER, so
                // it is never prefixed with the apostrophe that would stop Excel
                // recognising it as a link. This is exactly why the column holds
                // a bare URL and not `=HYPERLINK(...)` -- that would have needed
                // a hole punched in the formula-injection guard.
                evidence
            ];
        });


        const d = new Date();
        const filenameDate = `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
        const filename = `nmt_current_inventory_${filenameDate}.csv`;

        generateCSV(headers, rows, filename);


        toast.success(t.csv.inventoryDone(palletRows.length));
    } catch (e: any) {
        console.error(e);
        toast.error(t.csv.exportFailed(describeAppError(e)));
    }
};

/**
 * The transaction history, one row per movement.
 *
 * ---------------------------------------------------------------------------
 * THIS IS THE ONLY TRANSACTION EXPORT. The transactions screen used to build its
 * own -- `handleExport` in TransactionView.tsx -- for exactly the reason the
 * inventory screen did: it wanted the filtered rows and this function fetched
 * the whole table. Same shape of duplication, same consequences:
 *
 *   * Its Evidence column held `tx.evidence_image_url`, a storage object name.
 *     The damage_reports bucket is private, so that string opens nothing for
 *     anyone -- it looked like data and was a dead end. Signed URLs below.
 *   * It stamped one combined `21-Jul-2026 14:30` cell where this one wrote a
 *     dd/mm/yyyy date and an HH:mm time in two columns. Two files of the same
 *     data, two date formats.
 *   * Its filename was `transactions_export_YYYY-MM-DD.csv` against this one's
 *     `nmt_transaction_history_DD-MM-YYYY.csv`, so a downloads folder held two
 *     unrelated-looking files that were the same report.
 *
 * The one thing it had that this did not -- the Remark column -- was kept, not
 * dropped. `transactions` is now the whole difference:
 *
 *   omitted -- fetch the entire history (the dashboard's Export History CSV)
 *   passed  -- write exactly these rows (the transactions screen, filtered)
 * ---------------------------------------------------------------------------
 */
export const exportHistoryCSV = async (transactions?: Transaction[]) => {
    const t = dict();

    try {
        toast.info(t.csv.preparingHistory);
        // 1. Fetch data in parallel
        const [users, txRows] = await Promise.all([
            fetchUsers(),
            // A caller that already has the rows on screen hands them over, so
            // the file matches what the operator is looking at. Re-fetching here
            // would silently widen a filtered export to the whole history.
            //
            // Without them: the whole history, no filter -- paging rather than
            // stopping at row 1000. An export labelled "full history" that
            // quietly held back everything past the first thousand rows was the
            // worst place for that bug to hide, because the file looks complete
            // once it is open in Excel.
            //
            // 'desc' is explicit only to keep the newest-first row order this
            // file has always produced; the rows go into the CSV in fetch order.
            transactions ? Promise.resolve(transactions) : fetchTransactions({ order: 'desc' })
        ]);

        // 2. Create User Map
        const userMap = users.reduce((acc, u) => ({ ...acc, [u.id]: u.full_name }), {} as Record<string, string>);

        // 3. Sign the evidence images -- one round-trip per surviving photo, and
        // none at all for rows with no evidence or a deleted one, which
        // getEvidenceSignedUrlMap filters before it signs. Seven days, the same
        // lifetime the inventory export uses, so the two files' links expire
        // together rather than one of them dying first for no visible reason.
        const evidenceUrls = await getEvidenceSignedUrlMap(
            txRows.map((tx) => tx.evidence_image_url),
            CSV_EVIDENCE_URL_TTL_SECONDS,
        );

        // 4. Build CSV Lines
        const h = t.csv.header;
        const headers = [
            h.date,
            h.time,
            h.palletId,
            h.actionType,
            h.performedBy,
            h.locationDest,
            // Carried over from the transactions screen's own export, which is
            // the only place it existed. Dropping a column while merging two
            // exports would be a capability lost in a refactor, not a decision.
            t.common.remark,
            // Was `evidenceFile`, holding a storage object name nobody could
            // open. Now a signed URL, same as the inventory export.
            h.evidenceLink
        ];

        const rows = txRows.map(tx => {
            const [dateStr, timeStr] = splitDateTime(tx.timestamp);

            const userName = userMap[tx.user_id] || `${t.common.user}: ${tx.user_id}`;
            // This used to be a five-branch ternary duplicating the same labels
            // MobileHistory had its own copy of. Both now read the one table.
            const action = t.action[tx.action_type] ?? tx.action_type;

            const evidence = tx.evidence_image_url
                ? (evidenceUrls[tx.evidence_image_url] ?? CSV_EMPTY)
                : CSV_EMPTY;

            return [
                dateStr,
                timeStr,
                tx.pallet_id,
                action,
                userName,
                // A check-in carries no destination because the destination is
                // the warehouse. Naming it is more use than an empty cell here,
                // and it is what this export has always written.
                tx.department_dest || t.csv.warehouse,
                tx.transaction_remark || CSV_EMPTY,
                evidence
            ];
        });


        // 5. Generate CSV
        const d = new Date();
        const filenameDate = `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
        const filename = `nmt_transaction_history_${filenameDate}.csv`;

        generateCSV(headers, rows, filename);


        toast.success(t.csv.historyDone(rows.length));

    } catch (e: any) {
        console.error(e);
        toast.error(t.csv.exportFailed(describeAppError(e)));
    }
};

// ===========================================================================
// DASHBOARD ANALYTICS SUMMARY
//
// One labelled sheet covering every panel of the redesigned dashboard. It is a
// superset of the old DashboardHeader.exportSummaryCSV: the eight Category/Value
// rows that export produced are still the first block below, under the same
// `summaryCsv.*` labels, so an admin who has been exporting it recognises the
// top of the file.
//
// -------------------------------------------------------------------------
// THE ONE RULE: THIS FUNCTION COMPUTES NOTHING.
//
// Every figure written below is read straight off the DashboardAnalytics object
// the screen was rendered from. There is no sum, no average, no re-bucketing and
// no percentage in this file. That is the whole reason
// services/analytics/dashboardAnalytics.ts is a pure function: a helper that
// re-derived even one number would eventually disagree with the panel it was
// exported from, and a report that contradicts the dashboard is worse than no
// report at all. The only arithmetic here is presentational -- `pad2`, and the
// hours-to-days unit conversion inside formatDuration, which is the same
// conversion the screen applies to the same field.
//
// Two consequences worth knowing before adding a row:
//
//  * The configured overdue threshold is NOT on DashboardAnalytics (the reducer
//    consumes `overdueDays` and returns only its effects), so
//    `kpi.overdueCaption(days)` and `agingOverdue.breachNote(days)` cannot be
//    called here. The overdue rows below therefore carry no threshold caption,
//    and the breach flag is reported as the reducer's own `isBreach` boolean.
//  * Weekday totals are NOT on the object either -- TimeSection sums the 168
//    cells itself. So the time block below emits the grid, not the totals.
//
// -------------------------------------------------------------------------
// SHAPE OF THE FILE
//
// Sectioned, not one flat table: the dashboard's panels have different arities
// (a fleet count is a label and a number; a staff row is a name, a total and
// five action columns) and squeezing them into one column set would leave most
// of the sheet empty. Each section prints its own title row, then its own header
// row where it needs one, then its rows, then a blank line. CSV rows may be
// different widths -- a spreadsheet renders the short ones with trailing empty
// cells, which is exactly how a sectioned report should look.
//
// The file-level header stays [Category, Value] so column A is always a label
// and column B is always its number; the wider sections extend rightwards.
//
// Escaping is generateCSV's job and it does it correctly: every header and every
// cell is wrapped in double quotes with internal quotes doubled, which is
// RFC-4180 and covers the commas, quotes and newlines that free-text department
// names, staff names and locations can contain. Nothing is pre-escaped here.
// ===========================================================================

/** The four presets, mapped onto their labels in the analytics dictionary. */
const RANGE_LABEL_KEY: Record<DashboardRange, 'd7' | 'd30' | 'd90' | 'm12'> = {
    '7d': 'd7',
    '30d': 'd30',
    '90d': 'd90',
    '12m': 'm12',
};

type BandLabelKey = 'b0_1' | 'b2_3' | 'b4_7' | 'b8_14' | 'b15_30' | 'b30plus';

/**
 * Reducer band key -> dictionary key. `dwell`, `agingOverdue` and `resolve` all
 * carry the same six labels (the locale file says so where they are defined), so
 * one map serves all three histograms.
 */
const BAND_LABEL_KEY: Record<DwellBucketKey, BandLabelKey> = {
    '0_1d': 'b0_1',
    '2_3d': 'b2_3',
    '4_7d': 'b4_7',
    '8_14d': 'b8_14',
    '15_30d': 'b15_30',
    '30d_plus': 'b30plus',
};

/** Any of the three band dictionaries; all three carry the same six labels. */
type BandLabels = Record<BandLabelKey, string>;

// OverdueHistogramBin types `bucket` as a plain string, so the raw key is the
// fallback rather than a crash. A raw '30d_plus' in a report would be a bug, but
// a silent blank cell would be a worse one.
const bandLabel = (bucket: string, labels: BandLabels): string => {
    const key = BAND_LABEL_KEY[bucket as DwellBucketKey];
    return key ? labels[key] : bucket;
};

/**
 * A duration with its unit, mirroring the helper in
 * components/admin/dashboard/sections/LifecycleSection.tsx so the CSV prints the
 * same string the card does.
 *
 * The dictionary has no duration unit -- `dwell.median` and `resolve.median` are
 * bare labels -- and a bare "5.1" in a Value column beside histograms banded in
 * DAYS would be read as days when the field is `medianHours`. The unit therefore
 * comes from ICU/CLDR through Intl rather than from an invented locale key: this
 * is number formatting, the same category of thing as the toLocaleDateString
 * call in AdminHelpers, not translated prose. Thai's default numbering system is
 * latn, so the digits stay Arabic in both languages.
 *
 * The try/catch guards `style: 'unit'`, which needs Safari 14.1+.
 */

export const exportDashboardSummaryCSV = (
    analytics: DashboardAnalytics,
    range: DashboardRange,
): void => {
    // dict(), not useT(): this module is called from a click handler and is never
    // rendered, exactly like the two exports above it.
    const t = dict();
    const a = t.dashboard.analytics;

    // Durations follow the active language -- a unit is a unit. DATES do not:
    // formatCsvDate builds the digits by hand, so every file this module writes
    // says 2026 in both languages rather than a th-TH locale rendering it as
    // พ.ศ. 2569. A date in a data file is an index into a shared record, not
    // prose, and it has to match the filename and the database.
    const locale = getLang() === 'th' ? 'th' : 'en-GB';

    const { fleet, dwell, damage, staff, heat, aging, trend } = analytics;

    const rows: (string | number)[][] = [];
    const blank = () => rows.push([]);

    // --- Preamble ---------------------------------------------------------
    rows.push([t.dashboard.reportTitle]);
    rows.push([a.range.label, a.range[RANGE_LABEL_KEY[range]]]);
    rows.push([t.common.generatedOn(formatCsvDateTime(new Date()))]);
    // The caveat that makes the rest of the file readable: the fleet block is
    // counted as of now and is deliberately NOT scoped by the range above, so a
    // reader does not take an unchanged total for a broken filter.
    rows.push([a.range.currentStateNote]);
    blank();

    // --- 1. FLEET ---------------------------------------------------------
    // `total` is the WORKING fleet, so the three status rows under it still add
    // up to it. Scrapped is listed last, labelled twice -- once by the row label
    // and once by kpi.scrappedNote -- because it is outside the total AND outside
    // the utilisation divisor, and a reader who folds it back in gets both
    // figures wrong.
    rows.push([a.sections.fleet]);
    rows.push([t.dashboard.summaryCsv.totalActive, fleet.total, a.kpi.totalFleetCaption]);
    rows.push([t.status.available, fleet.available, a.kpi.availableCaption]);
    rows.push([t.status.in_use, fleet.in_use, a.kpi.inUseCaption]);
    rows.push([t.status.damaged, fleet.damaged, a.kpi.damagedCaption]);
    // No caption: kpi.overdueCaption() names the configured threshold, which is
    // not carried on DashboardAnalytics. See the header note.
    rows.push([t.dashboard.summaryCsv.overdueItems, fleet.overdue]);
    // The '%' suffix matches the old header export, which wrote
    // `stats.utilizationRate + "%"` into the same row.
    rows.push([t.dashboard.summaryCsv.utilizationRate, `${fleet.utilisationPct}%`, a.kpi.utilisationCaption]);
    rows.push([
        t.dashboard.summaryCsv.scrappedExcluded,
        fleet.scrapped,
        a.kpi.scrappedNote(fleet.scrapped),
    ]);
    blank();

    // --- 2. DWELL ---------------------------------------------------------
    rows.push([a.dwell.title]);
    rows.push([a.dwell.subtitle]);
    // States the counting rule and the sample size in one sentence, the same way
    // the card's footer does: a pair is counted on its CLOSING event, so these
    // are completed trips only.
    rows.push([a.dwell.samples(dwell.samples)]);
    rows.push([a.dwell.median, formatDuration(dwell.medianHours, locale)]);
    rows.push([a.dwell.p90, formatDuration(dwell.p90Hours, locale)]);
    // "Still out", NOT "currently checked out". This is open check-outs at the
    // end of the scan, bounded by the fetch window, so it is a floor and is not
    // interchangeable with fleet.in_use above, which reads the pallet rows.
    rows.push([a.dwell.openCount, dwell.openCount]);
    // Same two columns the on-screen DataTableView uses for this histogram.
    rows.push([a.dwell.title, t.common.total]);
    for (const bin of dwell.histogram) {
        rows.push([bandLabel(bin.bucket, a.dwell), bin.count]);
    }
    blank();

    // --- 3. DAMAGE FUNNEL -------------------------------------------------
    // A COHORT, not a set of per-period counts: `reported` is the damage reports
    // raised inside the range, and `repaired`/`scrapped` are how many of THOSE
    // SAME reports were closed each way, so stillOpen = reported - repaired -
    // scrapped by construction. The `repair` and `scrap` columns in the Movement
    // block at the bottom of this file are raw per-period EVENT counts over the
    // same window and will not match these -- clearing a backlog raises one and
    // not the other. The two subtitles are what say so: "what happened to the
    // pallets reported damaged" here, "events over the selected range" there.
    rows.push([a.funnel.title]);
    rows.push([a.funnel.subtitle]);
    rows.push([a.funnel.reported, damage.reported]);
    rows.push([a.funnel.repaired, damage.repaired]);
    rows.push([a.funnel.scrapped, damage.scrapped]);
    rows.push([a.funnel.stillOpen, damage.stillOpen]);
    blank();

    rows.push([a.resolve.title]);
    rows.push([a.resolve.subtitle]);
    rows.push([t.common.total, damage.resolution.samples]);
    rows.push([a.resolve.median, formatDuration(damage.resolution.medianHours, locale)]);
    // `resolve` has no p90 label of its own; dwell.p90 ("90th percentile" /
    // "เปอร์เซ็นไทล์ที่ 90") is the closest existing key and is statistic-neutral.
    rows.push([a.dwell.p90, formatDuration(damage.resolution.p90Hours, locale)]);
    rows.push([a.resolve.title, t.common.total]);
    for (const bin of damage.resolution.histogram) {
        rows.push([bandLabel(bin.bucket, a.resolve), bin.count]);
    }
    blank();

    rows.push([a.offenders.title]);
    rows.push([a.offenders.subtitle]);
    rows.push([
        a.offenders.palletId,
        a.offenders.damageCount,
        a.offenders.repairCount,
        a.offenders.isScrapped,
        a.offenders.lastEvent,
    ]);
    for (const row of damage.repeatOffenders) {
        rows.push([
            row.palletId,
            row.damageCount,
            row.repairCount,
            // A flag column, so the cell repeats its own header when set and is
            // empty when it is not. There is no yes/no pair anywhere in the
            // dictionary, and an empty cell is what a spreadsheet filter reads
            // as "not flagged" -- see CSV_EMPTY for why this is not '-'.
            row.scrapped ? a.offenders.isScrapped : CSV_EMPTY,
            row.lastEventISO ? formatCsvDateTime(row.lastEventISO) : CSV_EMPTY,
        ]);
    }
    blank();

    // --- 4. STAFF ---------------------------------------------------------
    rows.push([a.staff.title]);
    rows.push([a.staff.subtitle]);
    rows.push([a.staff.activeStaff(analytics.activeStaffCount, analytics.totalStaffCount)]);
    rows.push([
        a.staff.name,
        a.staff.total,
        t.action.check_out,
        t.action.check_in,
        t.action.report_damage,
        t.action.repair,
        t.action.scrap,
        a.staff.lastActive,
    ]);
    for (const row of staff) {
        rows.push([
            // UNKNOWN_USER_KEY ('__unknown_user__') is the sentinel for a
            // transaction that carried no user_id at all. A raw sentinel in an
            // exported report is a bug, so it goes through the dictionary here --
            // borrowing modals.unknownUser, which exists for exactly this case
            // and which StaffSection.tsx already uses for the same sentinel, so
            // the CSV and the chart name the same person the same way. It takes
            // an id and here there genuinely is none, hence the em dash.
            //
            // Every other name is safe as-is: StaffRow.name is guaranteed never
            // to be a raw UUID -- an orphaned id arrives pre-shortened.
            row.name === UNKNOWN_USER_KEY ? t.modals.unknownUser('—') : row.name,
            row.total,
            row.byAction.check_out,
            row.byAction.check_in,
            row.byAction.report_damage,
            row.byAction.repair,
            row.byAction.scrap,
            row.lastActiveISO ? formatCsvDateTime(row.lastActiveISO) : CSV_EMPTY,
        ]);
    }
    blank();

    // --- 5. LOCATIONS -----------------------------------------------------
    // 'Warehouse' is absent by design: it is a magic string in
    // pallets.current_location meaning "not checked out anywhere", not a
    // department, and the reducer skips it. So these rows count pallets that are
    // OUT, and they do not add up to fleet.total.
    rows.push([t.dashboard.locationUsage]);
    rows.push([t.dashboard.locationUsageSub]);
    rows.push([t.common.location, t.common.total, t.dashboard.overdue, t.status.damaged]);
    for (const row of fleet.byLocation) {
        rows.push([
            // The other sentinel: the reducer keeps the top locations by holdings
            // and folds the tail into one OTHER_LOCATION_KEY row, so that a
            // renamed department does not spray near-empty rows across the
            // report. Relabelled from the same key FleetSection.tsx uses.
            row.name === OTHER_LOCATION_KEY ? a.chart.othersLabel : row.name,
            row.count,
            row.overdue,
            row.damaged,
        ]);
    }
    blank();

    // --- 6. TIME PATTERNS -------------------------------------------------
    // The full 7 x 24 grid, transposed: one row per hour, one column per weekday.
    //
    // Not 168 label/value rows (a reader cannot see a pattern down a 168-row
    // column) and not weekday totals (those are not on DashboardAnalytics --
    // TimeSection sums the cells itself, and summing them here would be the one
    // thing this file must not do). Transposed rather than 7 rows x 24 columns
    // because 24 short columns need horizontal scrolling in a spreadsheet while
    // 8 fit on screen, and because it keeps this block the same width as the
    // staff block above.
    //
    // Day 0 is Sunday, matching Date.getDay(). Hours are BROWSER-LOCAL and
    // deliberately so: `timestamp` is stored UTC, but this is a UTC+7 warehouse,
    // so a UTC hour-of-day grid would show the 08:00-17:00 shift as overnight
    // activity. The hour labels are pad2(h), the same form the heatmap's own
    // column headers use at its hourly breakpoint.
    rows.push([a.heat.title]);
    rows.push([a.heat.subtitle]);
    rows.push([a.heat.hourAxis, a.heat.sun, a.heat.mon, a.heat.tue, a.heat.wed, a.heat.thu, a.heat.fri, a.heat.sat]);
    for (let hour = 0; hour < 24; hour++) {
        // heat is exactly 168 cells, day-major -- guaranteed by the reducer,
        // which pre-allocates the grid rather than discovering it from the data.
        rows.push([
            pad2(hour),
            heat[0 * 24 + hour].count,
            heat[1 * 24 + hour].count,
            heat[2 * 24 + hour].count,
            heat[3 * 24 + hour].count,
            heat[4 * 24 + hour].count,
            heat[5 * 24 + hour].count,
            heat[6 * 24 + hour].count,
        ]);
    }
    blank();

    // --- 7. AGING ---------------------------------------------------------
    rows.push([a.agingOverdue.title]);
    rows.push([a.agingOverdue.subtitle]);
    rows.push([a.agingOverdue.title, t.common.total, t.dashboard.criticalOverdue]);
    for (const bin of aging.overdueHistogram) {
        rows.push([
            bandLabel(bin.bucket, a.agingOverdue),
            bin.count,
            // isBreach means EVERY pallet in the band is past the threshold, not
            // merely some of them -- the reducer decides that. The threshold
            // itself is not on the object, so agingOverdue.breachNote(days)
            // cannot be called and the flag stands alone.
            bin.isBreach ? t.dashboard.criticalOverdue : CSV_EMPTY,
        ]);
    }
    blank();

    rows.push([a.dormant.title]);
    rows.push([a.dormant.subtitle]);
    rows.push([a.dormant.palletId, a.dormant.status, a.dormant.location, a.dormant.daysIdle]);
    for (const row of aging.dormant) {
        rows.push([
            row.palletId,
            palletStatusLabel(row.status),
            row.location,
            // One decimal, matching the dormant table on screen. The reducer has
            // already rounded to 1dp; this only makes the trailing zero visible
            // so the column lines up digit over digit.
            row.daysIdle.toFixed(1),
        ]);
    }
    blank();

    // --- 8. MOVEMENT (raw per-period event counts) ------------------------
    // Last, deliberately. These are the trend series behind the movement and
    // quality charts: RAW EVENT COUNTS per bucket, which is what a rate is made
    // of. They are not the damage funnel and must not be reconciled with it --
    // see the note on section 3. Keeping them at the far end of the sheet keeps
    // the two blocks from sitting side by side.
    //
    // `key` rather than `label`: dashboardAnalytics.ts calls it stable, sortable
    // and locale-independent and names the CSV as the reason it exists, whereas
    // `label` is presentational axis text.
    rows.push([a.movement.title]);
    rows.push([a.movement.subtitle]);
    rows.push([a.qualityTrend.subtitle]);
    rows.push([
        t.common.date,
        a.movement.checkOut,
        a.movement.checkIn,
        a.qualityTrend.damage,
        a.qualityTrend.repair,
        a.qualityTrend.scrap,
        t.dashboard.legendAcquisition,
    ]);
    for (const point of trend) {
        rows.push([
            point.key,
            point.check_out,
            point.check_in,
            point.report_damage,
            point.repair,
            point.scrap,
            point.acquisition,
        ]);
    }

    // Column A is always a label and column B always its number, so the file
    // header is the same pair the old stats-only export used.
    const headers = [t.dashboard.summaryCsv.category, t.dashboard.summaryCsv.value];

    // Same DD-MM-YYYY stamp as the inventory and history exports, plus the range
    // token -- so a 7d and a 30d export taken on the same day do not overwrite
    // each other in the downloads folder. The token is the raw union member and
    // never the translated label: a filename is not a place for Thai.
    const d = new Date();
    const filenameDate = `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
    const filename = `nmt_dashboard_summary_${range}_${filenameDate}.csv`;

    // generateCSV emits the UTF-8 BOM through a Blob. Without it Excel on Windows
    // falls back to the system ANSI codepage and every Thai label above lands as
    // mojibake. It also quotes and escapes every cell, which is what makes the
    // free-text department and staff names below safe to write raw.
    if (!generateCSV(headers, rows, filename)) {
        toast.error(t.csv.exportFailed(t.errors.unknown));
    }
};
