import React from 'react';
import { Edit2, Trash2, Save, X, KeyRound, MapPin, Hash } from 'lucide-react';
import { User } from '../../../types';

interface UserCardListProps {
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
}

export const UserCardList: React.FC<UserCardListProps> = ({
    users,
    editingId,
    editForm,
    setEditForm,
    departments,
    onSave,
    onCancelEdit,
    onStartEdit,
    onDelete,
    onResetPassword
}) => {
    return (
        <div className="md:hidden space-y-4">
            {users.map(user => (
                <div key={user.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    {editingId === user.id ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-gray-500 text-sm uppercase tracking-wide">Editing User</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => onSave(user.id)} className="p-2 bg-green-100 text-green-700 rounded-full"><Save size={16} /></button>
                                    <button onClick={onCancelEdit} className="p-2 bg-gray-100 text-gray-500 rounded-full"><X size={16} /></button>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Full Name</label>
                                <input
                                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                    value={editForm.full_name || ''}
                                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Location</label>
                                <select
                                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                    value={editForm.department || ''}
                                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                                >
                                    {departments.map(d => (
                                        <option key={d} value={d} className="text-gray-900">{d}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Role</label>
                                <select
                                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                    value={editForm.role || 'staff'}
                                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                                >
                                    <option value="staff">Staff</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg">{user.full_name}</h3>
                                    <p className="text-sm text-gray-500 flex items-center gap-1">
                                        <Hash size={12} /> {user.employee_id}
                                    </p>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {user.role}
                                </span>
                            </div>
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                                <span className="text-sm text-gray-600 flex items-center gap-2">
                                    <MapPin size={14} className="text-gray-400" /> {user.department}
                                </span>
                                <div className="flex gap-2">
                                    <button onClick={() => onResetPassword(user)} className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"><KeyRound size={18} /></button>
                                    <button onClick={() => onStartEdit(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={18} /></button>
                                    <button onClick={() => onDelete(user)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            ))}
        </div>
    );
};
