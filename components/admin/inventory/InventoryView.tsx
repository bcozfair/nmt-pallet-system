
import React from 'react';
import { Pallet } from '../../../types';

// Sub-components
import { InventoryFilters } from './InventoryFilters';
import { InventoryHeader } from './InventoryHeader';
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
    onLocationChange
}: {
    pallets: Pallet[],
    onRefresh: () => void,
    onSelectPallet: (id: string) => void,
    onPrintQr: (pallets: Pallet[]) => void,
    initialFilter?: string,
    initialLocation?: string,
    onLocationChange?: (location: string) => void
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
        handleConfirmBulkTransaction,
        handleSavePalletEdit,
        handleExportFiltered
    } = useInventoryActions(onRefresh, setSelectedIds);

    // Render Helpers
    const onPrintQrSelected = () => onPrintQr(processedPallets.filter(p => selectedIds.has(p.pallet_id)));
    const onPrintQrAll = () => onPrintQr(processedPallets);

    const hasDamagedInSelection = Array.from(selectedIds).some(id => processedPallets.find(p => p.pallet_id === id)?.status === 'damaged');

    return (
        <div className="h-[calc(100vh-110px)] flex flex-col gap-6 overflow-hidden">
            <div className="shrink-0">
                <InventoryHeader
                    selectedCount={selectedIds.size}
                    selectedIds={Array.from(selectedIds)}
                    onClearSelection={() => setSelectedIds(new Set())}
                    onBulkRepair={() => handleBulkRepair(selectedIds)}
                    onBulkDelete={() => handleBulkDelete(selectedIds)}
                    onPrintQrSelected={onPrintQrSelected}
                    onPrintQrAll={onPrintQrAll}
                    onExport={() => handleExportFiltered(processedPallets)}
                    onAddPallet={() => setIsAddModalOpen(true)}
                    onBulkTransaction={() => setIsBulkTransModalOpen(true)}
                    showRepairButton={selectedIds.size > 0 && Array.from(selectedIds).every(id => processedPallets.find(p => p.pallet_id === id)?.status === 'damaged')}
                    showTransactionButton={!hasDamagedInSelection}
                />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-2 flex flex-col gap-6 styled-scrollbar">
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
            </div>

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
