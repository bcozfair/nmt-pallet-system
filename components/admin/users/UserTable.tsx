import React from 'react';
import { Edit2, Trash2, Save, X, KeyRound, MapPin, Hash, UsersRound } from 'lucide-react';
import { User } from '../../../types';
import { formatDateTime } from '../common/AdminHelpers';
import { Pagination } from '../common/Pagination';
import { useT } from '../../../hooks/useT';
import { Button, DataTable, EmptyState, SelectField, SortableTh, TextInput } from '../../ui';

export type UserSortConfig = { key: keyof User; direction: 'asc' | 'desc' } | null;

// The generic parameter SortableTh needs. Kept local: `UserSortConfig` above is
// the name UserView already imports, and a second exported alias for the same
// union would just be two names for one type.
type UserSortKey = keyof User;

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

    // Pagination -- now rendered as the card's footer rather than floating
    // below it, so the control belongs to the table it pages.
    totalProcessedCount: number;
    currentPage: number;
    itemsPerPage: number;
    totalPages: number;
    setCurrentPage: (page: number) => void;

    onClearFilters: () => void;
    // Before this existed this screen had no loading state at all: the first
    // render showed "No users found matching your filters" while the fetch was
    // still in flight. DataTable puts loading ahead of empty for exactly this.
    isLoading: boolean;
}

// One string for all five icon buttons in the row, so padding and focus
// treatment cannot drift between them. Colour is appended per button because
// each is a complete set of its own -- see the note in Button.tsx about two
// classes setting the same property being decided by stylesheet order.
const ROW_BUTTON =
    'rounded-full p-1.5 transition focus-visible:outline-2 focus-visible:outline-offset-2 ' +
    'focus-visible:outline-brand-500';

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
    onSort,
    totalProcessedCount,
    currentPage,
    itemsPerPage,
    totalPages,
    setCurrentPage,
    onClearFilters,
    isLoading,
}) => {
    const t = useT();

    const departmentOptions = departments.map((d) => ({ value: d, label: d }));
    const roleOptions = [
        { value: 'staff', label: t.role.staff },
        { value: 'admin', label: t.role.admin },
    ];

    return (
        <DataTable
            minWidth={960}
            isLoading={isLoading}
            loadingRows={10}
            loadingCols={7}
            loadingLabel={t.users.loading}
            isEmpty={totalProcessedCount === 0}
            empty={
                <EmptyState
                    icon={UsersRound}
                    title={t.users.noneFound}
                    action={
                        <Button variant="secondary" onClick={onClearFilters}>
                            {t.common.clearFilters}
                        </Button>
                    }
                />
            }
            footer={
                totalProcessedCount > 0 ? (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={totalProcessedCount}
                        itemsPerPage={itemsPerPage}
                    />
                ) : undefined
            }
            head={
                <tr>
                    <SortableTh<UserSortKey> label={t.users.employeeId} sortKey="employee_id" sortConfig={sortConfig} onSort={onSort} />
                    <SortableTh<UserSortKey> label={t.users.fullName} sortKey="full_name" sortConfig={sortConfig} onSort={onSort} />
                    <SortableTh<UserSortKey> label={t.common.location} sortKey="department" sortConfig={sortConfig} onSort={onSort} />
                    <SortableTh<UserSortKey> label={t.users.roleLabel} sortKey="role" sortConfig={sortConfig} onSort={onSort} />
                    {/* วันที่สร้างเป็นข้อมูลอ้างอิง ไม่ใช่สิ่งที่คนเปิดหน้านี้มาดู
                        ซ่อนต่ำกว่า xl ให้เหลือ 6 คอลัมน์พอดีกับ minWidth ข้างบน
                        ส่วน "เข้าใช้งานล่าสุด" อยู่ครบทุกความกว้าง เพราะมันคือ
                        คำถามจริงที่ถามกับรายชื่อผู้ใช้ */}
                    <SortableTh<UserSortKey>
                        label={t.users.createdAt}
                        sortKey="created_at"
                        sortConfig={sortConfig}
                        onSort={onSort}
                        className="hidden xl:table-cell"
                    />
                    <SortableTh<UserSortKey> label={t.users.lastSignIn} sortKey="last_sign_in_at" sortConfig={sortConfig} onSort={onSort} />
                    <SortableTh<UserSortKey> label={t.common.actions} sortConfig={sortConfig} align="right" />
                </tr>
            }
        >
            <tbody className="divide-y divide-slate-100">
                {users.map(user => {
                    const isEditing = editingId === user.id;

                    return (
                        // แถวที่กำลังแก้ไขได้พื้นสีแบรนด์อ่อน ชุดคลาสเต็มสองชุดเลือกด้วย
                        // ternary เดียว ไม่ใช่ base แล้วต่อทับ (ดู Button.tsx)
                        <tr
                            key={user.id}
                            className={isEditing ? 'bg-brand-50' : 'transition hover:bg-slate-50'}
                        >
                            <td className="px-3 py-1.5 font-mono text-slate-600">
                                {isEditing ? (
                                    // รหัสพนักงานแก้ไม่ได้ -- มันคือกุญแจที่ใช้เข้าสู่ระบบ
                                    // ยังแสดงไว้เพื่อให้เห็นว่ากำลังแก้ของใครอยู่
                                    <TextInput
                                        disabled
                                        mono
                                        uppercase
                                        aria-label={t.users.employeeId}
                                        value={user.employee_id}
                                    />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Hash size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
                                        {user.employee_id}
                                    </div>
                                )}
                            </td>

                            <td className="px-3 py-1.5 font-medium text-slate-800">
                                {isEditing ? (
                                    <TextInput
                                        aria-label={t.users.fullName}
                                        value={editForm.full_name || ''}
                                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                        placeholder={t.users.fullName}
                                    />
                                ) : (
                                    user.full_name
                                )}
                            </td>

                            <td className="px-3 py-1.5 text-slate-600">
                                {isEditing ? (
                                    <SelectField
                                        ariaLabel={t.users.editDepartment}
                                        value={editForm.department || ''}
                                        onChange={(department) => setEditForm({ ...editForm, department })}
                                        options={departmentOptions}
                                    />
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <MapPin size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
                                        {user.department}
                                    </span>
                                )}
                            </td>

                            <td className="px-3 py-1.5">
                                {isEditing ? (
                                    <SelectField
                                        ariaLabel={t.users.editRole}
                                        value={editForm.role || 'staff'}
                                        onChange={(role) => setEditForm({ ...editForm, role: role as User['role'] })}
                                        options={roleOptions}
                                    />
                                ) : (
                                    // ม่วง = แอดมิน น้ำเงิน = พนักงาน สีเดิมทั้งคู่ เปลี่ยนแค่
                                    // ทรงให้เป็นป้ายเดียวกับที่หน้าอื่นใช้ (rounded-full)
                                    <span
                                        className={
                                            'rounded-full border px-2 py-1 text-xs font-bold ' +
                                            (user.role === 'admin'
                                                ? 'border-purple-200 bg-purple-100 text-purple-700'
                                                : 'border-blue-200 bg-blue-100 text-blue-700')
                                        }
                                    >
                                        {t.role[user.role]}
                                    </span>
                                )}
                            </td>

                            <td className="hidden px-3 py-1.5 text-sm text-slate-500 xl:table-cell">
                                {user.created_at ? formatDateTime(user.created_at) : '-'}
                            </td>
                            <td className="px-3 py-1.5 text-sm text-slate-500">
                                {user.last_sign_in_at ? formatDateTime(user.last_sign_in_at) : '-'}
                            </td>

                            <td className="px-3 py-1.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                    {isEditing ? (
                                        <>
                                            {/* ทั้งสองปุ่มนี้เคยไม่มีทั้ง title และ
                                                aria-label -- เป็นปุ่มไอคอนล้วนที่
                                                screen reader อ่านว่า "button" เฉย ๆ */}
                                            <button
                                                onClick={() => onSave(user.id)}
                                                className={`${ROW_BUTTON} text-green-600 hover:bg-green-100`}
                                                title={t.users.saveEdit}
                                                aria-label={t.users.saveEdit}
                                            >
                                                <Save size={16} />
                                            </button>
                                            <button
                                                onClick={onCancelEdit}
                                                className={`${ROW_BUTTON} text-slate-500 hover:bg-slate-200 hover:text-slate-700`}
                                                title={t.users.cancelEdit}
                                                aria-label={t.users.cancelEdit}
                                            >
                                                <X size={16} />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => onResetPassword(user)}
                                                className={`${ROW_BUTTON} text-amber-500 hover:bg-amber-50 hover:text-amber-600`}
                                                title={t.users.resetPassword}
                                                aria-label={t.users.resetPassword}
                                            >
                                                <KeyRound size={16} />
                                            </button>
                                            <button
                                                onClick={() => onStartEdit(user)}
                                                className={`${ROW_BUTTON} text-brand-400 hover:bg-brand-50 hover:text-brand-600`}
                                                title={t.users.editUser}
                                                aria-label={t.users.editUser}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => onDelete(user)}
                                                className={`${ROW_BUTTON} text-red-400 hover:bg-red-50 hover:text-red-600`}
                                                title={t.users.deleteUser}
                                                aria-label={t.users.deleteUser}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </DataTable>
    );
};
