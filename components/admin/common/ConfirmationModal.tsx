import React from 'react';
import { ConfirmDialog } from '../../ui';
import { toast } from '../../../services/toast';
import { describeAppError } from '../../../services/appError';
import { useT } from '../../../hooks/useT';

interface ConfirmationModalProps {
    isOpen: boolean;
    /** Already translated by the caller -- these are specific to each action. */
    title: string;
    message: string;
    confirmLabel: string;
    isDestructive?: boolean;
    onConfirm: () => void | Promise<void>;
    onCancel: () => void;
}

// เหลือเป็น wrapper บาง ๆ บน ui/ConfirmDialog
//
// ไฟล์นี้ไม่ถูกลบทั้งที่เนื้อในย้ายออกไปหมดแล้ว เพราะมันทำสองอย่างที่ ConfirmDialog
// ทำเองไม่ได้: เติมข้อความที่ผู้เรียกเดิมไม่เคยต้องส่ง (ยกเลิก / ปิดหน้าต่าง /
// กำลังทำงาน) จากดิกชันนารี และเลือกช่องทางแสดง error -- ทั้งสองอย่างเป็นสิ่งที่
// components/ui/index.ts:1-7 ห้ามไฟล์ในโฟลเดอร์ ui ทำ ผลคือ SettingsView.tsx และ
// TransactionView.tsx ไม่ต้องแก้อะไรเลยแม้แต่บรรทัดเดียว
//
// สิ่งที่สอง call site ได้เพิ่มมาโดยไม่ต้องขอ: ปุ่มยืนยันขึ้นสถานะกำลังทำงานและกล่อง
// ไม่ปิดเมื่อคำขอถูกปฏิเสธ ของเดิมที่นี่ `await onConfirm()` เปล่า ๆ โดยไม่ดักอะไร
// (บรรทัด 49-51 ของไฟล์เดิม) rejection จึงหลุดเป็น unhandled และกล่องนั่งค้าง
export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    title,
    message,
    confirmLabel,
    isDestructive = false,
    onConfirm,
    onCancel,
}) => {
    const t = useT();

    return (
        <ConfirmDialog
            isOpen={isOpen}
            title={title}
            message={message}
            confirmLabel={confirmLabel}
            cancelLabel={t.common.cancel}
            closeLabel={t.common.closeDialog}
            workingLabel={t.common.loading}
            isDestructive={isDestructive}
            onConfirm={onConfirm}
            onCancel={onCancel}
            onError={(error) => toast.error(describeAppError(error))}
        />
    );
};
