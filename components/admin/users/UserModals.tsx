import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { UserPlus, X, Hash, User as UserIcon, Briefcase, Shield, Lock, Eye, EyeOff, KeyRound, AlertTriangle, CheckCircle } from 'lucide-react';
import { createAccountByAdmin, adminResetUserPassword } from '../../../services/authService';
import { toast } from '../../../services/toast';

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    departments: string[];
    onSuccess: () => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, departments, onSuccess }) => {
    const [createForm, setCreateForm] = useState({
        employee_id: '',
        full_name: '',
        department: 'Warehouse',
        role: 'staff' as 'staff' | 'admin',
        password: '',
        confirmPassword: ''
    });
    const [isCreating, setIsCreating] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();

        if (createForm.password !== createForm.confirmPassword) {
            toast.error("Passwords do not match");
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
            toast.success("User created successfully");
            setCreateForm({
                employee_id: '',
                full_name: '',
                department: 'Warehouse',
                role: 'staff',
                password: '',
                confirmPassword: ''
            });
            setShowPassword(false);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Create failed", error);
            toast.error("Failed to create user: " + (error.message || "Unknown error"));
        } finally {
            setIsCreating(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                        <UserPlus className="text-blue-600" size={20} /> Create New User
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleCreateUser} className="p-5 space-y-3">

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Employee ID</label>
                        <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                required
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="EMP001"
                                value={createForm.employee_id}
                                onChange={e => setCreateForm({ ...createForm, employee_id: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Full Name</label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                required
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="John Doe"
                                value={createForm.full_name}
                                onChange={e => setCreateForm({ ...createForm, full_name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Department</label>
                            <div className="relative">
                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <select
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white text-sm"
                                    value={createForm.department}
                                    onChange={e => setCreateForm({ ...createForm, department: e.target.value })}
                                    required
                                >
                                    <option value="">Select Dept</option>
                                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Role</label>
                            <div className="relative">
                                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <select
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white text-sm"
                                    value={createForm.role}
                                    onChange={e => setCreateForm({ ...createForm, role: e.target.value as any })}
                                >
                                    <option value="staff">Staff</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    required
                                    type={showPassword ? "text" : "password"}
                                    className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    placeholder="••••••"
                                    value={createForm.password}
                                    onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                >
                                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    required
                                    type={showPassword ? "text" : "password"}
                                    className={`w-full pl-9 pr-8 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm ${createForm.confirmPassword && createForm.password !== createForm.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                    placeholder="••••••"
                                    value={createForm.confirmPassword}
                                    onChange={e => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                >
                                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </div>
                    </div>
                    {createForm.confirmPassword && createForm.password !== createForm.confirmPassword && (
                        <p className="text-xs text-red-500 font-medium ml-1">Passwords do not match</p>
                    )}

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isCreating}
                            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            {isCreating ? "Creating..." : <><UserPlus size={18} /> Create User</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
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
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [isResetting, setIsResetting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    if (!state?.isOpen) return null;

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmNewPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setIsResetting(true);
        try {
            await adminResetUserPassword(state.userId, newPassword);
            toast.success(`Password for ${state.fullName} has been reset`);
            setNewPassword('');
            setConfirmNewPassword('');
            onClose();
        } catch (error: any) {
            console.error("Reset password failed", error);
            toast.error("Failed to reset password: " + (error.message || "Unknown error"));
        } finally {
            setIsResetting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                        <KeyRound className="text-yellow-600" size={20} /> Reset Password
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
                        <X size={24} />
                    </button>
                </div>

                <div className="px-6 pt-4 pb-2">
                    <p className="text-sm text-gray-600">
                        Resetting password for <span className="font-bold text-gray-900">{state.fullName}</span>.
                    </p>
                </div>

                <form onSubmit={handleResetPassword} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                required
                                type={showPassword ? "text" : "password"}
                                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="••••••••"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                required
                                type={showPassword ? "text" : "password"}
                                className={`w-full pl-10 pr-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 ${confirmNewPassword && newPassword !== confirmNewPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                placeholder="••••••••"
                                value={confirmNewPassword}
                                onChange={e => setConfirmNewPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {confirmNewPassword && (
                            <p className={`text-xs mt-1 font-medium ${newPassword === confirmNewPassword ? 'text-green-600' : 'text-red-500'}`}>
                                {newPassword === confirmNewPassword ? "Passwords match" : "Passwords do not match"}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isResetting}
                        className="w-full py-4 bg-yellow-600 text-white font-bold rounded-xl hover:bg-yellow-700 shadow-lg transition flex items-center justify-center gap-2 mt-4"
                    >
                        {isResetting ? "Resetting..." : "Confirm Reset"}
                    </button>
                </form>
            </div>
        </div>,
        document.body
    );
};

export type ConfirmActionType = {
    title: string;
    message: string;
    confirmLabel: string;
    isDestructive?: boolean;
    onConfirm: () => Promise<void>;
};

interface ConfirmModalProps {
    action: ConfirmActionType | null;
    onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ action, onClose }) => {
    if (!action) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200 overflow-hidden transform">
                <div className="p-6">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${action.isDestructive ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        {action.isDestructive ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{action.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                        {action.message}
                    </p>
                </div>
                <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white text-gray-700 font-bold rounded-lg hover:bg-gray-100 border border-gray-200 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={async () => {
                            await action.onConfirm();
                            onClose();
                        }}
                        className={`px-4 py-2 text-white font-bold rounded-lg shadow-sm transition ${action.isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {action.confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
