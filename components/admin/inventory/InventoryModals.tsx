import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { MapPin, PackagePlus, RefreshCw, Save, SquarePen } from 'lucide-react';
import { createPallets, fetchPallets } from '../../../services/palletService';
import { nextPalletId, palletIdRange, parsePalletId } from '../../../services/palletIdSequence';
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

/** The ceiling on one batch. */
const MAX_BATCH = 100;

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
    // ให้ Modal โฟกัสช่องนี้ตอนเปิด แทนปุ่ม ✕ ที่เป็นตัวแรกใน DOM เสมอ -- ดู
    // initialFocusRef ใน Modal.tsx
    const idInputRef = useRef<HTMLInputElement>(null);
    const [newId, setNewId] = useState('');
    const [newLocation, setNewLocation] = useState('Warehouse');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [idError, setIdError] = useState<string | null>(null);

    // The quantity is a STRING in state, not a number.
    //
    // A number would have to represent the half-typed states an <input> passes
    // through -- '' while the reader clears it before typing 20, '0' on the way
    // to '20'. Storing those as 0 or NaN makes the preview line flicker through
    // nonsense while somebody is still typing. The string is what the reader
    // typed; `count` below is what it means.
    const [quantityText, setQuantityText] = useState('1');

    // Set while the next running number is being fetched. The ID FIELD alone is
    // disabled during it, not the whole modal: the location dropdown has nothing
    // to do with the sequence and can be set while the number is on its way.
    const [isLoadingNextId, setIsLoadingNextId] = useState(false);

    // Whether the id currently in the box has a number to count from. An id like
    // 'TEST' or 'SPECIAL-01' does not, so there is no range to create.
    const canSequence = parsePalletId(newId) !== null;

    // Locked only when there IS an id and it cannot be counted from.
    //
    // NOT simply `!canSequence`. The field starts empty for the half-second the
    // next number is being fetched, and an empty string does not parse -- so the
    // plain form disabled the quantity box on open, for every user, every time,
    // with no note explaining it because the note is also suppressed while the
    // id is empty. A disabled control that unlocks by itself a moment later is
    // exactly the kind of flicker that reads as a broken screen.
    const quantityLocked = newId !== '' && !canSequence;

    const parsedQuantity = Number.parseInt(quantityText, 10);
    const count =
        quantityLocked || !Number.isFinite(parsedQuantity)
            ? 1
            : Math.min(Math.max(parsedQuantity, 1), MAX_BATCH);

    // The ids that pressing Create would produce. Computed from the same
    // function the submit handler uses, so the preview under the field cannot
    // promise a range the insert does not write.
    const ids = canSequence ? palletIdRange(newId, count) : (newId ? [newId] : []);

    /**
     * Fetches the fleet and fills the id field with the number after the highest
     * one in it.
     *
     * Used twice: when the modal opens, and behind the "Recalculate ID" button
     * offered next to a duplicate-id error. Both need the same thing -- a fresh
     * read, because the value that matters is what the DATABASE holds right now,
     * not what this browser last saw. That is the whole point of the button:
     * somebody else took P024 while this modal was open.
     *
     * A failed fetch leaves the field empty rather than guessing. An admin can
     * still type an id, which is the behaviour this modal has always had.
     */
    const fillNextId = useCallback(async () => {
        setIsLoadingNextId(true);
        try {
            const pallets = await fetchPallets();
            setNewId(nextPalletId(pallets.map((p) => p.pallet_id)));
            setIdError(null);
        } catch (error) {
            console.error('[AddPalletModal] Could not compute the next pallet ID', error);
        } finally {
            setIsLoadingNextId(false);
        }
    }, []);

    // On open, not on mount: this component stays mounted across open/close (see
    // InventoryView), so a mount-time fetch would compute the number once and
    // then hand out the same one for the rest of the session.
    useEffect(() => {
        if (!isOpen) return;
        setQuantityText('1');
        setIdError(null);
        void fillNextId();
    }, [isOpen, fillNextId]);

    const close = () => {
        setIdError(null);
        onClose();
    };

    const handleAddPallet = async (e: React.FormEvent) => {
        e.preventDefault();
        if (ids.length === 0) return;

        setIsSubmitting(true);
        setIdError(null);
        try {
            // One statement for the whole batch, so a clash on any id rolls the
            // whole thing back -- see createPallets. Quantity 1 goes down the
            // same path as quantity 20; there is no separate single-pallet case
            // that could behave differently.
            await createPallets(ids, newLocation);
            toast.success(
                ids.length === 1
                    ? t.inventory.palletCreated(ids[0])
                    : t.inventory.palletsCreated(ids.length, ids[0], ids[ids.length - 1]),
            );
            setNewId('');
            setQuantityText('1');
            setNewLocation('Warehouse');
            onSuccess();
            close();
        } catch (error: any) {
            // ใต้ช่อง ไม่ใช่ toast: รหัสซ้ำเป็นความผิดพลาดของช่องใดช่องหนึ่งเสมอ
            // toast เด้งอยู่บนสุดของจอขณะที่สายตาอยู่ที่ช่องกรอก แล้วหายเองใน
            // ไม่กี่วินาทีทั้งที่ช่องยังผิดอยู่
            //
            // describeAppError อย่างเดียวก็พอแล้วตอนนี้: createPallets ห่อ 23505
            // เป็น AppError('pallet_exists') ให้ตั้งแต่ชั้น service (ดู
            // services/palletService.ts) ก่อนหน้านี้มันโยน PostgrestError ดิบ กล่องนี้
            // จึงต้องเช็ค error.code === '23505' เอง ขณะที่ EditPalletModal ได้ข้อความ
            // ที่แปลแล้วจาก updatePallet -- สองกล่องเดียวกันตอบคนละอย่างกับเหตุเดียวกัน
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
            preventDismiss={isSubmitting}
            closeLabel={t.common.closeDialog}
            initialFocusRef={idInputRef}
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
                        // Also while the next number is being fetched: submitting
                        // then would create a pallet under whatever id happened
                        // to be in the box before the fetch landed.
                        disabled={isSubmitting || isLoadingNextId}
                    >
                        {isSubmitting ? t.inventory.creating : t.inventory.createPallet}
                    </Button>
                </>
            }
        >
            <form id={`${fieldId}-form`} onSubmit={handleAddPallet} className="space-y-4">
                {/* Id and quantity share a row: they are read together -- "P024,
                    twenty of them" is one thought -- and the preview line under
                    them describes the pair. The id takes the remaining width
                    because it is the field that gets edited; the quantity is a
                    fixed 6rem, wide enough for three digits. */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
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
                                    ref={idInputRef}
                                    mono
                                    required
                                    // Disabled only while the next number is on
                                    // its way, so it cannot be typed over
                                    // half a second before the fetch overwrites
                                    // it. Everything else in the modal stays
                                    // usable -- this is not a loading screen.
                                    disabled={isLoadingNextId}
                                    value={newId}
                                    onChange={(e) => {
                                        setNewId(e.target.value.toUpperCase());
                                        setIdError(null);
                                    }}
                                />
                            )}
                        </Field>
                    </div>

                    <div className="sm:w-24">
                        <Field
                            label={t.inventory.quantity}
                            htmlFor={`${fieldId}-quantity`}
                        >
                            {(aria) => (
                                <TextInput
                                    {...aria}
                                    type="number"
                                    min={1}
                                    max={MAX_BATCH}
                                    // Pinned to 1 when the id has no number to
                                    // count from. The reason is stated under the
                                    // fields rather than left to be inferred
                                    // from a greyed-out box.
                                    disabled={quantityLocked}
                                    value={quantityLocked ? '1' : quantityText}
                                    onChange={(e) => setQuantityText(e.target.value)}
                                    // A blank or nonsense box on blur snaps back
                                    // to what `count` has been using all along,
                                    // so the field cannot be left showing
                                    // something the preview disagrees with.
                                    onBlur={() => setQuantityText(String(count))}
                                />
                            )}
                        </Field>
                    </div>
                </div>

                {/* The line the whole feature is for: the exact range, updated on
                    every keystroke in either field. Somebody about to print
                    twenty QR stickers checks this before pressing Create. */}
                {quantityLocked ? (
                    <p className="text-xs leading-relaxed text-amber-600">
                        {t.inventory.quantityLockedNote}
                    </p>
                ) : (
                    ids.length > 1 && (
                        <p className="text-xs leading-relaxed text-slate-500">
                            {t.inventory.rangePreview(ids[0], ids[ids.length - 1], ids.length)}
                        </p>
                    )
                )}

                {/* Offered only when the id is the problem. Refetches the fleet
                    and fills in a number that is free as of right now -- the
                    clash it answers is another admin having taken the id while
                    this modal sat open, which closing and reopening would also
                    fix, at the cost of every other field on the form. */}
                {idError && (
                    <Button
                        variant="secondary"
                        icon={RefreshCw}
                        onClick={() => void fillNextId()}
                        disabled={isLoadingNextId || isSubmitting}
                    >
                        {t.inventory.recalculateId}
                    </Button>
                )}

                <Field label={t.inventory.initialLocation} htmlFor={`${fieldId}-location`}>
                    {(aria) => (
                        <SelectField
                            {...aria}
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
    const idInputRef = useRef<HTMLInputElement>(null);
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
            preventDismiss={isSubmitting}
            closeLabel={t.common.closeDialog}
            initialFocusRef={idInputRef}
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
                            ref={idInputRef}
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
