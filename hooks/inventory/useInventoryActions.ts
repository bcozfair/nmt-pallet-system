
import { useState } from 'react';
import { Pallet, Transaction } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { deletePallet, updatePallet } from '../../services/palletService';
import { resolveDamage, createBulkTransaction } from '../../services/transactionService';
import { fetchUsers } from '../../services/userService';
import { supabase } from '../../services/supabase';
import { toast } from '../../services/toast';
import { formatDate } from '../../components/admin/common/AdminHelpers';
import { ConfirmActionType } from '../../components/admin/inventory/InventoryModals';

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

    const handleDeleteClick = (id: string) => {
        setConfirmAction({
            title: "Delete Pallet?",
            message: `Are you sure you want to delete ${id}? This action cannot be undone.`,
            confirmLabel: "Delete",
            isDestructive: true,
            onConfirm: async () => {
                await deletePallet(id);
                toast.success(`Pallet ${id} deleted.`);
                onRefresh();
            }
        });
    };

    const handleBulkRepair = (selectedIds: Set<string>) => {
        setConfirmAction({
            title: "Repair Selected Items?",
            message: `Mark ${selectedIds.size} items as Repaired (Available)?`,
            confirmLabel: "Mark Repaired",
            isDestructive: false,
            onConfirm: async () => {
                await Promise.all(Array.from(selectedIds).map((id: string) => resolveDamage(id, 'repair', user?.id)));
                toast.success(`${selectedIds.size} items marked as repaired.`);
                setSelectedIds(new Set());
                onRefresh();
            }
        });
    };

    const handleBulkDelete = (selectedIds: Set<string>) => {
        setConfirmAction({
            title: "Delete Selected Items?",
            message: `Are you sure you want to PERMANENTLY DELETE ${selectedIds.size} pallets? This cannot be undone.`,
            confirmLabel: "Delete All",
            isDestructive: true,
            onConfirm: async () => {
                await Promise.all(Array.from(selectedIds).map((id: string) => deletePallet(id)));
                toast.success(`${selectedIds.size} items deleted.`);
                setSelectedIds(new Set());
                onRefresh();
            }
        });
    };

    const handleRepairRow = (id: string) => {
        setConfirmAction({
            title: "Repair Pallet?",
            message: `Mark ${id} as Repaired (Available)?`,
            confirmLabel: "Repair",
            isDestructive: false,
            onConfirm: async () => {
                await resolveDamage(id, 'repair', user?.id);
                toast.success(`Pallet ${id} repaired.`);
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
                toast.error(`Processed ${result.success.length} items. Failed: ${result.failed.join(', ')}`);
            } else {
                toast.success(`Successfully processed ${result.success.length} items.`);
            }

            setSelectedIds(new Set());
            onRefresh();
        } catch (error: any) {
            console.error(error);
            toast.error("Bulk transaction failed: " + (error.message || "Unknown error"));
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
                newRemark = `${newRemark} (Updated: ${dateStr}, ${timeStr} by ${updater})`;
            }

            await updatePallet(currentId, {
                pallet_id: updates.pallet_id,
                pallet_remark: newRemark
            });
            toast.success("Pallet updated successfully");
            setEditPallet(null);
            onRefresh();
        } catch (error: any) {
            console.error(error);
            const msg = error.code === '23505' ? 'Pallet ID already exists' : 'Failed to update pallet';
            toast.error(msg);
        }
    };

    const handleExportFiltered = async (processedPallets: Pallet[]) => {
        toast.info("Preparing export data... This may take a moment.");

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

            const headers = [
                'Pallet ID', 'Status', 'Location', 'Date Added', 'Last Activity',
                'Last Action Type', 'Action By', 'Last Checkout', 'Overdue Days', 'Evidence URL'
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
                    p.status,
                    p.current_location,
                    formatDate(p.created_at) || '-',
                    tx ? formatDate(tx.timestamp) : '-',
                    tx ? tx.action_type : '-',
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

            toast.success(`Exported ${processedPallets.length} items successfully.`);
        } catch (error) {
            console.error("Export failed", error);
            toast.error("Export failed. Please try again.");
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
        handleConfirmBulkTransaction,
        handleSavePalletEdit,
        handleExportFiltered
    };
};
