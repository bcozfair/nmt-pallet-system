import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Upload, Info, Keyboard } from 'lucide-react';
import { reportDamage } from '../../services/transactionService';
import { toast } from '../../services/toast';
import { compressImage } from '../../utils/imageCompression';
import { MAX_EVIDENCE_BYTES } from '../../services/storageService';
import { useT } from '../../hooks/useT';
import { StaffHeader } from './StaffHeader';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Field } from '../ui/Field';
import { TextInput } from '../ui/TextInput';

interface DamageFormProps {
    palletId: string;
    userId: string;
    onSuccess: () => void;
    onCancel: () => void;
}

export const DamageForm = ({ palletId, userId, onSuccess, onCancel }: DamageFormProps) => {
    const t = useT();
    const [damageFile, setDamageFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const previewUrl = useMemo(() => {
        return damageFile ? URL.createObjectURL(damageFile) : null;
    }, [damageFile]);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    const submitReports = async () => {
        if (!palletId) return;
        setIsSubmitting(true);
        try {
            await reportDamage(palletId, userId, damageFile);
            toast.success(t.damage.reported(palletId));
            onSuccess();
        } catch (e) {
            toast.error(t.damage.submitFailed);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        // เลิกเป็น `fixed inset-0 z-[100]`: MobileInterface.tsx return คอมโพเนนต์นี้
        // แบบ early return ไม่มีอะไรอยู่ใต้ให้ต้องทับ มันเป็นหน้าธรรมดา ไม่ใช่ overlay
        // และ z-[100] ก็หลุดจากบันได z ของแอปด้วย
        <div className="app-canvas flex min-h-dvh flex-col">
            {/* หัวยังเป็นน้ำเงินเหมือนทุกหน้า ไม่ใช่แดงแบบเดิม -- สัญญาณอันตรายอยู่ที่
                เนื้อหา ไม่ใช่ที่ chrome ที่ทุกหน้าใช้ร่วมกัน */}
            <StaffHeader title={t.damage.titleFor(palletId)} onBack={onCancel} />

            <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
                {/* tone="danger" ไม่ใช่การตกแต่ง: คอมเมนต์ของ Card บอกไว้ตรงตัวว่า
                    โทนนี้มีไว้สำหรับแผงที่เนื้อหาย้อนกลับไม่ได้ การแจ้งชำรุดเปลี่ยน
                    สถานะพาเลทถาวรจนกว่าจะมีคนซ่อม */}
                <Card tone="danger" className="flex min-h-[280px] flex-1 flex-col p-4">
                    {previewUrl ? (
                        <div className="flex flex-1 flex-col items-center justify-between gap-4">
                            <div className="relative min-h-[200px] w-full flex-1 overflow-hidden rounded-xl bg-black/5">
                                <img
                                    src={previewUrl}
                                    alt={t.damage.uploadEvidence}
                                    className="absolute inset-0 h-full w-full object-contain"
                                />
                            </div>
                            <Button variant="danger" onClick={() => setDamageFile(null)} className="shrink-0">
                                {t.damage.removePhoto}
                            </Button>
                        </div>
                    ) : (
                        // <label> ครอบทั้งก้อน แล้ว <input> วางทับแบบโปร่งใส -- ตัวที่
                        // รับคลิกจริงคือ input ปุ่มใน `action` จึงเป็น <span> ไม่ใช่
                        // <button> ถ้าใส่ปุ่มจริงลงไปจะได้ปุ่มที่กดแล้วไม่เกิดอะไรขึ้น
                        // ซ้อนอยู่ใต้ input และ tab จะหยุดที่มันโดยไม่มีอะไรให้ทำ
                        <label className="relative flex flex-1 cursor-pointer">
                            <EmptyState
                                icon={Upload}
                                title={t.damage.uploadEvidence}
                                variant="plot"
                                action={
                                    <span className="inline-flex min-h-10 items-center rounded-xl bg-brand-50 px-3.5 py-2 text-sm font-semibold text-brand-700">
                                        {t.damage.openCamera}
                                    </span>
                                }
                            />
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={async (e) => {
                                    const picked = e.target.files?.[0];
                                    if (!picked) return;

                                    // info ไม่ใช่ success: "กำลังบีบอัดรูป" เป็น
                                    // สถานะระหว่างทาง ไม่ใช่ผลสำเร็จ
                                    toast.info(t.damage.compressing);

                                    let file = picked;
                                    try {
                                        file = await compressImage(picked);
                                    } catch (err) {
                                        // บีบอัดพังแล้วใช้ไฟล์ต้นฉบับต่อ ยังเป็น
                                        // พฤติกรรมเดิม -- รูปหลักฐานที่ส่งไม่ได้เลย
                                        // แย่กว่ารูปที่ใหญ่กว่าที่ควร แต่ต้องผ่าน
                                        // ด่านขนาดข้างล่างเหมือนกัน ไม่ใช่ผ่านฟรี
                                        console.error('Compression failed', err);
                                    }

                                    // ด่านนี้ไม่ได้แทนเพดานของถัง (150KB, ตั้งไว้ใน
                                    // 00_current_schema.sql ตอนที่ 8) -- ตัวนั้นคือ
                                    // ตัวบังคับจริงและอยู่ฝั่งที่พังไม่ได้ ตรงนี้มีไว้
                                    // ให้คนถ่ายรูปรู้ตั้งแต่ตอนเลือกรูปว่าส่งไม่ได้
                                    // แทนที่จะรู้ตอนกดส่งแล้วเจอ error ดิบของ Supabase
                                    if (file.size > MAX_EVIDENCE_BYTES) {
                                        toast.error(t.damage.tooLarge);
                                        // ล้างค่าใน input เพื่อให้เลือกไฟล์เดิมซ้ำแล้ว
                                        // onChange ยิงอีกครั้ง -- ถ้าไม่ล้าง คนที่กด
                                        // ถ่ายใหม่แล้วได้ไฟล์ชื่อเดิมจะกดแล้วไม่เกิดอะไร
                                        e.target.value = '';
                                        return;
                                    }

                                    setDamageFile(file);
                                }}
                                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            />
                        </label>
                    )}
                </Card>

                <div className="flex shrink-0 flex-col gap-3">
                    <Button
                        variant="dangerSolid"
                        size="lg"
                        disabled={!damageFile || isSubmitting}
                        onClick={submitReports}
                        className="w-full"
                    >
                        {isSubmitting ? t.damage.submitting : t.damage.submit}
                    </Button>
                    <Button variant="secondary" size="lg" onClick={onCancel} className="w-full">
                        {t.common.cancel}
                    </Button>
                </div>
            </main>
        </div>
    );
};

interface DamageManualEntryProps {
    onSubmit: (id: string) => void;
}

export const DamageManualEntry: React.FC<DamageManualEntryProps> = ({ onSubmit }) => {
    const t = useT();
    const [value, setValue] = useState('');

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const id = value.trim();
        if (!id) return;
        onSubmit(id);
        setValue('');
    };

    return (
        <div
            className={
                // เป็นลูกในคอลัมน์ของ QRScanner เหมือน BatchScanList ไม่ใช่ fixed
                'relative z-[60] mx-auto flex max-h-[60%] w-full max-w-md shrink-0 ' +
                'flex-col gap-4 overflow-y-auto rounded-t-3xl border-t border-slate-200 ' +
                'bg-white p-6 pb-10 shadow-[0_-24px_60px_-24px_rgba(15,42,82,0.45)] animate-surface-in'
            }
        >
            <div className="flex shrink-0 items-center gap-4 border-b border-slate-100 pb-4">
                <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600"
                    aria-hidden="true"
                >
                    <AlertTriangle size={24} />
                </span>
                <div className="min-w-0">
                    <h2 className="text-base font-semibold text-slate-900">{t.damage.manualTitle}</h2>
                    <p className="text-sm text-slate-500">{t.damage.manualSubtitle}</p>
                </div>
            </div>

            <div className="flex shrink-0 gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                <Info size={20} className="mt-0.5 shrink-0 text-red-500" aria-hidden="true" />
                <p className="text-sm leading-snug text-red-800">{t.damage.manualHint}</p>
            </div>

            {/* <form> ไม่ใช่ปุ่มลอย ๆ: บนมือถือปุ่ม "ไป" บนคีย์บอร์ดต้องส่งฟอร์มได้
                โดยไม่ต้องพับคีย์บอร์ดลงไปหาปุ่มก่อน */}
            <form onSubmit={submit} className="flex shrink-0 flex-col gap-3">
                <Field label={t.damage.idLabel} htmlFor="manual-pallet-id" hint={t.damage.idHint}>
                    {(control) => (
                        <TextInput
                            {...control}
                            mono
                            uppercase
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder={t.damage.idPlaceholder}
                            autoComplete="off"
                        />
                    )}
                </Field>
                {/* `primary` ชุดเดียวกับปุ่ม "ยืนยันและบันทึก" ใน BatchScanList.tsx
                    -- แผ่นล่างสองใบนี้ขึ้นมาจากหน้าสแกนเดียวกัน ปุ่มที่ปิดงานของทั้งคู่
                    จึงต้องเป็นวัตถุเดียวกัน ของเดิมเป็น `secondary` ซึ่งเป็นปุ่มพื้นขาว
                    ทั้งที่มันคือปุ่มหลักของกล่องนี้ และไม่มีปุ่มอื่นในกล่องให้ต้องถอยให้ */}
                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    icon={Keyboard}
                    disabled={value.trim().length === 0}
                    className="w-full"
                >
                    {/* `common.confirm` ไม่ใช่ `damage.enterIdManually`: ป้ายเดิม
                        ("กรอกรหัสเอง") เป็นชื่อของการกระทำที่เปิดกล่อง prompt ขึ้นมา
                        ตอนนี้ช่องกรอกอยู่ตรงหน้าแล้ว ปุ่มนี้ทำหน้าที่ส่งค่า */}
                    {t.common.confirm}
                </Button>
            </form>
        </div>
    );
};
