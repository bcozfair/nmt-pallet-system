import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Upload, Info, Keyboard } from 'lucide-react';
import { reportDamage } from '../../services/transactionService';
import { toast } from '../../services/toast';
import { compressImage } from '../../utils/imageCompression';
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
                                    if (e.target.files && e.target.files[0]) {
                                        try {
                                            // info ไม่ใช่ success: "กำลังบีบอัดรูป" เป็น
                                            // สถานะระหว่างทาง ไม่ใช่ผลสำเร็จ
                                            toast.info(t.damage.compressing);
                                            const compressed = await compressImage(e.target.files[0]);
                                            setDamageFile(compressed);
                                        } catch (err) {
                                            console.error('Compression failed', err);
                                            setDamageFile(e.target.files[0]);
                                        }
                                    }
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
                'fixed inset-x-0 bottom-0 z-[60] mx-auto flex max-h-[60vh] w-full max-w-md ' +
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
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder={t.damage.idPlaceholder}
                            autoComplete="off"
                        />
                    )}
                </Field>
                <Button
                    type="submit"
                    variant="secondary"
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
