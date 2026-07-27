
import React from 'react';
import { Pallet } from '../../../types';

// Sub-components
import { InventoryFilters } from './InventoryFilters';
import { InventoryHeader } from './InventoryHeader';
import { InventoryStatusStrip } from './InventoryStatusStrip';
import { InventoryTable } from './InventoryTable';
import { AddPalletModal, ConfirmModal, EditPalletModal } from './InventoryModals';
import { BulkTransactionModal } from './BulkTransactionModal';

// Hooks
import { useInventoryFilters } from '../../../hooks/inventory/useInventoryFilters';
import { useInventorySelection } from '../../../hooks/inventory/useInventorySelection';
import { useInventoryActions } from '../../../hooks/inventory/useInventoryActions';

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

    // 1. Filtering & Data Logic
    const {
        searchTerm, setSearchTerm,
        statusFilter, setStatusFilter,
        showOverdueOnly, setShowOverdueOnly,
        locationFilter, setLocationFilter,
        dateRange, setDateRange,
        departments,
        overdueThreshold,
        sortConfig, handleSort,
        currentPage, setCurrentPage,
        itemsPerPage, totalPages,
        processedPallets, paginatedPallets,
        statusCounts,
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
        handleSavePalletEdit,
        handleExportFiltered
    } = useInventoryActions(onRefresh, setSelectedIds);

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
        // fold to hand to the printer. `pb-24` reserves floor space for the
        // selection bar, which floats fixed over the bottom of the viewport
        // and would otherwise sit on top of the last table rows.
        <div className={`flex flex-col gap-6 ${selectedIds.size > 0 ? 'pb-24' : ''}`}>
            <InventoryHeader
                selectedCount={selectedIds.size}
                selectedIds={Array.from(selectedIds)}
                onClearSelection={() => setSelectedIds(new Set())}
                onBulkRepair={() => handleBulkRepair(selectedIds)}
                onBulkScrap={() => handleBulkScrap(selectedIds)}
                onBulkDelete={() => handleBulkDelete(selectedIds)}
                onPrintQrSelected={onPrintQrSelected}
                onPrintQrAll={onPrintQrAll}
                onExport={() => handleExportFiltered(processedPallets)}
                onAddPallet={() => setIsAddModalOpen(true)}
                onBulkTransaction={() => setIsBulkTransModalOpen(true)}
                showRepairButton={selectedIds.size > 0 && selectedIdList.every(id => statusOf(id) === 'damaged')}
                showTransactionButton={!hasUnusableInSelection}
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
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                dateRange={dateRange}
                setDateRange={setDateRange}
                showOverdueOnly={showOverdueOnly}
                setShowOverdueOnly={setShowOverdueOnly}
                departments={departments}
            />

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

            <ConfirmModal
                action={confirmAction}
                onClose={() => setConfirmAction(null)}
            />
        </div>
    );
};
