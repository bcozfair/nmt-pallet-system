import React, { useState } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';

export interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    confirmLabel: string;
    cancelLabel: string;
    closeLabel: string;
    /** ป้ายปุ่มยืนยันขณะคำขอยังไม่กลับ */
    workingLabel: string;
    isDestructive?: boolean;
    onConfirm: () => void | Promise<void>;
    onCancel: () => void;
    /** เรียกเมื่อ onConfirm ปฏิเสธ -- ผู้เรียกเป็นคนตัดสินใจว่าจะแสดงยังไง
     *  (ไฟล์ในโฟลเดอร์นี้ import dictionary ไม่ได้ จึง toast เองไม่ได้) */
    onError?: (error: unknown) => void;
}

// preset ตัวเดียวที่สร้างทับ Modal เพราะกล่องยืนยันเป็นของ config-shaped จริง ๆ
// (หัวเรื่อง ข้อความ ปุ่มสองปุ่ม จบ) และของเดิมซ้ำอยู่สองไฟล์ที่เกือบเหมือนกันเป๊ะ
// โมดัลอื่นทุกตัวยังเขียนเนื้อเองผ่าน Modal โดยตรง -- เหตุผลเดียวกับที่ DataTable
// ไม่รับ columns[]+rows[] (components/ui/index.ts:67-71)
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    confirmLabel,
    cancelLabel,
    closeLabel,
    workingLabel,
    isDestructive = false,
    onConfirm,
    onCancel,
    onError,
}) => {
    const [isWorking, setIsWorking] = useState(false);

    // onConfirm ปฏิเสธได้จริง: scrapPallet() ปฏิเสธพาเลทที่ไม่ได้เสียหาย และทุกตัว
    // พังได้จาก RLS หรือเน็ต ถ้าไม่ดัก rejection จะหลุดเป็น unhandled แล้วกล่องนั่ง
    // ค้างอยู่เฉย ๆ โดยไม่มีข้อความ -- ดูเหมือนปุ่มตาย
    const handleConfirm = async () => {
        setIsWorking(true);
        try {
            await onConfirm();
            onCancel();
        } catch (error) {
            onError?.(error);
        } finally {
            setIsWorking(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onCancel}
            title={title}
            icon={isDestructive ? AlertTriangle : CheckCircle}
            tone={isDestructive ? 'danger' : 'brand'}
            size="sm"
            closeLabel={closeLabel}
            busy={isWorking}
            // ไม่ใส่ dismissOnBackdrop โดยตั้งใจ: กล่องนี้ถามคำถามที่ต้องถูกตอบ
            // การปัดทิ้งด้วยการคลิกพลาดข้าง ๆ ทำให้ไม่รู้ว่าตกลงเกิดอะไรขึ้นหรือเปล่า
            footer={
                <>
                    <Button variant="secondary" onClick={onCancel} disabled={isWorking}>
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={isDestructive ? 'dangerSolid' : 'primary'}
                        onClick={handleConfirm}
                        disabled={isWorking}
                    >
                        {isWorking ? workingLabel : confirmLabel}
                    </Button>
                </>
            }
        >
            <p className="text-sm leading-relaxed text-slate-600">{message}</p>
        </Modal>
    );
};
