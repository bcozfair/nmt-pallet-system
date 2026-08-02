import React, { useEffect, useId, useState } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from './Button';
import { Field } from './Field';
import { Modal } from './Modal';
import { TextInput } from './TextInput';

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
    /**
     * คำที่ต้องพิมพ์ให้ตรงก่อนปุ่มยืนยันจะกดได้ -- ไม่ใส่ = กล่องยืนยันธรรมดา
     * (พฤติกรรมเดิมทุกประการ) สำหรับคำสั่งที่ทำแล้วกู้คืนไม่ได้และไม่ได้เจาะจง
     * แถวใดแถวหนึ่ง เช่นการล้างประวัติทั้งช่วงเวลา -- การกด "ยืนยัน" เฉย ๆ ใช้
     * นิ้วเท่ากับการกดปุ่มอะไรก็ได้ การพิมพ์คำบังคับให้คนอ่านว่ากำลังทำอะไรอยู่
     */
    confirmPhrase?: string;
    /** ป้ายเหนือช่องพิมพ์ -- ต้องบอกด้วยว่าให้พิมพ์คำว่าอะไร */
    confirmPhraseLabel?: string;
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
    confirmPhrase,
    confirmPhraseLabel,
    onConfirm,
    onCancel,
    onError,
}) => {
    const [isWorking, setIsWorking] = useState(false);
    const [typedPhrase, setTypedPhrase] = useState('');
    const phraseInputId = useId();

    const needsPhrase = confirmPhrase != null && confirmPhrase.trim() !== '';

    // เทียบแบบตัดช่องว่างหัวท้ายและไม่สนตัวพิมพ์เล็กใหญ่ -- ด่านนี้มีไว้บังคับให้
    // "อ่านแล้วพิมพ์ตาม" ไม่ใช่ไว้จับผิด Caps Lock ภาษาไทยไม่มีตัวพิมพ์ใหญ่อยู่แล้ว
    // ส่วนคำอังกฤษที่เขียนเป็นตัวใหญ่ทั้งคำจะพลาดตรงนี้บ่อยโดยไม่ได้ปลอดภัยขึ้นเลย
    const phraseMatches =
        !needsPhrase ||
        typedPhrase.trim().toLocaleLowerCase() === confirmPhrase.trim().toLocaleLowerCase();

    // call site ทุกที่เรนเดอร์กล่องนี้เฉพาะตอนมี action (state จึงเกิดใหม่ทุกครั้ง)
    // แต่ prop `isOpen` เปิดทางให้เรนเดอร์ค้างไว้ได้ -- ถ้ามีใครทำแบบนั้น คำที่พิมพ์
    // ค้างจากรอบก่อนจะทำให้ปุ่มยืนยันของรอบใหม่กดได้ทันที ซึ่งคือการยกด่านทิ้งเงียบ ๆ
    useEffect(() => {
        if (!isOpen) setTypedPhrase('');
    }, [isOpen]);

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
            preventDismiss={isWorking}
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
                        disabled={isWorking || !phraseMatches}
                    >
                        {isWorking ? workingLabel : confirmLabel}
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <p className="text-sm leading-relaxed text-slate-600">{message}</p>

                {/* ไม่ส่งช่องนี้เข้า `initialFocusRef` ของ Modal โดยตั้งใจ: การเปิด
                    กล่องมาแล้วเคอร์เซอร์รออยู่ในช่องพอดีทำให้พิมพ์รัวต่อได้เลย
                    ซึ่งย้อนกลับไปหาสิ่งที่ด่านนี้ตั้งใจกัน คนใช้ต้องเลือกเองว่าจะ
                    ไปที่ช่อง (Tab หรือคลิก) */}
                {needsPhrase && (
                    <Field label={confirmPhraseLabel ?? confirmPhrase} htmlFor={phraseInputId}>
                        {(control) => (
                            <TextInput
                                {...control}
                                value={typedPhrase}
                                onChange={(event) => setTypedPhrase(event.target.value)}
                                disabled={isWorking}
                                // ปิดตัวช่วยของเบราว์เซอร์ทั้งชุด -- ช่องนี้ไม่ใช่ฟอร์ม
                                // ที่ควรกรอกให้เร็วขึ้น ค่าที่เติมให้อัตโนมัติเท่ากับ
                                // การกดยืนยันแทนคนใช้
                                autoComplete="off"
                                autoCorrect="off"
                                spellCheck={false}
                            />
                        )}
                    </Field>
                )}
            </div>
        </Modal>
    );
};
