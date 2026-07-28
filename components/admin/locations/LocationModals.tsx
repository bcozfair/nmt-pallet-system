import React, { useState, useEffect, useId, useRef } from 'react';
import { MapPinPlus, Save } from 'lucide-react';
import { useT } from '../../../hooks/useT';
import { Button, Field, Modal, TextInput } from '../../ui';

interface LocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialValue?: string;
    onSave: (name: string) => Promise<void>;
    mode: 'add' | 'edit';
}

export const LocationModal: React.FC<LocationModalProps> = ({
    isOpen,
    onClose,
    initialValue = '',
    onSave,
    mode
}) => {
    // Above any early return: useT subscribes through useSyncExternalStore, so
    // it has to run on every render like the rest.
    const t = useT();
    const fieldId = useId();
    // แทน autoFocus เดิม -- Modal ย้ายโฟกัสเข้ากล่องเองตอนเปิด และถ้าไม่บอกว่าจะให้
    // ลงที่ไหน มันจะลงที่ปุ่ม ✕ ซึ่งเป็นตัวโฟกัสได้ตัวแรกใน DOM เสมอ
    const nameRef = useRef<HTMLInputElement>(null);
    const [name, setName] = useState(initialValue);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setName(initialValue);
    }, [initialValue, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;

        setIsSubmitting(true);
        try {
            await onSave(trimmed);
            onClose();
        } catch (error) {
            // The parent has already shown the reason (duplicate name, RLS,
            // network). Catching it here is what keeps the modal open with the
            // typed name intact so it can be corrected -- and stops the
            // rejection going unhandled, which previously left the dialog
            // frozen with no message on screen at all.
            console.error("Location save failed", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={mode === 'add' ? t.locations.addLocation : t.locations.editLocation}
            icon={MapPinPlus}
            size="sm"
            busy={isSubmitting}
            preventDismiss={isSubmitting}
            closeLabel={t.common.closeDialog}
            initialFocusRef={nameRef}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                        {t.common.cancel}
                    </Button>
                    {/* form="…" ผูกปุ่มท้ายกล่อง (ซึ่งเป็นพี่น้องของเนื้อ ไม่ได้อยู่ใน
                        <form>) เข้ากับฟอร์ม เพื่อให้ Enter ในช่องชื่อยังส่งฟอร์มได้ */}
                    <Button
                        type="submit"
                        form={`${fieldId}-form`}
                        variant="primary"
                        icon={Save}
                        disabled={!name.trim() || isSubmitting}
                    >
                        {isSubmitting ? t.common.saving : t.locations.saveLocation}
                    </Button>
                </>
            }
        >
            <form id={`${fieldId}-form`} onSubmit={handleSubmit}>
                <Field
                    label={t.locations.locationName}
                    htmlFor={`${fieldId}-name`}
                    required
                    hint={t.locations.nameHint}
                >
                    {(aria) => (
                        <TextInput
                            {...aria}
                            ref={nameRef}
                            required
                            placeholder={t.locations.namePlaceholder}
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    )}
                </Field>
            </form>
        </Modal>
    );
};
