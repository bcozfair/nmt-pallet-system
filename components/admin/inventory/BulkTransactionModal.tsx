import React, { useId, useState } from 'react';
import { ArrowRightLeft, CheckCircle, MapPin } from 'lucide-react';
import { Department } from '../../../types';
import { useT } from '../../../hooks/useT';
import { Button, Field, Modal, SegmentedControl, SelectField, TextArea, TextInput } from '../../ui';

interface BulkTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (
        action: 'check_out' | 'check_in',
        destination: string,
        remark: string,
        timestamp: string
    ) => Promise<void>;
    selectedCount: number;
    selectedIds: string[];
    departments: Department[];
}

export const BulkTransactionModal: React.FC<BulkTransactionModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    selectedCount,
    selectedIds,
    departments
}) => {
    const t = useT();
    const fieldId = useId();
    const [action, setAction] = useState<'check_out' | 'check_in'>('check_out');
    const [destination, setDestination] = useState('');
    const [remark, setRemark] = useState('');
    // สามสถานะแยกกัน ไม่ใช่ตัวเดียวร่วม: วันที่ เวลา และปลายทาง เป็นสามช่องที่
    // อยู่คนละตำแหน่งบนกล่อง ข้อความผิดพลาดของช่องหนึ่งต้องไม่ไปโผล่ใต้อีกช่องที่
    // กรอกถูกอยู่แล้ว -- เดิมใช้ dateError ตัวเดียวคุมทั้งวันที่/เวลา ผลคือเคลียร์
    // แค่ช่องเวลาแล้วกดยืนยัน ข้อความกลับไปขึ้นใต้ช่องวันที่ที่ไม่มีอะไรผิดเลย
    const [dateError, setDateError] = useState<string | null>(null);
    const [timeError, setTimeError] = useState<string | null>(null);
    const [destinationError, setDestinationError] = useState<string | null>(null);

    // แยกวันกับเวลาเป็นสองช่อง ไม่ใช่ datetime-local ตัวเดียว: ปกติผู้ใช้แก้แค่เวลา
    // (บันทึกย้อนหลังของรอบเช้าตอนบ่าย) และช่องเดียวบังคับให้เดินผ่านวันที่ก่อนเสมอ
    const [dateStr, setDateStr] = useState(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });

    const [timeStr, setTimeStr] = useState(() => {
        const now = new Date();
        return now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    });

    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setDateError(null);
        setTimeError(null);
        setDestinationError(null);

        // ตรวจก่อนประกอบ
        //
        // ของเดิมต่อ `new Date(\`${dateStr}T${timeStr}\`).toISOString()` ตรง ๆ
        // ถ้าช่องใดช่องหนึ่งว่างจะได้ Invalid Date แล้ว .toISOString() โยน
        // RangeError ซึ่งตกลงไปใน catch ที่มีแค่ console.error -- ผู้ใช้กดยืนยัน
        // แล้วไม่มีอะไรเกิดขึ้นเลย ไม่มีข้อความ ไม่มีสัญญาณว่าพัง
        let hasError = false;

        if (!dateStr) {
            setDateError(t.inventory.invalidDateTime);
            hasError = true;
        }
        if (!timeStr) {
            setTimeError(t.inventory.invalidDateTime);
            hasError = true;
        }

        const combinedDate = new Date(`${dateStr}T${timeStr}`);
        if (!hasError && Number.isNaN(combinedDate.getTime())) {
            // ทั้งสองช่องมีค่าแล้ว แต่รวมกันแล้ว parse ไม่ได้ -- แทบเป็นไปไม่ได้จริง
            // กับ native date/time input ที่คุมฟอร์แมตให้อยู่แล้ว แต่ยังกันไว้เผื่อ
            // ไม่รู้ว่าช่องไหนเป็นตัวปัญหา จึงขึ้นข้อความใต้ทั้งสองช่อง
            setDateError(t.inventory.invalidDateTime);
            setTimeError(t.inventory.invalidDateTime);
            hasError = true;
        }

        // เบิกออกต้องมีปลายทางเสมอ -- ของเดิมพึ่ง HTML `required` บน <select> ตรง ๆ
        // ตอนนี้ฟอร์มปิด native validation ไปแล้ว (ดูคอมเมนต์ที่ `noValidate` ใน
        // <form> ข้างล่าง) ต้องตรวจเองที่นี่ ไม่งั้นส่งปลายทางว่างเปล่าไปเงียบ ๆ ได้
        if (action === 'check_out' && !destination) {
            setDestinationError(t.inventory.selectLocation);
            hasError = true;
        }

        if (hasError) return;

        setLoading(true);
        try {
            // ตีความ input เป็นเวลาท้องถิ่นของเบราว์เซอร์แล้วแปลงเป็น UTC ก่อนส่ง
            // -- ตรรกะเดิม ไม่เปลี่ยน
            await onConfirm(action, destination, remark, combinedDate.toISOString());
            onClose();
        } catch (error) {
            console.error("Bulk transaction failed", error);
            // ผู้เรียกแสดง toast เอง -- ดู handleConfirmBulkTransaction
        } finally {
            setLoading(false);
        }
    };

    const sortedIds = [...selectedIds].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t.inventory.bulkTitle}
            icon={ArrowRightLeft}
            size="md"
            busy={loading}
            closeLabel={t.common.closeDialog}
            subtitle={
                // สองคีย์ไม่ใช่ประโยคเดียว: ตัวเลขมี span หนาของตัวเอง คำจึงต้องมา
                // เป็นสองท่อน
                <>
                    {t.inventory.processingPrefix}
                    <span className="font-semibold text-brand-600">{selectedCount}</span>
                    {t.inventory.processingSuffix}
                </>
            }
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={loading}>
                        {t.common.cancel}
                    </Button>
                    <Button
                        type="submit"
                        form={`${fieldId}-form`}
                        variant="primary"
                        icon={CheckCircle}
                        disabled={loading}
                    >
                        {loading ? t.inventory.processing : t.common.confirm}
                    </Button>
                </>
            }
        >
            {/* noValidate: ปิด HTML5 constraint validation ของเบราว์เซอร์ ไม่งั้นช่อง
                `required` ที่ว่างจะโดนเบราว์เซอร์ดักไว้ก่อน -- แสดง tooltip เริ่มต้น
                ที่ไม่มีสไตล์และไม่แปลไทย แล้ว submit event จะไม่มีวันไปถึง handleSubmit
                เลยด้วยซ้ำ แอปสองภาษาต้องให้ฝั่ง JS เป็นเจ้าของ validation ทั้งหมด
                ข้อความผิดพลาดจึงสม่ำเสมอเป็นภาษาเดียวกับที่เหลือของฟอร์มเสมอ
                `required` บน input แต่ละตัวยังอยู่เพื่อความหมาย (Field ใช้ต่อ
                aria-required) แต่ไม่ได้ทำหน้าที่ปิดกั้นการ submit อีกต่อไป */}
            <form id={`${fieldId}-form`} onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* เต็มความกว้าง ไม่ใช่ครึ่งคอลัมน์: SegmentedControl กว้างตามเนื้อ
                    และป้ายไทย ("เบิกออก"/"รับคืน") กว้างกว่าอังกฤษราวเท่าตัว */}
                <Field label={t.inventory.actionLabel} htmlFor={`${fieldId}-action`}>
                    {() => (
                        // SegmentedControl เป็น role="radiogroup" จริง เดินด้วยลูกศร
                        // ได้ และเป็นวัตถุเดียวกับสวิตช์ช่วงเวลาบนแดชบอร์ด ของเดิม
                        // เป็น <button> สองตัวเปล่า ๆ ในกล่องเทา ซึ่ง screen reader
                        // ไม่มีทางรู้ว่าเป็นตัวเลือกสองทางที่เลือกได้อันเดียว
                        <SegmentedControl
                            value={action}
                            onChange={(next) => {
                                setAction(next);
                                // สลับไป "รับคืน" ซ่อนช่องปลายทางทั้งช่อง (ดูคอมเมนต์
                                // ข้างล่าง) ข้อความผิดพลาดเก่าของมันจึงต้องล้างไปด้วย
                                // ไม่งั้นสลับกลับมา "เบิกออก" จะเจอข้อความค้างที่ยังไม่
                                // ได้ตรวจซ้ำเลย
                                setDestinationError(null);
                            }}
                            ariaLabel={t.inventory.actionLabel}
                            options={[
                                { value: 'check_out' as const, label: t.action.check_out },
                                { value: 'check_in' as const, label: t.action.check_in },
                            ]}
                        />
                    )}
                </Field>

                {/* รายการรหัสอยู่ในเนื้อ ใต้ตัวสลับ ไม่ใช่ปุ่มบนหัวที่กางแถบนอกหัว
                    -- <details> ได้พฤติกรรมกาง/หุบและการประกาศสถานะจากเบราว์เซอร์ */}
                <details className="rounded-xl border border-slate-200 bg-slate-50/70">
                    <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
                        {t.inventory.showIds}
                    </summary>
                    <div className="styled-scrollbar max-h-32 overflow-y-auto px-3 pb-3">
                        <div className="flex flex-wrap gap-1.5">
                            {sortedIds.map((id) => (
                                <span
                                    key={id}
                                    className="rounded-md bg-brand-100 px-2 py-1 font-mono text-xs font-medium text-brand-700"
                                >
                                    {id}
                                </span>
                            ))}
                        </div>
                    </div>
                </details>

                {/* เรนเดอร์เฉพาะตอนเบิกออก ไม่ใช่ซ่อนด้วย `invisible` ที่ทิ้งช่องว่าง
                    เปล่าครึ่งกล่องไว้โดยไม่อธิบายอะไร */}
                {action === 'check_out' && (
                    <Field
                        label={t.inventory.destination}
                        htmlFor={`${fieldId}-dest`}
                        required
                        error={destinationError ?? undefined}
                    >
                        {(aria) => (
                            <SelectField
                                id={aria.id}
                                icon={MapPin}
                                ariaLabel={t.inventory.destination}
                                value={destination}
                                onChange={(value) => {
                                    setDestination(value);
                                    setDestinationError(null);
                                }}
                                options={[
                                    { value: '', label: t.inventory.selectLocation },
                                    ...departments
                                        .filter((d) => d.is_active)
                                        .map((d) => ({ value: d.name, label: d.name })),
                                ]}
                            />
                        )}
                    </Field>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <Field
                        label={t.common.date}
                        htmlFor={`${fieldId}-date`}
                        required
                        error={dateError ?? undefined}
                    >
                        {(aria) => (
                            // native ล้วน ไม่มี input โปร่งใสซ้อนทับ input ข้อความ
                            // แบบของเดิม -- ที่นั่นทั้งสองตัวไม่มี label และตัวบน
                            // แท็บโฟกัสได้โดยไม่ประกาศอะไรเลย
                            <TextInput
                                {...aria}
                                type="date"
                                required
                                value={dateStr}
                                onChange={(e) => {
                                    setDateStr(e.target.value);
                                    setDateError(null);
                                }}
                            />
                        )}
                    </Field>

                    <Field
                        label={t.common.time}
                        htmlFor={`${fieldId}-time`}
                        required
                        error={timeError ?? undefined}
                    >
                        {(aria) => (
                            <TextInput
                                {...aria}
                                type="time"
                                required
                                value={timeStr}
                                onChange={(e) => {
                                    setTimeStr(e.target.value);
                                    setTimeError(null);
                                }}
                            />
                        )}
                    </Field>
                </div>

                <Field label={t.common.remark} htmlFor={`${fieldId}-remark`}>
                    {(aria) => (
                        <TextArea
                            {...aria}
                            rows={2}
                            placeholder={t.inventory.noteOptional}
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                        />
                    )}
                </Field>
            </form>
        </Modal>
    );
};
