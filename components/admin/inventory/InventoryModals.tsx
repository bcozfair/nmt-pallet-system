import React, { useEffect, useId, useState } from 'react';
import { MapPin, PackagePlus, Save, SquarePen } from 'lucide-react';
import { createPallet } from '../../../services/palletService';
import { toast } from '../../../services/toast';
import { useT } from '../../../hooks/useT';

import { Department } from '../../../types';
import { describeAppError } from '../../../services/appError';
import { Button, Field, Modal, SelectField, TextArea, TextInput } from '../../ui';

interface AddPalletModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    departments: Department[];
}

export const AddPalletModal: React.FC<AddPalletModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    departments,
}) => {
    const t = useT();
    // useId ให้ id ที่ไม่ชนกันแม้จะเปิดสองโมดัลพร้อมกัน -- Field ใช้ค่านี้เดินสาย
    // label/aria ทั้งชุด
    const fieldId = useId();
    const [newId, setNewId] = useState('');
    const [newLocation, setNewLocation] = useState('Warehouse');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [idError, setIdError] = useState<string | null>(null);

    const close = () => {
        setIdError(null);
        onClose();
    };

    const handleAddPallet = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setIdError(null);
        try {
            await createPallet(newId, newLocation);
            toast.success(t.inventory.palletCreated(newId));
            setNewId('');
            setNewLocation('Warehouse');
            onSuccess();
            close();
        } catch (error: any) {
            // ใต้ช่อง ไม่ใช่ toast: รหัสซ้ำเป็นความผิดพลาดของช่องใดช่องหนึ่งเสมอ
            // toast เด้งอยู่บนสุดของจอขณะที่สายตาอยู่ที่ช่องกรอก แล้วหายเองใน
            // ไม่กี่วินาทีทั้งที่ช่องยังผิดอยู่
            setIdError(describeAppError(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    const locationOptions = [
        { value: 'Warehouse', label: 'Warehouse' },
        // ชื่อแผนกเป็นข้อมูลที่ผู้ใช้พิมพ์เองในหน้าสถานที่ ไม่ใช่ข้อความ UI
        // จึงแสดงตามที่บันทึกไว้ ไม่แปล -- เหมือนที่ InventoryFilters ทำ
        ...departments.filter((d) => d.name !== 'Warehouse').map((d) => ({ value: d.name, label: d.name })),
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={close}
            title={t.inventory.addPalletTitle}
            icon={PackagePlus}
            size="md"
            busy={isSubmitting}
            closeLabel={t.common.closeDialog}
            footer={
                <>
                    <Button variant="secondary" onClick={close} disabled={isSubmitting}>
                        {t.common.cancel}
                    </Button>
                    {/* form="…" ผูกปุ่มที่อยู่นอก <form> (มันอยู่ในท้ายกล่องซึ่งเป็น
                        พี่น้องของเนื้อ) เข้ากับฟอร์ม เพื่อให้ Enter ในช่องกรอกยัง
                        ส่งฟอร์มได้ตามปกติ */}
                    <Button
                        type="submit"
                        form={`${fieldId}-form`}
                        variant="primary"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? t.inventory.creating : t.inventory.createPallet}
                    </Button>
                </>
            }
        >
            <form id={`${fieldId}-form`} onSubmit={handleAddPallet} className="space-y-4">
                <Field
                    label={t.common.palletId}
                    htmlFor={`${fieldId}-id`}
                    required
                    hint={t.inventory.palletIdHint}
                    error={idError ?? undefined}
                >
                    {(aria) => (
                        <TextInput
                            {...aria}
                            mono
                            required
                            autoFocus
                            value={newId}
                            onChange={(e) => {
                                setNewId(e.target.value.toUpperCase());
                                setIdError(null);
                            }}
                        />
                    )}
                </Field>

                <Field label={t.inventory.initialLocation} htmlFor={`${fieldId}-location`}>
                    {(aria) => (
                        <SelectField
                            id={aria.id}
                            icon={MapPin}
                            ariaLabel={t.inventory.initialLocation}
                            value={newLocation}
                            onChange={setNewLocation}
                            options={locationOptions}
                        />
                    )}
                </Field>
            </form>
        </Modal>
    );
};

interface EditPalletModalProps {
    isOpen: boolean;
    pallet: { id: string; remark: string };
    onClose: () => void;
    onSave: (id: string, updates: { pallet_id: string; pallet_remark: string }) => Promise<void>;
}

export const EditPalletModal: React.FC<EditPalletModalProps> = ({
    isOpen,
    pallet,
    onClose,
    onSave,
}) => {
    const t = useT();
    const fieldId = useId();
    const [id, setId] = useState(pallet.id);
    const [remark, setRemark] = useState(pallet.remark);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setId(pallet.id);
            setRemark(pallet.remark);
            setSaveError(null);
        }
    }, [isOpen, pallet]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSaveError(null);
        try {
            await onSave(pallet.id, { pallet_id: id, pallet_remark: remark });
            onClose();
        } catch (error: any) {
            // ไม่ปิดกล่อง
            //
            // ของเดิม onSave กลืน error ไว้เองแล้ว resolve เสมอ บรรทัด onClose()
            // ข้างบนจึงวิ่งทุกครั้งแม้บันทึกไม่สำเร็จ -- รหัสซ้ำหนึ่งครั้งเท่ากับ
            // ข้อความที่พิมพ์มาทั้งหมดหายไป useInventoryActions โยน error ที่มี
            // ข้อความพร้อมแสดงมาให้แล้ว (ดู catch ในไฟล์นั้น)
            setSaveError(error?.message ?? describeAppError(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t.inventory.editTitle}
            icon={SquarePen}
            size="md"
            busy={isSubmitting}
            closeLabel={t.common.closeDialog}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                        {t.common.cancel}
                    </Button>
                    <Button
                        type="submit"
                        form={`${fieldId}-form`}
                        variant="primary"
                        icon={Save}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? t.common.saving : t.inventory.saveChanges}
                    </Button>
                </>
            }
        >
            <form id={`${fieldId}-form`} onSubmit={handleSubmit} className="space-y-4">
                <Field
                    label={t.common.palletId}
                    htmlFor={`${fieldId}-id`}
                    required
                    warning={t.inventory.idChangeWarning}
                    error={saveError ?? undefined}
                >
                    {(aria) => (
                        <TextInput
                            {...aria}
                            mono
                            required
                            value={id}
                            onChange={(e) => {
                                setId(e.target.value.toUpperCase());
                                setSaveError(null);
                            }}
                        />
                    )}
                </Field>

                <Field label={t.common.remark} htmlFor={`${fieldId}-remark`}>
                    {(aria) => (
                        <TextArea
                            {...aria}
                            rows={3}
                            placeholder={t.inventory.remarkPlaceholder}
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                        />
                    )}
                </Field>
            </form>
        </Modal>
    );
};
