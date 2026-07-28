import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../../../types';
import { supabase } from '../../../services/supabase';
import { fetchDepartments } from '../../../services/departmentService';
import { fetchUsers } from '../../../services/userService';
import { adminDeleteUser } from '../../../services/authService';
import { toast } from '../../../services/toast';
import { useT } from '../../../hooks/useT';
import { dict } from '../../../services/i18n';

// Sub-components
import { UserTable, UserSortConfig } from './UserTable';
import { UserHeader } from './UserHeader';
import { UserFilters } from './UserFilters';
import { CreateUserModal, ResetPasswordModal, ResetPasswordState } from './UserModals';
import { ConfirmDialog, StickyHeader } from '../../ui';
// The shape of a pending confirmation, shared with the inventory and locations
// screens rather than redeclared here. UserModals used to export its own copy
// alongside the dialog that consumed it; the dialog is `ui/ConfirmDialog` now.
import { ConfirmActionType } from '../../../hooks/inventory/useInventoryActions';
import { describeAppError } from '../../../services/appError';

export const UserView: React.FC = () => {
    const t = useT();

    // Data State
    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);
    // Before this existed the first render showed "No users found matching your
    // filters" while the very first fetch was still in flight -- the same bug
    // the inventory screen had, and the reason DataTable checks loading before
    // empty. `true` initially: a screen that has not fetched yet is loading.
    const [isLoading, setIsLoading] = useState(true);

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [locationFilter, setLocationFilter] = useState('all');
    const [roleFilter, setRoleFilter] = useState('all');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10); // Default to 10 for users as rows are taller/more detailed often, or 20 like inventory
    const [sortConfig, setSortConfig] = useState<UserSortConfig>({ key: 'created_at', direction: 'desc' });

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<User>>({});

    // Modals State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [resetPasswordState, setResetPasswordState] = useState<ResetPasswordState | null>(null);
    const [confirmAction, setConfirmAction] = useState<ConfirmActionType | null>(null);

    // --- Loading ---

    const loadData = async () => {
        try {
            const [usersData, deptsData] = await Promise.all([fetchUsers(), fetchDepartments()]);
            setUsers(usersData);
            setDepartments(deptsData.map(d => d.name));
        } catch (error) {
            console.error(error);
            // dict() rather than the `t` above: loadData is also called from the
            // realtime subscription set up in a [] effect, so it outlives this
            // render and a captured `t` would go stale after a language switch.
            toast.error(dict().users.loadFailed);
        } finally {
            // In `finally`, not at the end of `try`: a failed fetch has also
            // stopped loading, and leaving the flag set would pin the screen to
            // a skeleton that never resolves.
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        // Realtime subscription
        const subscription = supabase
            .channel('users_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
                loadData();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, locationFilter, roleFilter]);

    // --- Processing ---

    const processedUsers = useMemo(() => {
        const filtered = users.filter(user => {
            const matchesSearch =
                user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.department?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesLocation = locationFilter === 'all' || user.department === locationFilter;
            const matchesRole = roleFilter === 'all' || user.role === roleFilter;

            return matchesSearch && matchesLocation && matchesRole;
        });

        if (sortConfig) {
            return [...filtered].sort((a, b) => {
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];

                if (valA === null || valA === undefined) return 1;
                if (valB === null || valB === undefined) return -1;

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [users, searchTerm, locationFilter, roleFilter, sortConfig]);

    const totalPages = Math.ceil(processedUsers.length / itemsPerPage);
    const paginatedUsers = processedUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // --- Handlers ---

    const startEdit = (user: User) => {
        setEditingId(user.id);
        setEditForm(user);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleSave = async (id: string) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    full_name: editForm.full_name,
                    department: editForm.department,
                    role: editForm.role
                })
                .eq('id', id);

            if (error) throw error;
            toast.success(dict().users.updateSuccess);
            setEditingId(null);
            loadData();
        } catch (error: any) {
            console.error(error);
            toast.error(dict().users.updateFailed);
        }
    };

    const handleDeleteClick = (user: User) => {
        setConfirmAction({
            title: t.users.deleteUser,
            message: t.users.deleteMessage(user.full_name, user.employee_id),
            confirmLabel: t.users.deleteUser,
            isDestructive: true,
            onConfirm: async () => {
                try {
                    await adminDeleteUser(user.id);
                    toast.success(dict().users.deleteSuccess);
                    loadData();
                } catch (error: any) {
                    console.error("Delete failed", error);
                    toast.error(dict().users.deleteFailed(describeAppError(error)));
                }
            }
        });
    };

    const openResetPasswordModal = (user: User) => {
        setResetPasswordState({
            userId: user.id,
            fullName: user.full_name,
            isOpen: true
        });
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setLocationFilter('all');
        setRoleFilter('all');
    };

    // How many of the three are off their default. The filter bar shows its
    // "N results / clear filters" row only when this is above zero -- an
    // untouched screen has nothing to report and no filters to clear.
    const activeFilterCount = [
        searchTerm !== '',
        locationFilter !== 'all',
        roleFilter !== 'all',
    ].filter(Boolean).length;

    const handleSort = (key: keyof User) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    return (
        // No height and no overflow here, on purpose -- the reason this app
        // stopped nesting scroll containers is recorded in InventoryView.tsx,
        // AdminDashboard.tsx and StickyHeader.tsx: the scrollbar ends up
        // belonging to an inner box, so the wheel stops dead at that box's edge
        // instead of continuing down the document, and a box clamped to 100vh
        // has nothing below the fold to hand to the printer.
        //
        // The `animate-in fade-in duration-500` that used to be here came from
        // the tailwindcss-animate plugin, which is not in package.json -- it
        // compiled to nothing and never ran.
        <div className="flex flex-col gap-4">
            {/* หัวเพจกับแถบกรองเดินทางไปด้วยกันและเกาะยอดจอที่ xl ส่วนที่เลื่อนคือ
                แถวข้อมูลกับตัวแบ่งหน้าใต้มัน หัวตารางเกาะใต้กองนี้พอดีผ่านความสูง
                จริงที่ StickyHeader วัดแล้วประกาศไว้ที่ <html> */}
            <StickyHeader className="flex flex-col gap-4">
                <UserHeader
                    onAddUser={() => setIsCreateModalOpen(true)}
                />

                <UserFilters
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    locationFilter={locationFilter}
                    setLocationFilter={setLocationFilter}
                    roleFilter={roleFilter}
                    setRoleFilter={setRoleFilter}
                    departments={departments}
                    activeFilterCount={activeFilterCount}
                    resultCount={processedUsers.length}
                    onClearFilters={handleClearFilters}
                />
            </StickyHeader>

            {/* หนึ่งตาราง ไม่ใช่ตารางคู่กับรายการการ์ด: UserCardList ที่เคยขึ้นแทน
                ต่ำกว่า md ถูกลบทิ้ง มันเป็นโค้ดชุดที่สองที่ทำงานเดียวกันและต้องแก้
                ให้ตรงกันเองทุกครั้ง ส่วนจอแคบเลื่อนตารางซ้ายขวาแทน ตามที่ D4 ของ
                spec รอบแรกตัดสินไว้สำหรับทุกหน้าในโฟลเดอร์นี้ */}
            <UserTable
                users={paginatedUsers}
                editingId={editingId}
                editForm={editForm}
                setEditForm={setEditForm}
                departments={departments}
                onSave={handleSave}
                onCancelEdit={cancelEdit}
                onStartEdit={startEdit}
                onDelete={handleDeleteClick}
                onResetPassword={openResetPasswordModal}
                sortConfig={sortConfig}
                onSort={handleSort}
                totalProcessedCount={processedUsers.length}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                totalPages={totalPages}
                setCurrentPage={setCurrentPage}
                onClearFilters={handleClearFilters}
                isLoading={isLoading}
            />

            {/* Modals */}
            <CreateUserModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                departments={departments}
                onSuccess={loadData}
            />

            <ResetPasswordModal
                state={resetPasswordState}
                onClose={() => setResetPasswordState(null)}
            />

            {/* เรนเดอร์เฉพาะตอนมี action จริง เพื่อให้ state ภายใน (กำลังทำงาน)
                ถูกล้างทุกครั้งที่เปิดกล่องใหม่ -- เหมือนอีกสามหน้า

                ของเดิมคือ ConfirmModal ในไฟล์ UserModals.tsx ซึ่ง `await
                action.onConfirm()` เปล่า ๆ ไม่ดัก rejection: คำขอที่ถูกปฏิเสธจึงหลุด
                เป็น unhandled แล้วกล่องปิดไปเหมือนสำเร็จ ConfirmDialog ดักให้ และ
                ไม่ปิดกล่องเมื่อล้มเหลว */}
            {confirmAction && (
                <ConfirmDialog
                    isOpen
                    title={confirmAction.title}
                    message={confirmAction.message}
                    confirmLabel={confirmAction.confirmLabel}
                    cancelLabel={t.common.cancel}
                    closeLabel={t.common.closeDialog}
                    workingLabel={t.common.working}
                    isDestructive={confirmAction.isDestructive}
                    onConfirm={confirmAction.onConfirm}
                    onCancel={() => setConfirmAction(null)}
                    onError={(error) => toast.error(describeAppError(error))}
                />
            )}
        </div>
    );
};
