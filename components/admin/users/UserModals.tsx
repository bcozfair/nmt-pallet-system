import React, { useId, useRef, useState } from 'react';
import { Briefcase, Eye, EyeOff, Hash, KeyRound, Shield, User as UserIcon, UserPlus } from 'lucide-react';
import { createAccountByAdmin, adminResetUserPassword } from '../../../services/authService';
import { toast } from '../../../services/toast';
import { useT } from '../../../hooks/useT';
import { dict } from '../../../services/i18n';
import { describeAppError, isAppError } from '../../../services/appError';
import { Button, Field, Modal, SelectField, TextInput } from '../../ui';
import type { FieldControlProps } from '../../ui';

// ปุ่มตาวางทับช่องกรอก ไม่ใช่ปุ่มแยกข้าง ๆ -- `pr-10` ที่ TextInput จองที่ไว้ให้
// เท่ากับที่ SearchInput จองไว้ให้ปุ่มล้าง
//
// อยู่ในไฟล์นี้ ไม่ใช่ใน components/ui/: มันรับ `showLabel`/`hideLabel` เป็น prop ก็จริง
// แต่มีผู้ใช้อยู่สองที่ในไฟล์เดียวกัน การยกขึ้นไปเป็น primitive ก่อนมีที่ใช้ที่สาม
// คือการเดา API จากตัวอย่างเดียว ซึ่งเป็นสิ่งที่ D5 ของ spec รอบแรกสั่งไม่ให้ทำ
const PasswordInput: React.FC<{
    aria: FieldControlProps;
    value: string;
    onChange: (value: string) => void;
    showLabel: string;
    hideLabel: string;
    required?: boolean;
    minLength?: number;
    autoComplete?: string;
    inputRef?: React.RefObject<HTMLInputElement | null>;
}> = ({ aria, value, onChange, showLabel, hideLabel, required, minLength, autoComplete, inputRef }) => {
    const [shown, setShown] = useState(false);

    return (
        <div className="relative">
            <TextInput
                {...aria}
                ref={inputRef}
                type={shown ? 'text' : 'password'}
                required={required}
                minLength={minLength}
                autoComplete={autoComplete}
                placeholder="••••••"
                className="pr-10"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            <button
                type="button"
                onClick={() => setShown((s) => !s)}
                aria-label={shown ? hideLabel : showLabel}
                className={
                    'absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 ' +
                    'transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 ' +
                    'focus-visible:outline-offset-2 focus-visible:outline-brand-500'
                }
            >
                {shown ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
            </button>
        </div>
    );
};

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    departments: string[];
    onSuccess: () => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, departments, onSuccess }) => {
    const t = useT();
    const fieldId = useId();
    const idInputRef = useRef<HTMLInputElement>(null);
    const [createForm, setCreateForm] = useState({
        employee_id: '',
        full_name: '',
        department: 'Warehouse',
        role: 'staff' as 'staff' | 'admin',
        password: '',
        confirmPassword: ''
    });
    const [isCreating, setIsCreating] = useState(false);

    // ของเดิมเป็น <p> ลอยใต้ตารางช่องรหัสผ่าน ไม่ผูกกับช่องไหนเลย ตอนนี้เป็น
    // `error` ของ Field ช่องยืนยัน ซึ่งเดิน aria-describedby + aria-invalid ให้เอง
    const mismatch = createForm.confirmPassword !== '' && createForm.password !== createForm.confirmPassword;

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();

        if (createForm.password !== createForm.confirmPassword) {
            toast.error(dict().users.passwordsDoNotMatch);
            return;
        }

        setIsCreating(true);
        try {
            await createAccountByAdmin(
                createForm.employee_id,
                createForm.full_name,
                createForm.department,
                createForm.password,
                createForm.role
            );
            toast.success(dict().users.createSuccess);
            setCreateForm({
                employee_id: '',
                full_name: '',
                department: 'Warehouse',
                role: 'staff',
                password: '',
                confirmPassword: ''
            });
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Create failed", error);
            // A failed admin promotion is NOT a failed creation -- the account
            // exists. Wrapping it in the "could not create user" prefix produced a
            // message that contradicted itself, so that one code is shown alone.
            toast.error(
                isAppError(error) && error.code === 'admin_promotion_failed'
                    ? describeAppError(error)
                    : dict().users.createFailed(describeAppError(error))
            );
        } finally {
            setIsCreating(false);
        }
    };

    const departmentOptions = [
        { value: '', label: t.users.selectDepartment },
        // ชื่อแผนกเป็นข้อมูลที่ผู้ใช้พิมพ์เองในหน้าสถานที่ ไม่ใช่ข้อความ UI จึงไม่แปล
        ...departments.map((d) => ({ value: d, label: d })),
    ];

    const roleOptions = [
        { value: 'staff', label: t.role.staff },
        { value: 'admin', label: t.role.admin },
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t.users.createTitle}
            icon={UserPlus}
            size="md"
            busy={isCreating}
            preventDismiss={isCreating}
            closeLabel={t.common.closeDialog}
            initialFocusRef={idInputRef}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={isCreating}>
                        {t.common.cancel}
                    </Button>
                    <Button
                        type="submit"
                        form={`${fieldId}-form`}
                        variant="primary"
                        icon={isCreating ? undefined : UserPlus}
                        disabled={isCreating}
                    >
                        {isCreating ? t.users.creating : t.users.createSubmit}
                    </Button>
                </>
            }
        >
            <form id={`${fieldId}-form`} onSubmit={handleCreateUser} className="space-y-4">
                <Field label={t.users.employeeId} htmlFor={`${fieldId}-employee`} required>
                    {(aria) => (
                        <div className="relative">
                            <Hash
                                size={16}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                aria-hidden="true"
                            />
                            <TextInput
                                {...aria}
                                ref={idInputRef}
                                required
                                mono
                                className="pl-9"
                                placeholder="EMP001"
                                value={createForm.employee_id}
                                onChange={e => setCreateForm({ ...createForm, employee_id: e.target.value })}
                            />
                        </div>
                    )}
                </Field>

                <Field label={t.users.fullName} htmlFor={`${fieldId}-name`} required>
                    {(aria) => (
                        <div className="relative">
                            <UserIcon
                                size={16}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                aria-hidden="true"
                            />
                            <TextInput
                                {...aria}
                                required
                                className="pl-9"
                                placeholder={t.users.fullNamePlaceholder}
                                value={createForm.full_name}
                                onChange={e => setCreateForm({ ...createForm, full_name: e.target.value })}
                            />
                        </div>
                    )}
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t.common.department} htmlFor={`${fieldId}-dept`} required>
                        {(aria) => (
                            <SelectField
                                {...aria}
                                icon={Briefcase}
                                ariaLabel={t.common.department}
                                value={createForm.department}
                                onChange={(department) => setCreateForm({ ...createForm, department })}
                                options={departmentOptions}
                            />
                        )}
                    </Field>

                    <Field label={t.users.roleLabel} htmlFor={`${fieldId}-role`}>
                        {(aria) => (
                            <SelectField
                                {...aria}
                                icon={Shield}
                                ariaLabel={t.users.roleLabel}
                                value={createForm.role}
                                onChange={(role) => setCreateForm({ ...createForm, role: role as 'staff' | 'admin' })}
                                options={roleOptions}
                            />
                        )}
                    </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t.users.password} htmlFor={`${fieldId}-password`} required>
                        {(aria) => (
                            <PasswordInput
                                aria={aria}
                                required
                                minLength={6}
                                autoComplete="new-password"
                                showLabel={t.common.showPassword}
                                hideLabel={t.common.hidePassword}
                                value={createForm.password}
                                onChange={(password) => setCreateForm({ ...createForm, password })}
                            />
                        )}
                    </Field>

                    <Field
                        label={t.users.confirmPassword}
                        htmlFor={`${fieldId}-confirm`}
                        required
                        error={mismatch ? t.users.passwordsDoNotMatch : undefined}
                    >
                        {(aria) => (
                            <PasswordInput
                                aria={aria}
                                required
                                autoComplete="new-password"
                                showLabel={t.common.showPassword}
                                hideLabel={t.common.hidePassword}
                                value={createForm.confirmPassword}
                                onChange={(confirmPassword) => setCreateForm({ ...createForm, confirmPassword })}
                            />
                        )}
                    </Field>
                </div>
            </form>
        </Modal>
    );
};

export type ResetPasswordState = {
    userId: string;
    fullName: string;
    isOpen: boolean;
};

interface ResetPasswordModalProps {
    state: ResetPasswordState | null;
    onClose: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ state, onClose }) => {
    const t = useT();
    const fieldId = useId();
    const passwordRef = useRef<HTMLInputElement>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [isResetting, setIsResetting] = useState(false);

    const mismatch = confirmNewPassword !== '' && newPassword !== confirmNewPassword;

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!state) return;

        if (newPassword !== confirmNewPassword) {
            toast.error(dict().users.passwordsDoNotMatch);
            return;
        }

        setIsResetting(true);
        try {
            await adminResetUserPassword(state.userId, newPassword);
            toast.success(dict().users.resetSuccess(state.fullName));
            setNewPassword('');
            setConfirmNewPassword('');
            onClose();
        } catch (error: any) {
            console.error("Reset password failed", error);
            toast.error(dict().users.resetFailed(describeAppError(error)));
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <Modal
            // `state` is null when nothing is being reset, and carries its own
            // `isOpen` when it is. Modal returns null on a closed box, so the
            // hooks above still run on every render.
            isOpen={!!state?.isOpen}
            onClose={onClose}
            title={t.users.resetPassword}
            // Who this is for used to be a paragraph in the body. It belongs in
            // the header: it identifies the dialog rather than being one of the
            // things it collects.
            subtitle={`${t.users.resettingFor} ${state?.fullName ?? ''}`}
            icon={KeyRound}
            size="sm"
            busy={isResetting}
            preventDismiss={isResetting}
            closeLabel={t.common.closeDialog}
            initialFocusRef={passwordRef}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={isResetting}>
                        {t.common.cancel}
                    </Button>
                    <Button
                        type="submit"
                        form={`${fieldId}-form`}
                        variant="primary"
                        disabled={isResetting}
                    >
                        {isResetting ? t.users.resetting : t.users.confirmReset}
                    </Button>
                </>
            }
        >
            <form id={`${fieldId}-form`} onSubmit={handleResetPassword} className="space-y-4">
                <Field label={t.users.newPassword} htmlFor={`${fieldId}-new`} required>
                    {(aria) => (
                        <PasswordInput
                            aria={aria}
                            required
                            minLength={6}
                            autoComplete="new-password"
                            inputRef={passwordRef}
                            showLabel={t.common.showPassword}
                            hideLabel={t.common.hidePassword}
                            value={newPassword}
                            onChange={setNewPassword}
                        />
                    )}
                </Field>

                <Field
                    label={t.users.confirmNewPassword}
                    htmlFor={`${fieldId}-confirm`}
                    required
                    error={mismatch ? t.users.passwordsDoNotMatch : undefined}
                    // ของเดิมขึ้น "รหัสผ่านตรงกัน" สีเขียวเมื่อตรง ซึ่ง Field แสดง
                    // ทีละอย่างอยู่แล้ว (error ทับ hint) จึงยังบอกได้ครบทั้งสองทาง
                    hint={
                        confirmNewPassword !== '' && !mismatch ? t.users.passwordsMatch : undefined
                    }
                >
                    {(aria) => (
                        <PasswordInput
                            aria={aria}
                            required
                            autoComplete="new-password"
                            showLabel={t.common.showPassword}
                            hideLabel={t.common.hidePassword}
                            value={confirmNewPassword}
                            onChange={setConfirmNewPassword}
                        />
                    )}
                </Field>
            </form>
        </Modal>
    );
};
