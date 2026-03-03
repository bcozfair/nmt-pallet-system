import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../../../types';
import { supabase } from '../../../services/supabase';
import { fetchDepartments } from '../../../services/departmentService';
import { fetchUsers } from '../../../services/userService';
import { adminDeleteUser } from '../../../services/authService';
import { toast } from '../../../services/toast';

// Sub-components
import { UserTable, UserSortConfig } from './UserTable';
import { UserCardList } from './UserCardList';
import { UserHeader } from './UserHeader';
import { UserFilters } from './UserFilters';
import { CreateUserModal, ResetPasswordModal, ConfirmModal, ConfirmActionType, ResetPasswordState } from './UserModals';
import { Pagination } from '../common/Pagination';
import { Search } from 'lucide-react';

export const UserView: React.FC = () => {
    // Data State
    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);

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
            toast.error("Failed to load users");
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
            toast.success("User updated successfully");
            setEditingId(null);
            loadData();
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to update user");
        }
    };

    const handleDeleteClick = (user: User) => {
        setConfirmAction({
            title: "Delete User",
            message: `Are you sure you want to delete ${user.full_name} (${user.employee_id})? This action cannot be undone.`,
            confirmLabel: "Delete User",
            isDestructive: true,
            onConfirm: async () => {
                try {
                    await adminDeleteUser(user.id);
                    toast.success("User deleted successfully");
                    loadData();
                } catch (error: any) {
                    console.error("Delete failed", error);
                    toast.error("Failed to delete user: " + (error.message || "Unknown error"));
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

    const handleSort = (key: keyof User) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    return (
        <div className="h-[calc(100vh-110px)] flex flex-col gap-6 overflow-hidden animate-in fade-in duration-500">
            {/* Header */}
            <div className="shrink-0">
                <UserHeader
                    onAddUser={() => setIsCreateModalOpen(true)}
                />
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-2 flex flex-col gap-6 styled-scrollbar">
                {/* Filters */}
                <UserFilters
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    locationFilter={locationFilter}
                    setLocationFilter={setLocationFilter}
                    roleFilter={roleFilter}
                    setRoleFilter={setRoleFilter}
                    departments={departments}
                />

                {/* List Views */}
                {processedUsers.length > 0 ? (
                    <>
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
                        />

                        <UserCardList
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
                        />

                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            totalItems={processedUsers.length}
                            itemsPerPage={itemsPerPage}
                        />
                    </>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center flex flex-col items-center text-gray-400 gap-2">
                        <Search size={48} className="opacity-20" />
                        <p>No users found matching your filters.</p>
                        <button onClick={handleClearFilters} className="text-blue-600 font-bold hover:underline">Clear Filters</button>
                    </div>
                )}
            </div>

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

            <ConfirmModal
                action={confirmAction}
                onClose={() => setConfirmAction(null)}
            />
        </div>
    );
};
