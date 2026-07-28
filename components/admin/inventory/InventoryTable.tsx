import React from 'react';
import {
    CircleCheckBig, QrCode, Trash2, MapPin, AlertCircle, Clock, Edit2, FileText, Ban, PackageSearch
} from 'lucide-react';
import { Pallet } from '../../../types';
import { formatDateTime, StatusBadge } from '../common/AdminHelpers';
import { Pagination } from '../common/Pagination';
import { useT } from '../../../hooks/useT';
import { DataTable, SortableTh, Checkbox, EmptyState, Button } from '../../ui';

export type SortConfig = { key: keyof Pallet | 'days_overdue', direction: 'asc' | 'desc' } | null;

// The generic parameter SortableTh needs. Kept as a local alias rather than
// exported: `SortConfig` above is the one other modules (useInventoryFilters)
// already import, and duplicating the union under a second exported name
// would just be two names for the same type.
type SortKey = keyof Pallet | 'days_overdue';

interface InventoryTableProps {
    paginatedPallets: Pallet[];
    // We need the full list count or "select all" state logic passed down
    totalProcessedCount: number;
    selectedIds: Set<string>;
    onSelectAll: () => void;
    onSelectRow: (id: string) => void;

    // Sort
    sortConfig: SortConfig;
    onSort: (key: keyof Pallet | 'days_overdue') => void;

    // Actions
    onSelectPallet: (id: string) => void;
    onRepairRow: (id: string) => void;
    onScrapRow: (id: string) => void;
    onPrintQr: (pallets: Pallet[]) => void; // Expects an array, even if size 1
    onDeleteClick: (id: string, e: React.MouseEvent) => void;
    onEditRow: (pallet: Pallet) => void;

    // Config
    overdueThreshold: number;

    // Pagination
    currentPage: number;
    itemsPerPage: number;
    totalPages: number;
    setCurrentPage: (page: number | ((prev: number) => number)) => void;

    // Clear filters callback for "No results" empty state
    onClearFilters: () => void;

    // Before this existed, a fresh page load rendered zero rows and "No
    // pallets found" for a moment before the first fetch landed --
    // indistinguishable from an empty warehouse. See InventoryView.tsx.
    isLoading: boolean;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
    paginatedPallets,
    totalProcessedCount,
    selectedIds,
    onSelectAll,
    onSelectRow,
    sortConfig,
    onSort,
    onSelectPallet,
    onRepairRow,
    onScrapRow,
    onPrintQr,
    onDeleteClick,
    overdueThreshold,
    currentPage,
    itemsPerPage,
    totalPages,
    setCurrentPage,
    onClearFilters,
    onEditRow,
    isLoading,
}) => {
    const t = useT();

    return (
        <DataTable
            minWidth={720}
            isLoading={isLoading}
            loadingRows={10}
            loadingCols={7}
            loadingLabel={t.common.loading}
            isEmpty={totalProcessedCount === 0}
            empty={
                <EmptyState
                    icon={PackageSearch}
                    title={t.inventory.noResults}
                    action={
                        <Button variant="secondary" onClick={onClearFilters}>
                            {t.common.clearFilters}
                        </Button>
                    }
                />
            }
            footer={
                totalProcessedCount > 0 ? (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={totalProcessedCount}
                        itemsPerPage={itemsPerPage}
                    />
                ) : undefined
            }
            head={
                <tr>
                    <th scope="col" className="w-10 border-b border-slate-200 px-3 py-2.5">
                        <Checkbox
                            id="select-all-pallets"
                            ariaLabel={t.inventory.selectAllPallets}
                            checked={selectedIds.size === totalProcessedCount && totalProcessedCount > 0}
                            indeterminate={selectedIds.size > 0 && selectedIds.size < totalProcessedCount}
                            onChange={onSelectAll}
                        />
                    </th>
                    {/* "ID" stays as it is -- staff say it in English and it reads
                        the same in both languages. */}
                    <SortableTh<SortKey> label="ID" sortKey="pallet_id" sortConfig={sortConfig} onSort={onSort} />
                    <SortableTh<SortKey> label={t.common.status} sortKey="status" sortConfig={sortConfig} onSort={onSort} />
                    <SortableTh<SortKey>
                        label={t.inventory.lastUpdated}
                        sortKey="last_transaction_date"
                        sortConfig={sortConfig}
                        onSort={onSort}
                    />
                    <SortableTh<SortKey>
                        label={t.common.location}
                        sortKey="current_location"
                        sortConfig={sortConfig}
                        onSort={onSort}
                    />
                    <SortableTh<SortKey>
                        label={t.inventory.lastCheckout}
                        sortKey="last_checkout_date"
                        sortConfig={sortConfig}
                        onSort={onSort}
                        className="hidden xl:table-cell"
                    />
                    <SortableTh<SortKey>
                        label={t.inventory.overdue}
                        sortKey="days_overdue"
                        sortConfig={sortConfig}
                        onSort={onSort}
                    />
                    <SortableTh<SortKey>
                        label={t.common.remark}
                        sortKey="pallet_remark"
                        sortConfig={sortConfig}
                        onSort={onSort}
                        className="hidden xl:table-cell"
                    />
                    <SortableTh<SortKey> label={t.common.actions} sortConfig={sortConfig} align="right" />
                </tr>
            }
        >
            <tbody className="divide-y divide-slate-100">
                {paginatedPallets.map((p) => {
                    let isOverdue = false;
                    let days = 0;
                    if (p.status === 'in_use' && p.last_checkout_date) {
                        days = Math.floor(
                            (new Date().getTime() - new Date(p.last_checkout_date).getTime()) / (1000 * 3600 * 24)
                        );
                        isOverdue = days > overdueThreshold;
                    }
                    const isSelected = selectedIds.has(p.pallet_id);

                    return (
                        <tr
                            key={p.pallet_id}
                            onClick={() => onSelectPallet(p.pallet_id)}
                            className={
                                'cursor-pointer transition ' +
                                // Three complete, mutually exclusive surfaces from ONE
                                // chain, rather than a base plus an appended override.
                                // Two classes setting the same property is a coin flip
                                // decided by the order of the built stylesheet, not by
                                // the order they were written in (Button.tsx:53-59).
                                //
                                // An overdue row is a solid `bg-amber-50`, the same tone
                                // StatTile.tsx:97 already gives `warning`. An earlier
                                // attempt at a wash used `bg-yellow-200/30` and failed
                                // twice over: translucent amber sat ON TOP of a selected
                                // row's blue and mixed into a muddy colour, and at 30%
                                // on plain white it was almost invisible anyway. Both
                                // problems came from the opacity, not from the idea --
                                // an opaque fill with an explicit precedence has
                                // nothing to blend with.
                                //
                                // Selected outranks overdue, so a selected overdue row
                                // reads as blue. Overdue is not lost there: the row
                                // still carries the red day count and its alert icon,
                                // which is the accessible carrier anyway -- colour has
                                // never been the only signal here.
                                (isSelected
                                    ? 'bg-brand-50 hover:bg-brand-100'
                                    : isOverdue
                                      ? 'bg-amber-50 hover:bg-amber-100'
                                      : 'hover:bg-slate-50')
                            }
                        >
                            {/* Body cells are `py-1.5`, the header `py-2.5` (see
                                DataTable's TH_BASE). That is not drift -- the row
                                height of a table this dense is the number that
                                decides how much of the fleet fits on one screen,
                                and the header is one row that pays for itself by
                                staying easy to hit and to read.

                                `py-1.5` alone would not have shrunk anything: a
                                row is as tall as its tallest cell, and the round
                                action buttons at the end were `p-2` around a 16px
                                icon -- 32px, taller than any text in the row. They
                                came down to `p-1.5`/28px in the same pass, which
                                is what let the padding change show up at all. */}
                            <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                    ariaLabel={`${t.common.palletId}: ${p.pallet_id}`}
                                    checked={isSelected}
                                    onChange={() => onSelectRow(p.pallet_id)}
                                />
                            </td>
                            <td className="px-3 py-1.5 font-mono font-semibold text-slate-700">{p.pallet_id}</td>

                            <td className="px-3 py-1.5">
                                <StatusBadge status={p.status} />
                            </td>
                            <td className="px-3 py-1.5 text-sm text-slate-600">
                                {p.last_transaction_date ? formatDateTime(p.last_transaction_date) : '-'}
                            </td>
                            <td className="px-3 py-1.5 text-slate-600">
                                <div className="flex items-center gap-2">
                                    <MapPin size={14} className="shrink-0 text-slate-400" />
                                    {p.current_location}
                                </div>
                            </td>

                            <td className="hidden px-3 py-1.5 text-sm text-slate-500 xl:table-cell">
                                {formatDateTime(p.last_checkout_date)}
                            </td>
                            <td className="px-3 py-1.5">
                                {p.status === 'in_use' && p.last_checkout_date ? (
                                    <div
                                        className={`flex items-center gap-1 font-semibold ${
                                            isOverdue ? 'text-red-600' : 'text-slate-500'
                                        }`}
                                    >
                                        <Clock size={14} />
                                        {t.inventory.daysCount(days)}
                                        {isOverdue && <AlertCircle size={14} className="ml-1 fill-red-600 text-white" />}
                                    </div>
                                ) : (
                                    <span className="text-slate-300">-</span>
                                )}
                            </td>
                            <td
                                className="hidden max-w-[200px] truncate px-3 py-1.5 text-sm text-slate-500 xl:table-cell"
                                title={p.pallet_remark || ''}
                            >
                                {p.pallet_remark ? (
                                    <div className="flex items-center gap-1.5">
                                        <FileText size={14} className="shrink-0 text-slate-400" />
                                        <span className="truncate">{p.pallet_remark}</span>
                                    </div>
                                ) : (
                                    <span className="text-slate-300">-</span>
                                )}
                            </td>
                            <td className="px-3 py-1.5 text-right">
                                <div className="flex justify-end gap-1">
                                    {/* Both resolutions for a damaged pallet, side by side:
                                        repair it, or write it off. Scrapping is reachable
                                        only from 'damaged', so a written-off pallet always
                                        has a damage report explaining why. */}
                                    {p.status === 'damaged' && (
                                        <>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onRepairRow(p.pallet_id); }}
                                                className="rounded-full p-1.5 text-green-600 transition hover:bg-green-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                                                title={t.inventory.markRepairedTitle}
                                                aria-label={t.inventory.markRepairedTitle}
                                            >
                                                <CircleCheckBig size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onScrapRow(p.pallet_id); }}
                                                className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                                                title={t.inventory.markScrappedTitle}
                                                aria-label={t.inventory.markScrappedTitle}
                                            >
                                                <Ban size={16} />
                                            </button>
                                        </>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onPrintQr([p]); }}
                                        className="rounded-full p-1.5 text-brand-400 transition hover:bg-brand-50 hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                                        title={t.inventory.printQrTitle}
                                        aria-label={t.inventory.printQrTitle}
                                    >
                                        <QrCode size={16} />
                                    </button>
                                    {/* Tooltip used to read "Edit Transaction"; the button
                                        opens the pallet editor, not a transaction, so the
                                        label now says so. */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onEditRow(p); }}
                                        className="rounded-full p-1.5 text-brand-400 transition hover:bg-brand-50 hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                                        title={t.inventory.editPalletTitle}
                                        aria-label={t.inventory.editPalletTitle}
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDeleteClick(p.pallet_id, e); }}
                                        className="rounded-full p-1.5 text-red-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                                        title={t.inventory.deletePalletTitle}
                                        aria-label={t.inventory.deletePalletTitle}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </DataTable>
    );
};
