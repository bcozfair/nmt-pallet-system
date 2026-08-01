
import { useState } from 'react';
import { Pallet } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { deletePallet, updatePallet } from '../../services/palletService';
import { resolveDamage, scrapPallet, createBulkTransaction } from '../../services/transactionService';
import { toast } from '../../services/toast';
import { dict } from '../../services/i18n';
import { describeAppError } from '../../services/appError';

// Text here is read through dict() rather than useT(). Every string below is
// produced inside a handler -- either frozen into confirmAction state at click
// time, or fired from a toast after an await -- so it has to be looked up when
// the handler runs, not when the hook last rendered. useT() would also make the
// whole inventory view re-render on a language change for no visible gain.

// ย้ายมาจาก InventoryModals.tsx ตอนที่ ConfirmModal ที่นั่นถูกยุบเข้า
// ui/ConfirmDialog -- type นี้อธิบายสิ่งที่ hook นี้ "สร้างขึ้น" ไม่ใช่สิ่งที่
// คอมโพเนนต์ตัวใดตัวหนึ่งรับ จึงควรอยู่ที่ต้นทางของมัน
export type ConfirmActionType = {
    title: string;
    message: string;
    confirmLabel: string;
    isDestructive?: boolean;
    onConfirm: () => Promise<void>;
};

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
        // Nothing selected means there is nothing to write. The route that used
        // to produce this -- Escape over the open bulk modal clearing the
        // selection behind it while the confirm button stayed enabled -- is
        // closed at the source now (SelectionBar no longer claims Escape while
        // a dialog is open), but a handler that issues writes should not take
        // its caller's word for the list being non-empty. Without this it fired
        // an empty batch and then reported "successfully processed 0 items",
        // which reads as a completed job.
        const ids = Array.from(selectedIds) as string[];
        if (ids.length === 0) return;

        try {
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
            // โยนต่อ ไม่ toast เอง
            //
            // ของเดิมดักแล้ว toast แล้วจบ ฟังก์ชันนี้จึง resolve เสมอไม่ว่าจะสำเร็จ
            // หรือไม่ ส่วน EditPalletModal เรียก `await onSave(...)` แล้ว `onClose()`
            // ในบรรทัดถัดไป ผลคือรหัสซ้ำ (23505) ทำให้โมดัลปิด ข้อความที่พิมพ์ไป
            // หายหมด เหลือ toast สีแดงใบเดียวลอยอยู่ -- ไม่มีทางกลับไปแก้ค่าเดิม
            //
            // ข้อความยังแปลที่นี่เหมือนเดิม เพราะที่นี่คือที่เดียวที่รู้จักรหัส error
            // ของ Postgres ฝั่งโมดัลรับไปแสดงใต้ช่องที่ผิดจริง ๆ แทนที่จะเด้งอยู่บนสุด
            // ของจอขณะที่สายตาอยู่ที่ช่องกรอก
            const msg = error.code === '23505' ? dict().inventory.idExists : dict().inventory.updateFailed;
            throw new Error(msg);
        }
    };

    // `handleExportFiltered` used to live here: a second, hand-rolled CSV builder
    // for the inventory screen's Export List button. It is gone -- InventoryView
    // now calls exportInventoryCSV(processedPallets) directly, and that function's
    // header comment lists the three defects the duplicate carried (mojibake in
    // Excel, unescaped quotes, no formula-injection guard). A hook that owns modal
    // state and write handlers had no business assembling a file format anyway.

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
        handleSavePalletEdit
    };
};
