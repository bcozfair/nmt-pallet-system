import React from 'react';

import { ReportPage, RUNNING_HEAD_MM, bodyHeightMm } from './ReportPage';
import { chunkPages } from './paginate';

// A LIST, TURNED INTO A DOCUMENT.
//
// The inventory and transaction screens are a filter bar and a table, and for a
// long time they printed themselves in place: hide the chrome, unfreeze the
// sticky head, and let `tr[data-print-row]` reveal the rows pagination had
// hidden. That produced a document, but not a good one, and the two things wrong
// with it are the two things this file exists to fix.
//
//   1. THE ROWS PER SHEET WERE THE ENGINE'S GUESS. Row heights came from screen
//      padding, the running head came from `thead { display: table-header-group }`,
//      and where a page ended was wherever the content happened to run out. A
//      sheet might carry 38 rows or 24; a row could land with its top half on
//      page 3 and nothing said so.
//
//   2. COLUMNS DISAPPEARED ON PAPER. Remark and Last Checkout are `xl:table-cell`
//      -- and a print media query measures the PAPER, which at A4 landscape is
//      about 1032px, under the 1280px `xl` breakpoint. Both had to be given
//      `print:table-cell` by hand to come back, and every column added since
//      would have needed somebody to remember the same thing.
//
// Here the sheet decides. ROW_MM is a declared height, the capacity of a page is
// that height divided into the space the masthead and the foot leave over, and
// the split is computed before a single row renders -- which is also the only
// reason the foot can honestly say "3 / 7". Columns are declared once, in one
// list, at one set of widths; there is no breakpoint anywhere in this file
// because there is no viewport involved.
//
// WHAT THIS COSTS, STATED PLAINLY: a row is one line, and anything longer is
// truncated with an ellipsis. That is the price of a page count known in
// advance, and it is paid where it does least harm -- the full remark is still
// in the CSV export and in the edit modal. A wrapping row would mean the number
// of rows on a sheet could not be known until after it was laid out, which is
// exactly the property that made the old print unpredictable.

/** One printed row's height. Everything else on the sheet is arithmetic on it. */
const ROW_MM = 5;
/** The table's own heading row. */
const HEAD_ROW_MM = 6;
/**
 * Slack left at the foot of every page.
 *
 * The chrome constants in ReportPage are true to within a fraction of a
 * millimetre, but "within a fraction" times a rounding in the printer's own
 * conversion is how a last row gets clipped. Two millimetres is under half a
 * row: it never costs a row that would otherwise have fitted, and it absorbs
 * every accumulated error that could cost one silently.
 */
const SAFETY_MM = 2;
/**
 * The masthead's declared height on page 1.
 *
 * DECLARED rather than content-sized, because the row capacity of page 1 is
 * computed from it -- see bodyHeightMm's docblock. It is generous by about 8mm
 * so that a long filter line can run to two lines without eating a row, and the
 * box clips rather than pushes if it ever runs to three.
 */
const MASTHEAD_MM = 30;

/** How many rows fit on a sheet whose head occupies `headMm`. */
const rowsPerPage = (headMm: number): number =>
    Math.floor((bodyHeightMm(headMm) - HEAD_ROW_MM - SAFETY_MM) / ROW_MM);

/**
 * How many rows this document puts on page 1 and on every page after it.
 *
 * Exported because it is the one number in the whole design that is silently
 * wrong when it is wrong: too high and the last rows of every sheet are clipped
 * away by `.report-page { overflow: hidden }`, too low and a report that should
 * have been four pages is six. Neither shows up on screen. There is a test
 * against it in paginate.test.ts.
 */
export const tableCapacity = (): { first: number; rest: number } => ({
    first: rowsPerPage(MASTHEAD_MM),
    rest: rowsPerPage(RUNNING_HEAD_MM),
});

/**
 * The height an appended sheet's body gets, in mm.
 *
 * Exported for appendices that paginate themselves -- the inventory report's
 * damage-photo pages chunk their cards against this, for the same reason the
 * table chunks its rows: a grid that overflows a clipped page loses pictures
 * with nothing on the sheet to say a picture was lost.
 */
export const appendixBodyMm = (): number => bodyHeightMm(RUNNING_HEAD_MM) - SAFETY_MM;

export interface ReportColumn<T> {
    key: string;
    header: string;
    /**
     * Share of the table width, as a percentage. The set must sum to 100.
     *
     * Percentages rather than pixels or `ch`, because a column's job here is to
     * claim a share of whatever the sheet gives it. A width in pixels would be a
     * second copy of the page width, free to disagree with PAGE_MARGIN_MM.
     */
    width: number;
    align?: 'left' | 'right' | 'center';
    render: (row: T) => React.ReactNode;
}

/** One figure in the band under the masthead: "Available — 42". */
export interface ReportSummaryItem {
    label: string;
    value: string;
}

export interface ReportTableDocumentProps<T> {
    /** The report's name. Masthead on page 1, running head after that. */
    documentTitle: string;
    subtitle: string;
    /** Already-formatted "Generated on ...". */
    generatedOn: string;
    /**
     * The filters the rows were produced under, already assembled into one line.
     *
     * Omitted entirely when nothing is filtered, which is not the same as an
     * empty string: a sheet with no filter line means "everything", and a sheet
     * with an empty one means the report forgot to say.
     */
    filterLine?: string;
    /** What the reader is holding a list of -- "45 pallets". */
    scopeLine: string;
    summary: ReportSummaryItem[];
    /** The running head's right side, and what the table is. */
    section: string;
    columns: ReportColumn<T>[];
    rows: readonly T[];
    rowKey: (row: T) => string;
    emptyLabel: string;
    /** Already-formatted "Page N of M", for the sheet's accessible name. */
    pageLabel: (page: number, total: number) => string;
    /** Sheets appended after the table. Each entry is one page's body. */
    appendix?: { key: string; section: string; body: React.ReactNode }[];
}

const alignClass = (align: ReportColumn<unknown>['align']): string =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

/**
 * The whole document: a masthead sheet, as many table sheets as the rows need,
 * and whatever the caller appends.
 *
 * Generic over the row type rather than taking pre-rendered cells, so the
 * columns stay a list of what each one IS -- a heading, a width and a way to
 * read one field. A caller handing in ready-made <td>s could not be paginated by
 * this file, because nothing would know how tall a row was going to be.
 */
export const ReportTableDocument = <T,>({
    documentTitle,
    subtitle,
    generatedOn,
    filterLine,
    scopeLine,
    summary,
    section,
    columns,
    rows,
    rowKey,
    emptyLabel,
    pageLabel,
    appendix = [],
}: ReportTableDocumentProps<T>): React.ReactElement => {
    const capacity = tableCapacity();
    const pages = chunkPages(rows, capacity.first, capacity.rest);
    const total = pages.length + appendix.length;

    const masthead = (
        <header className="flex shrink-0 flex-col overflow-hidden" style={{ height: `${MASTHEAD_MM}mm` }}>
            {/* Title and date share a baseline instead of stacking. The date is
                metadata about the sheet, not a subtitle of the report, and putting
                it on the right of the same line is what makes it read that way --
                it also gives the title the full line it needs in Thai, which runs
                longer than its English source with nowhere to break. */}
            <div className="flex items-baseline justify-between gap-6">
                <h1 className="truncate text-[19px] font-semibold tracking-tight text-slate-900">
                    {documentTitle}
                </h1>
                <p className="shrink-0 text-[9px] text-slate-600">{generatedOn}</p>
            </div>
            <p className="mt-1 text-[10px] text-slate-600">{subtitle}</p>
            {/* The scope of the whole document, in one line. Separated with a
                middot rather than a comma: both halves contain their own commas
                in one language or the other. The filter conditions are the
                difference between "the fleet" and "the 23 rows somebody happened
                to be looking at", and a printed sheet has nothing else on it to
                tell the two apart. */}
            <p className="mt-1 text-[9px] leading-relaxed text-slate-600">
                {scopeLine}
                {filterLine ? ` · ${filterLine}` : ''}
            </p>

            {summary.length > 0 && (
                <dl className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1">
                    {summary.map((item) => (
                        <div key={item.label} className="flex items-baseline gap-1.5">
                            <dt className="text-[9px] text-slate-500">{item.label}</dt>
                            <dd className="text-[12px] font-semibold tabular-nums text-slate-800">
                                {item.value}
                            </dd>
                        </div>
                    ))}
                </dl>
            )}

            {/* The rule sits at the FOOT of the declared box rather than
                underneath the text, so the masthead reads as one band of a fixed
                depth on a sheet whose arithmetic depends on that depth. A 2px
                rule in ink rather than a hairline, because a hairline reads as one
                more table edge and nothing would say where the document began. */}
            <div className="mt-auto h-0 border-b-2 border-slate-800" />
        </header>
    );

    const sheet = (pageRows: T[], index: number) => (
        <ReportPage
            key={`rows-${index}`}
            page={index + 1}
            total={total}
            section={section}
            documentTitle={documentTitle}
            pageLabel={pageLabel(index + 1, total)}
            masthead={index === 0 ? masthead : undefined}
        >
            {pageRows.length === 0 ? (
                <p className="mt-8 text-center text-[11px] text-slate-500">{emptyLabel}</p>
            ) : (
                // `table-layout: fixed` is what makes the colgroup authoritative.
                // Left to `auto`, a browser sizes columns from their content --
                // so a single long remark would widen its column, narrow every
                // other one, and the same report printed a day later with
                // different data would have a different shape.
                <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                        {columns.map((column) => (
                            <col key={column.key} style={{ width: `${column.width}%` }} />
                        ))}
                    </colgroup>
                    <thead>
                        <tr style={{ height: `${HEAD_ROW_MM}mm` }}>
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    scope="col"
                                    className={
                                        'border-b border-slate-400 px-1 align-bottom pb-1 ' +
                                        'text-[9px] font-semibold text-slate-700 ' +
                                        alignClass(column.align)
                                    }
                                >
                                    {column.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.map((row, rowIndex) => (
                            <tr
                                key={rowKey(row)}
                                style={{
                                    height: `${ROW_MM}mm`,
                                    // Zebra striping, in ink. On a sheet this
                                    // dense -- fifty rows of seven columns -- a
                                    // reader tracking one row across to the last
                                    // column has nothing else to hold the line
                                    // for them, and paper has no hover state.
                                    // `print-color-adjust: exact` is already set
                                    // on <body> in index.css, so this survives
                                    // the browser's "background graphics off".
                                    backgroundColor: rowIndex % 2 === 1 ? '#f1f5f9' : undefined,
                                }}
                            >
                                {columns.map((column) => (
                                    <td
                                        key={column.key}
                                        className="px-1 align-middle text-[9px] text-slate-700"
                                    >
                                        {/* The truncation lives on an inner div,
                                            not on the cell. `text-overflow` needs
                                            a block box to apply to, and a
                                            table-cell is not reliably one across
                                            engines -- a cell that fails to
                                            truncate does not clip, it GROWS, and
                                            a row one line taller than declared is
                                            the last row of that page falling off
                                            the bottom. */}
                                        <div className={`truncate ${alignClass(column.align)}`}>
                                            {column.render(row)}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </ReportPage>
    );

    return (
        <div className="report-sheet-stack">
            {pages.map(sheet)}
            {appendix.map((extra, index) => {
                const page = pages.length + index + 1;
                return (
                    <ReportPage
                        key={extra.key}
                        page={page}
                        total={total}
                        section={extra.section}
                        documentTitle={documentTitle}
                                    pageLabel={pageLabel(page, total)}
                    >
                        {extra.body}
                    </ReportPage>
                );
            })}
        </div>
    );
};
