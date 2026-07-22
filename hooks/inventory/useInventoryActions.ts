
import { useState } from 'react';
import { Pallet, Transaction } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { deletePallet, updatePallet } from '../../services/palletService';
import { resolveDamage, scrapPallet, createBulkTransaction } from '../../services/transactionService';
import { fetchUsers } from '../../services/userService';
import { supabase } from '../../services/supabase';
import { toast } from '../../services/toast';
import { dict } from '../../services/i18n';
import { formatDate, palletStatusLabel } from '../../components/admin/common/AdminHelpers';
import { ConfirmActionType } from '../../components/admin/inventory/InventoryModals';
import { describeAppError } from '../../services/appError';

// Text here is read through dict() rather than useT(). Every string below is
// produced inside a handler -- either frozen into confirmAction state at click
// time, or fired from a toast after an await -- so it has to be looked up when
// the handler runs, not when the hook last rendered. useT() would also make the
// whole inventory view re-render on a language change for no visible gain.

export const useInventoryActions = (
    onRefresh: () => void,
    setSelectedIds: (ids: Set<string>) => void
) => {
    const { user } = useAuth();

    // Modals State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isBulkTransModalOpen, setIsBulkTransModalOpen] = useState(false);
    const [editPallet, setEditPallet] = useState<{ id: string, remark: string } | null>(null);
    const [confirmAction, setConfirmAction] = useState<ConfirmActionType | null>(null);

    // --- Action Handlers ---

    // The warning has to name the history loss. transactions.pallet_id is
    // ON DELETE CASCADE, so this does not just remove the pallet -- it removes
    // every record of what the pallet ever did. Scrapping is the option that
    // retires a pallet and keeps the trail.
    const handleDeleteClick = (id: string) => {
        setConfirmAction({
            title: dict().inventory.deleteTitle,
            message: dict().inventory.deleteMessage(id),
            confirmLabel: dict().common.delete,
            isDestructive: true,
            onConfirm: async () => {
                await deletePallet(id);
                toast.success(dict().inventory.palletDeleted(id));
                onRefresh();
            }
        });
    };

    const handleBulkRepair = (selectedIds: Set<string>) => {
        setConfirmAction({
            title: dict().inventory.bulkRepairTitle,
            message: dict().inventory.bulkRepairMessage(selectedIds.size),
            confirmLabel: dict().inventory.markRepaired,
            isDestructive: false,
            onConfirm: async () => {
                await Promise.all(Array.from(selectedIds).map((id: string) => resolveDamage(id, user?.id)));
                toast.success(dict().inventory.repairedCount(selectedIds.size));
                setSelectedIds(new Set());
                onRefresh();
            }
        });
    };

    const handleBulkDelete = (selectedIds: Set<string>) => {
        setConfirmAction({
            title: dict().inventory.bulkDeleteTitle,
            message: dict().inventory.bulkDeleteMessage(selectedIds.size),
            confirmLabel: dict().inventory.deleteAll,
            isDestructive: true,
            onConfirm: async () => {
                await Promise.all(Array.from(selectedIds).map((id: string) => deletePallet(id)));
                toast.success(dict().inventory.deletedCount(selectedIds.size));
                setSelectedIds(new Set());
                onRefresh();
            }
        });
    };

    const handleRepairRow = (id: string) => {
        setConfirmAction({
            title: dict().inventory.repairTitle,
            message: dict().inventory.repairMessage(id),
            confirmLabel: dict().inventory.repair,
            isDestructive: false,
            onConfirm: async () => {
                await resolveDamage(id, user?.id);
                toast.success(dict().inventory.palletRepaired(id));
                onRefresh();
            }
        });
    };

    // Scrapping is destructive in the sense that matters: it is terminal, and
    // the only way back is to create a new pallet. The evidence photo and the
    // whole history survive, which is the difference from Delete.
    const handleScrapRow = (id: string) => {
        setConfirmAction({
            title: dict().inventory.scrapTitle,
            message: dict().inventory.scrapMessage(id),
            confirmLabel: dict().inventory.scrap,
            isDestructive: true,
            onConfirm: async () => {
                await scrapPallet(id, user?.id);
                toast.success(dict().inventory.palletScrapped(id));
                onRefresh();
            }
        });
    };

    const handleBulkScrap = (selectedIds: Set<string>) => {
        setConfirmAction({
            title: dict().inventory.bulkScrapTitle,
            message: dict().inventory.bulkScrapMessage(selectedIds.size),
            confirmLabel: dict().inventory.scrapAll,
            isDestructive: true,
            onConfirm: async () => {
                await Promise.all(Array.from(selectedIds).map((id: string) => scrapPallet(id, user?.id)));
                toast.success(dict().inventory.scrappedCount(selectedIds.size));
                setSelectedIds(new Set());
                onRefresh();
            }
        });
    };

    const handleConfirmBulkTransaction = async (
        selectedIds: Set<string>,
        action: 'check_out' | 'check_in',
        destination: string,
        remark: string,
        timestamp: string
    ) => {
        try {
            const ids = Array.from(selectedIds) as string[];
            const result = await createBulkTransaction(
                ids,
                action,
                user?.id || 'admin',
                destination,
                remark,
                timestamp
            );

            if (result.failed.length > 0) {
                toast.error(dict().inventory.bulkPartial(result.success.length, result.failed.join(', ')));
            } else {
                toast.success(dict().inventory.bulkDone(result.success.length));
            }

            setSelectedIds(new Set());
            onRefresh();
        } catch (error: any) {
            console.error(error);
            toast.error(dict().inventory.bulkFailed(describeAppError(error)));
        }
    };

    const handleSavePalletEdit = async (
        currentId: string,
        originalPallet: Pallet | undefined,
        updates: { pallet_id: string; pallet_remark: string }
    ) => {
        try {
            const originalRemark = originalPallet?.pallet_remark || '';
            let newRemark = updates.pallet_remark;

            if (newRemark !== originalRemark) {
                const d = new Date();
                const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                const updater = user?.full_name || 'ADMIN';
                // Deliberately not translated: this suffix is written into
                // pallet_remark and stored, so translating it would stamp the
                // editor's UI language onto the record and leave the same column
                // reading differently row by row. Same reasoning as the fixed
                // en-GB date above.
                newRemark = `${newRemark} (Updated: ${dateStr}, ${timeStr} by ${updater})`;
            }

            await updatePallet(currentId, {
                pallet_id: updates.pallet_id,
                pallet_remark: newRemark
            });
            toast.success(dict().inventory.palletUpdated);
            setEditPallet(null);
            onRefresh();
        } catch (error: any) {
            console.error(error);
            const msg = error.code === '23505' ? dict().inventory.idExists : dict().inventory.updateFailed;
            toast.error(msg);
        }
    };

    const handleExportFiltered = async (processedPallets: Pallet[]) => {
        toast.info(dict().csv.preparingInventory);

        try {
            // 1. Fetch Users Data for mapping IDs to Names
            const users = await fetchUsers();
            const userMap = users.reduce((acc, u) => ({ ...acc, [u.id]: u.full_name }), {} as Record<string, string>);

            // 2. Fetch Latest Transactions for all filtered pallets
            const palletIds = processedPallets.map(p => p.pallet_id);
            const chunkSize = 50;
            const latestTxMap: Record<string, Transaction> = {};

            // Process in chunks
            for (let i = 0; i < palletIds.length; i += chunkSize) {
                const chunk = palletIds.slice(i, i + chunkSize);
                const { data } = await supabase
                    .from('transactions')
                    .select('*')
                    .in('pallet_id', chunk)
                    .order('timestamp', { ascending: false });

                if (data) {
                    data.forEach(tx => {
                        if (!latestTxMap[tx.pallet_id]) {
                            latestTxMap[tx.pallet_id] = tx;
                        }
                    });
                }
            }

            // Column headers come from `csv.header` in locales/en.ts, the same
            // table the transactions export reads, so the two files agree on what
            // a column is called. Only "Last Checkout" is unique to this export.
            const col = dict().csv.header;
            const headers = [
                col.palletId, col.status, col.currentLocation, col.dateAdded, col.lastActivityDate,
                col.actionType, col.performedBy, dict().inventory.lastCheckout, col.daysOverdue, col.evidenceFile
            ];

            const rows = processedPallets.map(p => {
                const tx = latestTxMap[p.pallet_id];
                let overdue = 0;
                if (p.status === 'in_use' && p.last_checkout_date) {
                    overdue = Math.floor((new Date().getTime() - new Date(p.last_checkout_date).getTime()) / (1000 * 3600 * 24));
                }

                const evidence = tx?.evidence_image_url && tx.evidence_image_url !== 'image_deleted' ? tx.evidence_image_url : '';

                return [
                    p.pallet_id,
                    palletStatusLabel(p.status),
                    p.current_location,
                    formatDate(p.created_at) || '-',
                    tx ? formatDate(tx.timestamp) : '-',
                    // Labelled, not the raw enum: 'check_out' in a spreadsheet cell
                    // means nothing to the reader, and the status column beside it
                    // is already translated through palletStatusLabel.
                    tx ? dict().action[tx.action_type] : '-',
                    tx ? (userMap[tx.user_id] || tx.user_id) : '-',
                    formatDate(p.last_checkout_date) || '-',
                    overdue.toString(),
                    evidence
                ];
            });

            const csvContent = "data:text/csv;charset=utf-8,"
                + headers.join(",") + "\n"
                + rows.map(e => e.map(cell => `"${cell}"`).join(",")).join("\n");

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            const d = new Date();
            const dateStr = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
            link.setAttribute("download", `inventory_full_export_${dateStr}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success(dict().csv.inventoryDone(processedPallets.length));
        } catch (error) {
            console.error("Export failed", error);
            toast.error(dict().inventory.exportFailed);
        }
    };

    return {
        // Modal States
        isAddModalOpen, setIsAddModalOpen,
        isBulkTransModalOpen, setIsBulkTransModalOpen,
        editPallet, setEditPallet,
        confirmAction, setConfirmAction,

        // Action Handlers
        handleDeleteClick,
        handleBulkRepair,
        handleBulkDelete,
        handleRepairRow,
        handleScrapRow,
        handleBulkScrap,
        handleConfirmBulkTransaction,
        handleSavePalletEdit,
        handleExportFiltered
    };
};
