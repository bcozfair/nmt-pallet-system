import React, { useState, useEffect, useId } from 'react';
import { Calendar, MapPin, Save, SquarePen } from 'lucide-react';
import { Transaction, Department } from '../../../types';
import { formatDateTime } from '../common/AdminHelpers';
import { useT } from '../../../hooks/useT';
import { Button, Field, Modal, SelectField, TextArea, TextInput } from '../../ui';

interface TransactionEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string, updates: { department_dest?: string, transaction_remark?: string }) => Promise<void>;
    transaction: Transaction | null;
    departments: Department[];
}

export const TransactionEditModal: React.FC<TransactionEditModalProps> = ({
    isOpen,
    onClose,
    onSave,
    transaction,
    departments
}) => {
    // Above the `isOpen` early return: hooks have to run on every render.
    const t = useT();
    const fieldId = useId();
    const [location, setLocation] = useState('');
    const [remark, setRemark] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (transaction) {
            setLocation(transaction.department_dest || '');
            setRemark(transaction.transaction_remark || '');
        }
    }, [transaction]);

    if (!isOpen || !transaction) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSave(transaction.id, {
                department_dest: location,
                transaction_remark: remark
            });
            onClose();
        } catch (error) {
            // The parent has already reported the reason through a toast. The
            // modal stays open so the typed remark is not lost.
            console.error("Failed to update transaction", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const locationOptions = [
        { value: '', label: t.transactions.noLocation },
        // Department names are data, not UI text: typed into the locations
        // screen and stored on every transaction, so they are shown verbatim.
        { value: 'Warehouse', label: 'Warehouse' },
        ...departments
            .filter((d) => d.name !== 'Warehouse')
            .map((d) => ({ value: d.name, label: d.name })),
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t.transactions.editTitle}
            // The pallet this record belongs to, in the subtitle rather than as
            // a read-only field: it is what the box is about, not something the
            // form collects.
            subtitle={transaction.pallet_id}
            icon={SquarePen}
            size="md"
            busy={isSubmitting}
            preventDismiss={isSubmitting}
            closeLabel={t.common.closeDialog}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                        {t.common.cancel}
                    </Button>
                    {/* form="…" ผูกปุ่มที่อยู่นอก <form> (มันอยู่ในท้ายกล่องซึ่งเป็น
                        พี่น้องของเนื้อ) เข้ากับฟอร์ม เพื่อให้ Enter ในช่องกรอกยัง
                        ส่งฟอร์มได้ตามปกติ */}
                    <Button
                        type="submit"
                        form={`${fieldId}-form`}
                        variant="primary"
                        icon={Save}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? t.common.saving : t.transactions.saveChanges}
                    </Button>
                </>
            }
        >
            <form id={`${fieldId}-form`} onSubmit={handleSubmit} className="space-y-4">
                {/* The timestamp is not editable and never has been -- it is the
                    one fact on a transaction that has to stay as recorded. It is
                    still shown, as a disabled field rather than as a grey panel,
                    so it reads as part of the same form as the two below it. */}
                <Field label={t.transactions.dateReadOnly} htmlFor={`${fieldId}-date`}>
                    {(aria) => (
                        <div className="relative">
                            <Calendar
                                size={16}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                aria-hidden="true"
                            />
                            <TextInput
                                {...aria}
                                disabled
                                readOnly
                                className="pl-9"
                                value={formatDateTime(transaction.timestamp)}
                            />
                        </div>
                    )}
                </Field>

                {/* The sync note is the Field's hint rather than a loose <p>: as
                    a hint it is wired into aria-describedby, so it is read out
                    when focus lands on the select instead of only being visible. */}
                <Field
                    label={t.transactions.locationLabel}
                    htmlFor={`${fieldId}-location`}
                    hint={t.transactions.locationSyncNote}
                >
                    {(aria) => (
                        <SelectField
                            {...aria}
                            icon={MapPin}
                            ariaLabel={t.transactions.locationLabel}
                            value={location}
                            onChange={setLocation}
                            options={locationOptions}
                        />
                    )}
                </Field>

                <Field label={t.transactions.remarkLabel} htmlFor={`${fieldId}-remark`}>
                    {(aria) => (
                        <TextArea
                            {...aria}
                            rows={3}
                            placeholder={t.transactions.remarkPlaceholder}
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                        />
                    )}
                </Field>
            </form>
        </Modal>
    );
};
