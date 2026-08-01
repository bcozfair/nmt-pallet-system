
import React, { useCallback } from 'react';
import { Pallet } from '../../../types';
import { ConfirmDialog, StickyHeader } from '../../ui';
import { ReportPrintHost, useReportPrint } from '../../report';
import { InventoryReport } from './report/InventoryReport';
import { toast } from '../../../services/toast';
import { describeAppError } from '../../../services/appError';
import { exportInventoryCSV } from '../../../utils/exportHelpers';
import { useT } from '../../../hooks/useT';

// Sub-components
import { InventoryFilters } from './InventoryFilters';
import { InventoryHeader } from './InventoryHeader';
import { InventorySelectionBar } from './InventorySelectionBar';
import { InventoryStatusStrip } from './InventoryStatusStrip';
import { InventoryTable } from './InventoryTable';
import { AddPalletModal, EditPalletModal } from './InventoryModals';
import { BulkTransactionModal } from './BulkTransactionModal';

// Hooks
import { useInventoryFilters } from '../../../hooks/inventory/useInventoryFilters';
import { useInventorySelection } from '../../../hooks/inventory/useInventorySelection';
import { useInventoryActions } from '../../../hooks/inventory/useInventoryActions';
import { useInventoryEvidence } from '../../../hooks/inventory/useInventoryEvidence';

export const InventoryView = ({
    pallets,
    onRefresh,
    onSelectPallet,
    onPrintQr,
    initialFilter = 'all',
    initialLocation = 'all',
    onLocationChange,
    isLoading
}: {
    pallets: Pallet[],
    onRefresh: () => void,
    onSelectPallet: (id: string) => void,
    onPrintQr: (pallets: Pallet[]) => void,
    initialFilter?: string,
    initialLocation?: string,
    onLocationChange?: (location: string) => void,
    // Before this prop existed, the strip and the table had nothing to tell
    // them a fetch was still in flight, so a fresh page load rendered zero
    // counts and "No pallets found" for a moment before the real data landed
    // -- indistinguishable from an empty warehouse. See AdminDashboard.tsx's
    // `case 'inventory':` for what it is wired to.
    isLoading: boolean
}) => {
    const t = useT();

    // 1. Filtering & Data Logic
    const {
        searchTerm, setSearchTerm,
        statusFilter, setStatusFilter,
        locationFilter, setLocationFilter,
        dateRange, setDateRange,
        departments,
        overdueThreshold,
        sortConfig, handleSort,
        currentPage, setCurrentPage,
        itemsPerPage, totalPages,
        processedPallets, paginatedPallets,
        statusCounts,
        activeFilterCount,
        handleClearFilters
    } = useInventoryFilters(pallets, initialFilter, initialLocation);

    // 2. Selection Logic
    const {
        selectedIds, setSelectedIds,
        handleSelectAll, handleSelectRow
    } = useInventorySelection(processedPallets);

    // 3. Actions Logic
    const {
        isAddModalOpen, setIsAddModalOpen,
        isBulkTransModalOpen, setIsBulkTransModalOpen,
        editPallet, setEditPallet,
        confirmAction, setConfirmAction,
        handleDeleteClick,
        handleBulkRepair,
        handleBulkDelete,
        handleRepairRow,
        handleScrapRow,
        handleBulkScrap,
        handleConfirmBulkTransaction,
        handleSavePalletEdit
    } = useInventoryActions(onRefresh, setSelectedIds);

    // 4. Printing
    //
    // THIS SCREEN NO LONGER PRINTS ITSELF. It used to: hide the chrome, unfreeze
    // the sticky header, and let a `tr[data-print-row]` rule reveal the rows
    // pagination had hidden. That produced a document, but the rows per sheet
    // were whatever the engine happened to fit, and two columns vanished from
    // the paper because they are `xl:` and A4 is narrower than `xl`.
    //
    // What replaces it is a separate A4 document that declares its own pages --
    // components/admin/inventory/report/, on the shared kit in components/report/.
    const { evidenceUrls, loadEvidence } = useInventoryEvidence();
    const { job: printJob, print: printReport } = useReportPrint();

    // Signs the damage photos first, then mounts the report. The await is the
    // whole point: the appendix exists on paper only, and a synchronous
    // window.print() would go out before a single URL came back. See
    // useInventoryEvidence for why this is not loaded when the screen opens, and
    // useReportPrint for the second half of the wait -- decoding the images once
    // they are in the DOM.
    const handlePrintReport = useCallback(async () => {
        await loadEvidence(processedPallets);
        printReport();
    }, [loadEvidence, processedPallets, printReport]);

    // What the printed sheet says the rows were filtered by. Assembled here
    // because this is the component that holds every filter's value; the report
    // only lays out whatever phrases it is handed.
    //
    // Built by pushing, not by mapping-then-filtering, so a filter at its default
    // contributes nothing at all rather than an empty phrase.
    const printFilters: string[] = [];
    if (searchTerm) printFilters.push(`${t.inventory.searchPallet}: ${searchTerm}`);
    if (statusFilter !== 'all') {
        // 'overdue' is the strip's fifth tile and is not a PalletStatus, so it
        // has no entry in `t.status` -- it reads from the inventory dictionary
        // like the tile it came from.
        const label = statusFilter === 'overdue'
            ? t.inventory.overdue
            : (t.status[statusFilter as keyof typeof t.status] ?? statusFilter);
        printFilters.push(`${t.common.status}: ${label}`);
    }
    // Location names are data an admin typed on the locations screen, so they
    // print verbatim -- the same rule InventoryFilters follows on screen.
    if (locationFilter !== 'all') printFilters.push(`${t.common.location}: ${locationFilter}`);
    if (dateRange.start || dateRange.end) {
        printFilters.push(`${t.common.date}: ${dateRange.start || '…'} – ${dateRange.end || '…'}`);
    }

    // Render Helpers
    const onPrintQrSelected = () => onPrintQr(processedPallets.filter(p => selectedIds.has(p.pallet_id)));
    const onPrintQrAll = () => onPrintQr(processedPallets);

    // Gates the bulk check-out/check-in button. Scrapped counts as unusable
    // alongside damaged: a written-off pallet must not be movable, and a
    // check-in in particular would flip it back to 'available' and undo the
    // fact that scrapped is terminal.
    const selectedIdList = Array.from(selectedIds) as string[];
    const statusOf = (id: string) => processedPallets.find(p => p.pallet_id === id)?.status;
    const hasUnusableInSelection = selectedIdList.some(id => {
        const status = statusOf(id);
        return status === 'damaged' || status === 'scrapped';
    });

    return (
        // No height and no overflow here, on purpose. This used to be a box
        // clamped to h-[calc(100vh-110px)] wrapping an inner overflow-y-auto
        // scroller wrapping the table -- the same nested-scroll-container
        // pattern AdminDashboard.tsx (around its shell div, see the comment
        // there) and index.css's print section both record as abandoned
        // everywhere else in this app, for the same two reasons: the
        // scrollbar it produces belongs to an inner box instead of the page,
        // so the wheel stops dead at that box's edge instead of continuing
        // down the document; and a box clamped to 100vh has nothing below the
        // fold to hand to the printer.
        //
        // The bottom padding reserves floor space for the selection bar, which
        // floats fixed over the bottom of the viewport and would otherwise sit
        // on top of the last table rows. It reads the bar's MEASURED height
        // from the `--selection-bar-h` custom property the bar publishes on
        // <html> rather than naming a number: the flat `pb-24` (96px) that used
        // to be here was sized for the bar alone, and the moment the user
        // opened "Show IDs" from the bar's menu the panel above it took the
        // floating stack past 200px and covered the pagination control -- with
        // no way for this file to know, because `showIds` is local state inside
        // InventorySelectionBar. `+ 1rem` is this page's own gap between the
        // last card and the bar, matching the `gap-4` above.
        //
        // Inline style, not a Tailwind arbitrary value: the number is produced
        // at runtime, and Tailwind only ever compiles classes it can read as
        // literal text in the source.
        <div
            className="flex flex-col gap-4"
            style={
                selectedIds.size > 0
                    ? { paddingBottom: 'calc(var(--selection-bar-h, 0px) + 1rem)' }
                    : undefined
            }
        >
            {/* Everything above the rows travels together and stays pinned at
                xl: the page header, the status strip and the filter bar. What
                scrolls is the rows and the pagination under them. The table's
                own head pins directly beneath this block -- see StickyHeader
                and DataTable for how the two find each other.

                The inner gap-4 is this page's own rhythm, repeated here because
                these three are no longer direct children of the column that
                sets it. */}
            <StickyHeader className="flex flex-col gap-4">
                <InventoryHeader
                    onPrintReport={handlePrintReport}
                    onPrintQrAll={onPrintQrAll}
                    // The rows that passed the filters, not the whole table:
                    // the file has to be what is on screen. exportInventoryCSV
                    // fetches everything itself when it is handed nothing, which
                    // is how the dashboard's copy of this button behaves.
                    onExport={() => void exportInventoryCSV(processedPallets)}
                    onAddPallet={() => setIsAddModalOpen(true)}
                />

                <InventoryStatusStrip
                    counts={statusCounts}
                    statusFilter={statusFilter}
                    onSelect={setStatusFilter}
                    isLoading={isLoading}
                />

                <InventoryFilters
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    locationFilter={locationFilter}
                    setLocationFilter={(loc) => {
                        setLocationFilter(loc);
                        if (onLocationChange) onLocationChange(loc);
                    }}
                    onLocationChange={onLocationChange}
                    dateRange={dateRange}
                    setDateRange={setDateRange}
                    departments={departments}
                    activeFilterCount={activeFilterCount}
                    resultCount={processedPallets.length}
                    onClearFilters={handleClearFilters}
                />
            </StickyHeader>

            <InventoryTable
                paginatedPallets={paginatedPallets}
                totalProcessedCount={processedPallets.length}
                selectedIds={selectedIds}
                onSelectAll={handleSelectAll}
                onSelectRow={handleSelectRow}
                sortConfig={sortConfig}
                onSort={handleSort}
                onSelectPallet={onSelectPallet}
                onRepairRow={handleRepairRow}
                onScrapRow={handleScrapRow}
                onPrintQr={onPrintQr}
                onDeleteClick={handleDeleteClick}
                onEditRow={(p) => setEditPallet({ id: p.pallet_id, remark: p.pallet_remark || '' })}
                overdueThreshold={overdueThreshold}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                totalPages={totalPages}
                setCurrentPage={setCurrentPage}
                onClearFilters={handleClearFilters}
                isLoading={isLoading}
            />

            <InventorySelectionBar
                selectedCount={selectedIds.size}
                selectedIds={Array.from(selectedIds)}
                onClearSelection={() => setSelectedIds(new Set())}
                onBulkRepair={() => handleBulkRepair(selectedIds)}
                onBulkScrap={() => handleBulkScrap(selectedIds)}
                onBulkDelete={() => handleBulkDelete(selectedIds)}
                onPrintQrSelected={onPrintQrSelected}
                onBulkTransaction={() => setIsBulkTransModalOpen(true)}
                showRepairButton={selectedIds.size > 0 && selectedIdList.every(id => statusOf(id) === 'damaged')}
                showTransactionButton={!hasUnusableInSelection}
            />

            <BulkTransactionModal
                isOpen={isBulkTransModalOpen}
                onClose={() => setIsBulkTransModalOpen(false)}
                onConfirm={(action, dest, remark, time) => handleConfirmBulkTransaction(selectedIds, action, dest, remark, time)}
                selectedCount={selectedIds.size}
                selectedIds={Array.from(selectedIds)}
                departments={departments}
            />

            <AddPalletModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={onRefresh}
                departments={departments}
            />

            {editPallet && (
                <EditPalletModal
                    isOpen={!!editPallet}
                    pallet={editPallet}
                    onClose={() => setEditPallet(null)}
                    onSave={(id, updates) => handleSavePalletEdit(id, processedPallets.find(p => p.pallet_id === id), updates)}
                />
            )}

            {/* เรนเดอร์เฉพาะตอนมี action จริง เพื่อให้ state ภายใน (กำลังทำงาน)
                ถูกล้างทุกครั้งที่เปิดกล่องใหม่ -- ของเดิม ConfirmModal ทำแบบเดียวกัน
                ด้วย `if (!action) return null` ข้างใน */}
            {confirmAction && (
                <ConfirmDialog
                    isOpen
                    title={confirmAction.title}
                    message={confirmAction.message}
                    confirmLabel={confirmAction.confirmLabel}
                    cancelLabel={t.common.cancel}
                    closeLabel={t.common.closeDialog}
                    workingLabel={t.common.working}
                    isDestructive={confirmAction.isDestructive}
                    onConfirm={confirmAction.onConfirm}
                    onCancel={() => setConfirmAction(null)}
                    onError={(error) => toast.error(describeAppError(error))}
                />
            )}

            {/* Mounted only while a print is in flight. It portals as many sheets
                as the filtered rows need into <body>; building that on every
                visit to this screen, for an admin who never presses the button,
                would be pure cost -- and this is the screen most of them open
                first every morning. */}
            {printJob && (
                <ReportPrintHost>
                    <InventoryReport
                        pallets={processedPallets}
                        evidenceUrls={evidenceUrls}
                        overdueThreshold={overdueThreshold}
                        filterLine={
                            printFilters.length > 0
                                ? `${t.common.printFilters} ${printFilters.join(' · ')}`
                                : undefined
                        }
                        generatedAt={printJob.at}
                    />
                </ReportPrintHost>
            )}
        </div>
    );
};
