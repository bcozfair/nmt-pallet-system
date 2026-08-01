import React from 'react';

import {
    ReportPill,
    ReportTableDocument,
    STATUS_PILL,
    NEUTRAL_PILL,
    appendixBodyMm,
    chunkPages,
} from '../../../report';
import type { ReportColumn, ReportSummaryItem } from '../../../report';
import { formatDateTime } from '../../common/AdminHelpers';
import { useT } from '../../../../hooks/useT';
import type { PageOrientation } from '../../../../hooks/usePageOrientation';
import type { Pallet, PalletStatus } from '../../../../types';

// THE INVENTORY REPORT: which columns, and what goes in the appendix.
//
// Everything about HOW a sheet is built -- the box, the row height, how many
// rows fit, where the pages break -- is in components/report/. What is this
// screen's own is the seven columns below and the decision that damage photos
// get sheets of their own.
//
// Seven columns on both orientations, and no responsive variants anywhere in
// this file. The screen drops Last Checkout and Remark below `xl`, and both had
// to be given `print:table-cell` by hand to come back on paper -- because a
// print media query measures the PAPER, and A4 landscape is about 1032px, under
// the 1280px `xl` breakpoint. Anyone adding an eighth column to the screen would
// have had to know that. Here the widths are percentages of whatever sheet was
// chosen, so there is nothing to remember.

/** How many days past `overdueThreshold` a checked-out pallet is, or null. */
const overdueDays = (pallet: Pallet, threshold: number): { days: number; late: boolean } | null => {
    if (pallet.status !== 'in_use' || !pallet.last_checkout_date) return null;
    const days = Math.floor(
        (Date.now() - new Date(pallet.last_checkout_date).getTime()) / (1000 * 3600 * 24),
    );
    return { days, late: days > threshold };
};

// --- The damage-photo appendix -----------------------------------------------
//
// On screen these are a button that opens a viewer. On the old printed sheet
// they were a 20px-tall thumbnail wedged into a table row, at a size where a
// scuffed corner and a split board look identical -- which is to say the column
// was on the paper without being of any use on it.
//
// They get their own sheets now, chunked against the same page height the table
// is chunked against. The pallet id under each picture is what ties it back to
// its row; without it an appendix of photographs is a set of pictures of
// pallets, which is not evidence of anything.

/** A card's height. The picture gets what is left after the caption. */
const CARD_MM = 38;
/** Between cards, in both directions. */
const CARD_GAP_MM = 3;

const photoColumns = (orientation: PageOrientation): number =>
    orientation === 'landscape' ? 5 : 3;

/** How many photographs fit on one appendix sheet. */
const photosPerPage = (orientation: PageOrientation): number => {
    const rows = Math.max(1, Math.floor(appendixBodyMm(orientation) / (CARD_MM + CARD_GAP_MM)));
    return rows * photoColumns(orientation);
};

export interface InventoryReportProps {
    /** Every row that passed the filters, in the order the screen sorted them. */
    pallets: Pallet[];
    /** Signed damage-photo URL per pallet id -- see useInventoryEvidence. */
    evidenceUrls: Record<string, string>;
    overdueThreshold: number;
    /**
     * The filters the rows were produced under, already assembled into one line,
     * or undefined when nothing is filtered.
     */
    filterLine?: string;
    /** Passed in rather than read from the clock here, so every sheet of one
     *  print carries the same timestamp. */
    generatedAt: Date;
    orientation: PageOrientation;
}

export const InventoryReport: React.FC<InventoryReportProps> = ({
    pallets,
    evidenceUrls,
    overdueThreshold,
    filterLine,
    generatedAt,
    orientation,
}) => {
    const t = useT();
    const r = t.inventory.report;

    const columns: ReportColumn<Pallet>[] = [
        {
            // "ID" stays as it is -- staff say it in English and it reads the
            // same in both languages.
            key: 'id',
            header: 'ID',
            width: 11,
            render: (p) => <span className="font-mono font-semibold text-slate-800">{p.pallet_id}</span>,
        },
        {
            key: 'status',
            header: t.common.status,
            width: 11,
            render: (p) => (
                <ReportPill
                    label={t.status[p.status as PalletStatus] ?? t.status.unknown}
                    tone={STATUS_PILL[p.status] ?? NEUTRAL_PILL}
                />
            ),
        },
        {
            key: 'location',
            header: t.common.location,
            width: 17,
            // A location is a department name an admin typed on the locations
            // screen. It prints verbatim, never translated -- the same rule the
            // filter bar and the CSV export follow.
            render: (p) => p.current_location,
        },
        {
            key: 'updated',
            header: t.inventory.lastUpdated,
            width: 15,
            render: (p) => (p.last_transaction_date ? formatDateTime(p.last_transaction_date) : '—'),
        },
        {
            key: 'checkout',
            header: t.inventory.lastCheckout,
            width: 15,
            render: (p) => (p.last_checkout_date ? formatDateTime(p.last_checkout_date) : '—'),
        },
        {
            key: 'overdue',
            header: t.inventory.overdue,
            width: 10,
            align: 'right',
            render: (p) => {
                const over = overdueDays(p, overdueThreshold);
                if (!over) return <span className="text-slate-300">—</span>;
                // Red for genuinely late, plain for merely checked out. Colour is
                // not the only carrier here any more than it is on screen -- the
                // number itself is the reading, and the threshold is stated in
                // the masthead's summary band.
                return (
                    <span className={over.late ? 'font-semibold text-red-600' : 'text-slate-600'}>
                        {t.inventory.daysCount(over.days)}
                    </span>
                );
            },
        },
        {
            key: 'remark',
            header: t.common.remark,
            width: 21,
            render: (p) => p.pallet_remark || <span className="text-slate-300">—</span>,
        },
    ];

    // Counted from the ROWS ON THE SHEET, not from the screen's status strip.
    // The strip counts the whole fleet; this document may be a filtered view of
    // it, and a summary band that disagreed with the rows underneath it would be
    // the exact defect the filter line exists to prevent.
    const countOf = (status: PalletStatus) => pallets.filter((p) => p.status === status).length;
    const lateCount = pallets.filter((p) => overdueDays(p, overdueThreshold)?.late).length;

    const summary: ReportSummaryItem[] = [
        { label: t.status.available, value: String(countOf('available')) },
        { label: t.status.in_use, value: String(countOf('in_use')) },
        { label: t.status.damaged, value: String(countOf('damaged')) },
        { label: t.status.scrapped, value: String(countOf('scrapped')) },
        { label: t.inventory.overdue, value: String(lateCount) },
    ];

    // Only pallets that are actually on this sheet, and only those with a photo
    // that signed successfully. An appendix listing a pallet the table never
    // mentioned would be describing something the reader cannot look up.
    const photos = pallets
        .map((p) => ({ pallet: p, url: evidenceUrls[p.pallet_id] }))
        .filter((entry): entry is { pallet: Pallet; url: string } => Boolean(entry.url));

    const cols = photoColumns(orientation);
    const photoPages = photos.length > 0 ? chunkPages(photos, photosPerPage(orientation), photosPerPage(orientation)) : [];

    const appendix = photoPages.map((pagePhotos, index) => ({
        key: `photos-${index}`,
        section: r.photoSection,
        body: (
            <div
                className="grid content-start"
                style={{
                    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                    gap: `${CARD_GAP_MM}mm`,
                }}
            >
                {pagePhotos.map(({ pallet, url }) => (
                    <figure
                        key={pallet.pallet_id}
                        className="flex flex-col overflow-hidden rounded border border-slate-300"
                        style={{ height: `${CARD_MM}mm` }}
                    >
                        <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-50 p-1">
                            {/* `loading="eager"` because the default lazy loading
                                never fires for an image that has not been
                                scrolled into view -- and on paper nothing
                                scrolls, so a lazy image prints as a blank box.
                                useReportPrint additionally awaits decode() on
                                every image before it opens the dialog. */}
                            <img
                                src={url}
                                alt={`${t.inventory.evidencePhoto}: ${pallet.pallet_id}`}
                                loading="eager"
                                className="max-h-full max-w-full object-contain"
                            />
                        </div>
                        <figcaption className="flex shrink-0 items-baseline gap-1.5 border-t border-slate-200 px-1 py-0.5 text-[8px] text-slate-500">
                            <span className="font-mono font-semibold text-slate-700">
                                {pallet.pallet_id}
                            </span>
                            <span className="truncate">{pallet.current_location}</span>
                        </figcaption>
                    </figure>
                ))}
            </div>
        ),
    }));

    // The photo count joins the scope line rather than the summary band. It
    // describes the DOCUMENT -- how many sheets follow the table -- where the
    // band describes the fleet.
    const scopeLine =
        photos.length > 0
            ? `${r.scope(pallets.length)} · ${r.photoScope(photos.length)}`
            : r.scope(pallets.length);

    return (
        <ReportTableDocument<Pallet>
            orientation={orientation}
            documentTitle={t.inventory.reportTitle}
            subtitle={r.subtitle}
            generatedOn={t.common.generatedOn(formatDateTime(generatedAt))}
            filterLine={filterLine}
            scopeLine={scopeLine}
            summary={summary}
            section={r.section}
            columns={columns}
            rows={pallets}
            rowKey={(p) => p.pallet_id}
            emptyLabel={r.empty}
            pageLabel={t.common.pageOf}
            appendix={appendix}
        />
    );
};
