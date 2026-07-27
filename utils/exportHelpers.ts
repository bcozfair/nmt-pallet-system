
import { fetchPallets } from '../services/palletService';
import { fetchUsers } from '../services/userService';
import { fetchTransactions } from '../services/transactionService';
import { ActionType } from '../types';
import { formatDate, formatDateTime, formatDuration, palletStatusLabel } from '../components/admin/common/AdminHelpers';
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

export const exportInventoryCSV = async () => {

    // dict() throughout: this module is called from event handlers, not rendered.
    const t = dict();

    try {
        toast.info(t.csv.preparingInventory);

        // 1. Fetch all necessary data
        const [pallets, users, transactions] = await Promise.all([
            fetchPallets(),
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

        // 3. Define Columns
        const h = t.csv.header;
        const headers = [
            h.palletId,
            h.status,
            h.currentLocation,
            h.responsiblePerson,
            h.lastAction,
            h.lastActivityDate,
            h.daysOverdue,
            h.dateAdded,
            h.evidenceFile      // storage object name; bucket is private
        ];

        const rows = pallets.map(p => {
            const tx = latestTxMap[p.pallet_id];
            const responsiblePerson = tx ? (userMap[tx.user_id] || tx.user_id) : '-';

            // Calculate Overdue
            let overdue = 0;
            if (p.status === 'in_use' && p.last_checkout_date) {
                overdue = Math.floor((new Date().getTime() - new Date(p.last_checkout_date).getTime()) / (1000 * 3600 * 24));
            }

            // Format Dates
            const lastActivity = p.last_transaction_date ? formatDateTime(p.last_transaction_date) :
                (tx ? formatDateTime(tx.timestamp) : '-');

            const created = p.created_at ? formatDate(p.created_at) : '-';
            const evidence = tx?.evidence_image_url && tx.evidence_image_url !== 'image_deleted' ? tx.evidence_image_url : '';

            return [
                p.pallet_id,
                palletStatusLabel(p.status),
                p.current_location,
                responsiblePerson,
                // Was tx.action_type -- the raw enum ("report_damage") in a column
                // headed "Last Action". Same table the history export uses below.
                tx ? (t.action[tx.action_type] ?? tx.action_type) : '-',
                lastActivity,
                overdue > 0 ? overdue.toString() : '0',
                created,
                evidence
            ];
        });


        const d = new Date();
        const filenameDate = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
        const filename = `nmt_current_inventory_${filenameDate}.csv`;

        generateCSV(headers, rows, filename);


        toast.success(t.csv.inventoryDone(pallets.length));
    } catch (e: any) {
        console.error(e);
        toast.error(t.csv.exportFailed(describeAppError(e)));
    }
};

export const exportHistoryCSV = async () => {
    const t = dict();

    try {
        toast.info(t.csv.preparingHistory);
        // 1. Fetch data in parallel
        const [users, transactions] = await Promise.all([
            fetchUsers(),
            // Same call as before in intent -- the whole history, no filter --
            // except it now pages instead of stopping at row 1000. An export
            // labelled "full history" that quietly held back everything past
            // the first thousand rows was the worst place for this bug to hide,
            // because the file looks complete once it is open in Excel.
            //
            // 'desc' is explicit only to keep the newest-first row order this
            // file has always produced; the rows go into the CSV in fetch order.
            fetchTransactions({ order: 'desc' })
        ]);

        // 2. Create User Map
        const userMap = users.reduce((acc, u) => ({ ...acc, [u.id]: u.full_name }), {} as Record<string, string>);

        // 3. Build CSV Lines
        const h = t.csv.header;
        const headers = [
            h.date,
            h.time,
            h.palletId,
            h.actionType,
            h.performedBy,
            h.locationDest,
            h.evidenceFile
        ];

        const rows = transactions.map(tx => {
            const dateObj = new Date(tx.timestamp);
            const dateStr = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
            const timeStr = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

            const userName = userMap[tx.user_id] || `${t.common.user}: ${tx.user_id}`;
            // This used to be a five-branch ternary duplicating the same labels
            // MobileHistory had its own copy of. Both now read the one table.
            const action = t.action[tx.action_type] ?? tx.action_type;

            const evidence = tx.evidence_image_url && tx.evidence_image_url !== 'image_deleted' ? tx.evidence_image_url : '';

            return [
                dateStr,
                timeStr,
                tx.pallet_id,
                action,
                userName,
                tx.department_dest || t.csv.warehouse,
                evidence
            ];
        });


        // 4. Generate CSV
        const d = new Date();
        const filenameDate = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
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

const pad2 = (n: number): string => String(n).padStart(2, '0');

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
    // formatDate/formatDateTime are locked to en-GB in AdminHelpers.tsx:65 so the
    // screen, the CSV and the filename all say 2026 rather than the CSV saying
    // 2026 and a th-TH screen saying พ.ศ. 2569.
    const locale = getLang() === 'th' ? 'th' : 'en-GB';

    const { fleet, dwell, damage, staff, heat, aging, trend } = analytics;

    const rows: (string | number)[][] = [];
    const blank = () => rows.push([]);

    // --- Preamble ---------------------------------------------------------
    rows.push([t.dashboard.reportTitle]);
    rows.push([a.range.label, a.range[RANGE_LABEL_KEY[range]]]);
    rows.push([t.dashboard.reportGeneratedOn(formatDateTime(new Date()))]);
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
            // A flag column, so the cell repeats its own header when set. There
            // is no yes/no pair anywhere in the dictionary, and '-' is already
            // the app's empty marker (formatDate returns it).
            row.scrapped ? a.offenders.isScrapped : '-',
            row.lastEventISO ? formatDateTime(row.lastEventISO) : '-',
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
            row.lastActiveISO ? formatDateTime(row.lastActiveISO) : '-',
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
            bin.isBreach ? t.dashboard.criticalOverdue : '-',
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
