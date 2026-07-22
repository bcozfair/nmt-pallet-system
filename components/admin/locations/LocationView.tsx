import React, { useEffect, useState, useMemo } from 'react';
import { Department, Pallet, Transaction } from '../../../types';
import { fetchDepartments, createDepartment, updateDepartment, deleteDepartment } from '../../../services/departmentService';
import { fetchPallets } from '../../../services/palletService';
import { fetchTransactions } from '../../../services/transactionService';
import { toast } from '../../../services/toast';
import { dict } from '../../../services/i18n';

// Components
import { LocationHeader } from './LocationHeader';
import { LocationFilters } from './LocationFilters';
import { LocationTable, LocationStats, LocationSortConfig, LocationSortKey } from './LocationTable';
import { LocationModal } from './LocationModals';
import { ConfirmModal, ConfirmActionType } from '../inventory/InventoryModals';
import { describeAppError } from '../../../services/appError';

export const LocationView: React.FC = () => {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [pallets, setPallets] = useState<Pallet[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    // Filter & Pagination State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive
    const [issueFilter, setIssueFilter] = useState('all'); // all, has_overdue, has_damage, empty

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState<LocationSortConfig>({ key: 'totalPallets', direction: 'desc' });

    // Derived Stats Map
    const [departmentStats, setDepartmentStats] = useState<Record<string, LocationStats>>({});

    // Modals State
    const [modalState, setModalState] = useState<{ isOpen: boolean, mode: 'add' | 'edit', initialValue?: string, id?: string }>({
        isOpen: false,
        mode: 'add'
    });
    const [confirmAction, setConfirmAction] = useState<ConfirmActionType | null>(null);

    // Inline Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ name: string }>({ name: '' });

    // This view renders no text of its own -- every string below is a toast or a
    // confirm-dialog label produced inside a callback, so they read the language
    // through dict() rather than useT(). That also keeps loadData correct: it is
    // captured by the mount-only effect below, where a `t` from useT would stay
    // frozen at whatever language was active on the first render.

    // Load Data
    const loadData = async () => {
        try {
            const [depts, allPallets, allTransactions] = await Promise.all([
                fetchDepartments(),
                fetchPallets(),
                fetchTransactions()
            ]);
            setDepartments(depts);
            setPallets(allPallets);
            setTransactions(allTransactions);
        } catch (error) {
            console.error("Failed to load data", error);
            toast.error(dict().locations.refreshFailed);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Calculate Stats
    useEffect(() => {
        const stats: Record<string, LocationStats> = {};
        const overdueLimit = parseInt(localStorage.getItem('nmt_setting_overdue_days') || '7');

        // Initialize all departments with 0
        departments.forEach(d => {
            stats[d.name] = { totalPallets: 0, overduePallets: 0, damagedPallets: 0, lastActivity: null };
        });

        // 1. Process Transactions for Last Activity (Historical & Current)
        transactions.forEach(t => {
            if (t.department_dest && stats[t.department_dest]) {
                const locStats = stats[t.department_dest];
                if (!locStats.lastActivity || new Date(t.timestamp) > new Date(locStats.lastActivity)) {
                    locStats.lastActivity = t.timestamp;
                }
            }
        });

        // 2. Tally Current Pallets
        pallets.forEach(p => {
            // Scrapped pallets have left the fleet, so they do not count toward
            // a location's holdings -- matching Total Fleet on the dashboard and
            // the location charts.
            if (p.status === 'scrapped') return;

            // If pallet is in a location that we know about
            if (stats[p.current_location] !== undefined) {
                const locStats = stats[p.current_location];
                locStats.totalPallets++;

                if (p.status === 'damaged') {
                    locStats.damagedPallets++;
                }

                if (p.status === 'in_use' && p.last_checkout_date) {
                    const days = (new Date().getTime() - new Date(p.last_checkout_date).getTime()) / (1000 * 3600 * 24);
                    if (days > overdueLimit) {
                        locStats.overduePallets++;
                    }
                }

                // Fallback: If no transaction history found (e.g. legacy data), use pallet's timestamp 
                // This logic is secondary to the transaction history above.
                const palletDate = p.last_transaction_date || p.last_checkout_date || p.created_at;
                if (palletDate) {
                    if (!locStats.lastActivity || new Date(palletDate) > new Date(locStats.lastActivity)) {
                        locStats.lastActivity = palletDate;
                    }
                }
            }
        });

        setDepartmentStats(stats);
    }, [departments, pallets, transactions]);


    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, issueFilter]);

    // --- Processing ---

    const processedDepartments = useMemo(() => {
        const filtered = departments.filter(d => {
            const stats = departmentStats[d.name] || { totalPallets: 0, overduePallets: 0, damagedPallets: 0, lastActivity: null };

            // 1. Text Search
            const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase());

            // 2. Status Filter
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && d.is_active) ||
                (statusFilter === 'inactive' && !d.is_active);

            // 3. Issue Filter (New!)
            let matchesIssue = true;
            if (issueFilter === 'has_overdue') matchesIssue = stats.overduePallets > 0;
            if (issueFilter === 'has_damage') matchesIssue = stats.damagedPallets > 0;
            if (issueFilter === 'empty') matchesIssue = stats.totalPallets === 0;
            if (issueFilter === 'not_empty') matchesIssue = stats.totalPallets > 0;

            return matchesSearch && matchesStatus && matchesIssue;
        });

        if (sortConfig) {
            return [...filtered].sort((a, b) => {
                let valA: any = '';
                let valB: any = '';

                // Determine values based on sort key
                if (['totalPallets', 'overduePallets', 'damagedPallets', 'lastActivity'].includes(sortConfig.key)) {
                    valA = departmentStats[a.name]?.[sortConfig.key as keyof LocationStats] || 0;
                    valB = departmentStats[b.name]?.[sortConfig.key as keyof LocationStats] || 0;
                } else {
                    valA = a[sortConfig.key as keyof Department];
                    valB = b[sortConfig.key as keyof Department];
                }

                if (valA === null || valA === undefined) return 1;
                if (valB === null || valB === undefined) return -1;

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [departments, searchTerm, statusFilter, issueFilter, departmentStats, sortConfig]);

    const totalPages = Math.ceil(processedDepartments.length / itemsPerPage);
    const paginatedDepartments = processedDepartments.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // --- Handlers ---

    // Inline Edit Handlers
    const handleStartEdit = (dept: Department) => {
        setEditingId(dept.id);
        setEditForm({ name: dept.name });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({ name: '' });
    };

    // departments_name_unique_ci indexes lower(trim(name)), so a collision comes
    // back as 23505 and the message has to explain the matching rule -- to
    // someone typing "line a" next to an existing "Line A", a bare "duplicate"
    // looks like a bug. Same shape as the 23503 handling in handleDeleteClick.
    const reportSaveError = (error: any, attemptedName: string) => {
        const d = dict().locations;
        console.error("Location save failed", error);
        if (error?.code === '23505') {
            toast.error(d.duplicateName(attemptedName));
        } else {
            toast.error(d.saveFailed(describeAppError(error)));
        }
    };

    const handleSaveEdit = async (id: string) => {
        // Trim before writing, not just before comparing. The unique index
        // matches on trim(name), so an untrimmed write would be rejected as a
        // duplicate of a name that looks different on screen.
        const trimmed = editForm.name.trim();
        if (!trimmed) {
            toast.error(dict().locations.nameRequired);
            return;
        }

        try {
            await updateDepartment(id, { name: trimmed });
            toast.success(dict().locations.updated);
            setEditingId(null);
            setEditForm({ name: '' });
            loadData();
        } catch (error: any) {
            reportSaveError(error, trimmed);
            // Stay in edit mode so the name can be corrected in place.
        }
    };

    const handleSave = async (name: string) => {
        const trimmed = name.trim();
        try {
            if (modalState.mode === 'add') {
                await createDepartment(trimmed);
                toast.success(dict().locations.added(trimmed));
            } else if (modalState.mode === 'edit' && modalState.id) {
                await updateDepartment(modalState.id, { name: trimmed });
                toast.success(dict().locations.updated);
            }
            loadData();
        } catch (error: any) {
            reportSaveError(error, trimmed);
            // Rethrown so LocationModal knows to stay open with the typed name
            // still in the field, rather than closing over a failed save.
            throw error;
        }
    };

    const handleToggleActive = async (dept: Department) => {
        const originalDepartments = [...departments];
        const updatedDepartments = departments.map(d =>
            d.id === dept.id ? { ...d, is_active: !d.is_active } : d
        );
        setDepartments(updatedDepartments);

        try {
            await updateDepartment(dept.id, { is_active: !dept.is_active });
            const d = dict().locations;
            toast.success(!dept.is_active ? d.activated : d.deactivated);
        } catch (error) {
            console.error("Toggle failed", error);
            setDepartments(originalDepartments);
            toast.error(dict().locations.statusUpdateFailed);
        }
    };

    const handleDeleteClick = (id: string) => {
        const d = dict().locations;
        setConfirmAction({
            title: d.confirmDeleteTitle,
            message: d.confirmDeleteMessage,
            confirmLabel: dict().common.delete,
            isDestructive: true,
            onConfirm: async () => {
                try {
                    await deleteDepartment(id);
                    toast.success(dict().locations.deleted);
                    loadData();
                } catch (error: any) {
                    const messages = dict().locations;
                    console.error("Delete failed", error);
                    if (error?.code === '23503') {
                        toast.error(messages.deleteInUse);
                    } else {
                        toast.error(messages.deleteFailed(describeAppError(error)));
                    }
                }
            }
        });
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setIssueFilter('all');
    };

    const handleSort = (key: LocationSortKey) => {
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
                <LocationHeader
                    onAdd={() => setModalState({ isOpen: true, mode: 'add' })}
                />
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-2 flex flex-col gap-6 styled-scrollbar">
                {/* Filters */}
                <LocationFilters
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    statusFilter={statusFilter}
                    onStatusFilterChange={setStatusFilter}
                    issueFilter={issueFilter}
                    onIssueFilterChange={setIssueFilter}
                />

                {/* Table View */}
                <LocationTable
                    paginatedDepartments={paginatedDepartments}
                    departmentStats={departmentStats}
                    totalProcessedCount={processedDepartments.length}
                    currentPage={currentPage}
                    itemsPerPage={itemsPerPage}
                    totalPages={totalPages}
                    setCurrentPage={setCurrentPage}

                    // Inline Edit Props
                    editingId={editingId}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    onStartEdit={handleStartEdit}
                    onSave={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}

                    onToggleStatus={handleToggleActive}
                    onDelete={handleDeleteClick}
                    onClearFilters={handleClearFilters}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                />
            </div>

            {/* Modals */}
            <LocationModal
                isOpen={modalState.isOpen}
                onClose={() => setModalState({ ...modalState, isOpen: false })}
                mode={modalState.mode}
                initialValue={modalState.initialValue}
                onSave={handleSave}
            />

            <ConfirmModal
                action={confirmAction}
                onClose={() => setConfirmAction(null)}
            />
        </div>
    );
};
