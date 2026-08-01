import React from 'react';

export interface PrintReportHeaderProps {
    /** What the report is, e.g. "Inventory Report". */
    title: string;
    /** Already-formatted sentence naming when it was produced. */
    generatedOn: string;
    /**
     * The filters the rows were produced under, one phrase each.
     *
     * Optional and omitted entirely when empty, which is not the same as an
     * empty list: a sheet with no filter line means "everything", and a sheet
     * with an empty filter line means the report forgot to say.
     */
    filters?: string[];
}

// The block that turns a screen into a document.
//
// On screen this says nothing worth saying -- the sidebar, the tab and the page
// header already name what the reader is looking at. On paper none of those
// exist: `PageHeader` is `print:hidden` because it is a control strip, and what
// came out of the printer before this existed was an unlabelled table with no
// title, no date and no indication that it was a filtered view rather than the
// whole fleet.
//
// Lifted out of DashboardHome, where it was inline markup. Three screens print
// now (dashboard, inventory, transactions), and three copies of a report header
// is three chances for one of them to stop saying when it was printed.
//
// `hidden print:block` rather than a conditional render: there is no reliable
// "we are printing" signal in React -- Safari fires neither beforeprint nor
// afterprint, and Ctrl+P never reaches JavaScript at all. A media query is the
// only thing that is true for a Ctrl+P as well as for a button press.
export const PrintReportHeader: React.FC<PrintReportHeaderProps> = ({
    title,
    generatedOn,
    filters,
}) => (
    // A masthead, not a heading: a 2px rule in ink rather than a slate-200
    // hairline, because the hairline read as one more card edge among the dozen
    // below it and nothing on the sheet said where the document began.
    //
    // `break-after: avoid` (print-avoid-break-after) so the title never ends up
    // alone at the foot of a page with the report starting overleaf.
    <div className="hidden print:block print-avoid-break-after border-b-2 border-slate-800 pb-2.5">
        {/* Title and date share a baseline instead of stacking. The date is
            metadata about the sheet, not a subtitle of the report, and putting
            it on the right of the same line is what makes it read that way --
            it also gives the title the full line it needs in Thai, which runs
            longer than its English source with nowhere to break. */}
        <div className="flex items-baseline justify-between gap-6">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
            <p className="shrink-0 text-xs text-slate-600">{generatedOn}</p>
        </div>
        {filters && filters.length > 0 && (
            // The filter conditions are the difference between "the fleet" and
            // "the 23 rows somebody happened to be looking at", and a printed
            // sheet has nothing else on it to tell the two apart. Separated with
            // a middot rather than a comma: several of these phrases contain
            // commas of their own (a date range, a list of locations).
            //
            // slate-600, not slate-500: this is the only line on the sheet that
            // qualifies every figure under it, and toner is not a backlit screen.
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{filters.join(' · ')}</p>
        )}
    </div>
);
