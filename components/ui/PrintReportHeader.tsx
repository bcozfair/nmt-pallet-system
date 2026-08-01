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
    <div className="hidden print:block border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{generatedOn}</p>
        {filters && filters.length > 0 && (
            // The filter conditions are the difference between "the fleet" and
            // "the 23 rows somebody happened to be looking at", and a printed
            // sheet has nothing else on it to tell the two apart. Separated with
            // a middot rather than a comma: several of these phrases contain
            // commas of their own (a date range, a list of locations).
            <p className="mt-1 text-xs text-slate-500">{filters.join(' · ')}</p>
        )}
    </div>
);
