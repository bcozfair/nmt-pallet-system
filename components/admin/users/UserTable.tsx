import React from 'react';
import { Edit2, Trash2, Save, X, KeyRound, MapPin, Hash, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { User } from '../../../types';
import { formatDateTime } from '../common/AdminHelpers';

export type UserSortConfig = { key: keyof User; direction: 'asc' | 'desc' } | null;

interface UserTableProps {
    users: User[];
    editingId: string | null;
    editForm: Partial<User>;
    setEditForm: (form: Partial<User>) => void;
    departments: string[];
    onSave: (id: string) => void;
    onCancelEdit: () => void;
    onStartEdit: (user: User) => void;
    onDelete: (user: User) => void;
    onResetPassword: (user: User) => void;

    // Sort
    sortConfig: UserSortConfig;
    onSort: (key: keyof User) => void;
}

export const UserTable: React.FC<UserTableProps> = ({
    users,
    editingId,
    editForm,
    setEditForm,
    departments,
    onSave,
    onCancelEdit,
    onStartEdit,
    onDelete,
    onResetPassword,
    sortConfig,
    onSort
}) => {
    const SortIcon = ({ column }: { column: keyof User }) => {
        if (sortConfig?.key !== column) return <ArrowUpDown size={14} className="text-gray-300" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} className="text-blue-500" />
            : <ArrowDown size={14} className="text-blue-500" />;
    };

    const Th = ({ label, sortKey, width, align = 'left' }: { label: string, sortKey?: keyof User, width?: string, align?: string }) => (
        <th
            className={`p-3 border-b cursor-pointer hover:bg-gray-100 transition select-none text-${align} ${width || ''}`}
            onClick={() => sortKey && onSort(sortKey)}
        >
            <div className={`flex items-center gap-2 ${align === 'right' ? 'justify-end' : ''}`}>
                {label}
                {sortKey && <SortIcon column={sortKey} />}
            </div>
        </th>
    );

    return (
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-sm font-semibold tracking-wide uppercase">
                    <tr>
                        <Th label="Employee ID" sortKey="employee_id" width="w-40" />
                        <Th label="Full Name" sortKey="full_name" width="w-64" />
                        <Th label="Location" sortKey="department" width="w-48" />
                        <Th label="Role" sortKey="role" width="w-32" />
                        <Th label="Created At" sortKey="created_at" width="w-48" />
                        <Th label="Last Sign In" sortKey="last_sign_in_at" width="w-48" />
                        <th className="p-3 border-b text-right w-48">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {users.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50 transition">
                            <td className="p-3 font-mono text-gray-600">
                                {editingId === user.id ? (
                                    <input
                                        disabled
                                        className="w-full bg-gray-100 text-gray-500 border border-gray-300 rounded-lg px-2 py-1 cursor-not-allowed"
                                        value={user.employee_id}
                                    />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Hash size={14} className="text-gray-400" />
                                        {user.employee_id}
                                    </div>
                                )}
                            </td>
                            <td className="p-3 font-medium text-gray-800">
                                {editingId === user.id ? (
                                    <input
                                        className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                                        value={editForm.full_name || ''}
                                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                        placeholder="Full Name"
                                    />
                                ) : (
                                    user.full_name
                                )}
                            </td>
                            <td className="p-3 text-gray-600">
                                {editingId === user.id ? (
                                    <select
                                        className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                                        value={editForm.department || ''}
                                        onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                                    >
                                        {departments.map(d => (
                                            <option key={d} value={d} className="text-gray-900">{d}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <MapPin size={14} className="text-gray-400" />
                                        {user.department}
                                    </span>
                                )}
                            </td>
                            <td className="p-3">
                                {editingId === user.id ? (
                                    <select
                                        className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                                        value={editForm.role || 'staff'}
                                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                                    >
                                        <option value="staff">Staff</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                ) : (
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase border ${user.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                                        {user.role}
                                    </span>
                                )}
                            </td>
                            <td className="p-3 text-gray-500 text-sm">
                                {user.created_at ? formatDateTime(user.created_at) : '-'}
                            </td>
                            <td className="p-3 text-gray-500 text-sm">
                                {user.last_sign_in_at ? formatDateTime(user.last_sign_in_at) : '-'}
                            </td>
                            <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => onResetPassword(user)}
                                        className="p-2 text-yellow-500 hover:bg-yellow-50 hover:text-yellow-600 rounded-full transition"
                                        title="Reset Password"
                                    >
                                        <KeyRound size={16} />
                                    </button>
                                    {editingId === user.id ? (
                                        <>
                                            <button
                                                onClick={() => onSave(user.id)}
                                                className="p-2 bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-600 rounded-full transition"
                                            >
                                                <Save size={18} />
                                            </button>
                                            <button
                                                onClick={onCancelEdit}
                                                className="p-2 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-600 rounded-full transition"
                                            >
                                                <X size={18} />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => onStartEdit(user)}
                                                className="p-2 text-blue-400 hover:bg-blue-50 hover:text-blue-600 rounded-full transition"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => onDelete(user)}
                                                className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-full transition"
                                                title="Delete User"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
