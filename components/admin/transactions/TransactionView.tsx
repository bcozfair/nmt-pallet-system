import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, Department } from '../../../types';
import { fetchUsers } from '../../../services/userService';
import { fetchDepartments } from '../../../services/departmentService';
import { fetchTransactions, cleanupOldData, updateTransaction, deleteTransaction } from '../../../services/transactionService';
import { supabase } from '../../../services/supabase';
import { toast } from '../../../services/toast';
import { formatDateTime } from '../common/AdminHelpers';
import { TransactionFilters } from './TransactionFilters';
import { TransactionTable, TxSortConfig } from './TransactionTable';
import { TransactionEditModal } from './TransactionEditModal';
import { ImageViewerModal } from '../common/ImageViewerModal';
import { TransactionHeader } from './TransactionHeader';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { generateCSV } from '../../../utils/exportHelpers';
import { getEvidenceSignedUrl } from '../../../services/storageService';
import { useT } from '../../../hooks/useT';
import { dict } from '../../../services/i18n';
import { describeAppError } from '../../../services/appError';

// The handlers below read dict() rather than the hook's `t`. They are async, and
// two of them (loadData, and the onConfirm stored in confirmAction) outlive the
// render that created them -- dict() is read at the moment the message is shown,
// so a language switch mid-request cannot leave a toast in the old language.
// JSX still uses the hook, which is what re-renders this screen on a switch.


export const TransactionView = () => {
    const t = useT();

    // Data State
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [users, setUsers] = useState<Record<string, string>>({});
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<{ id: string, name: string } | null>(null);

    // Edit Modal State
    const [editModal, setEditModal] = useState<{ isOpen: boolean, transaction: Transaction | null }>({
        isOpen: false,
        transaction: null
    });

    // ... (Filter, Sort, Pagination, PreviewImage, ConfirmModal states remain)

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [locationFilter, setLocationFilter] = useState('all');
    const [userFilter, setUserFilter] = useState('all');
    const [dateRange, setDateRange] = useState<{ start: string, end: string }>({ start: '', end: '' });

    // Sort & Pagination State
    const [sortConfig, setSortConfig] = useState<TxSortConfig>({ key: 'timestamp', direction: 'desc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);

    // Modal State for Image View
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // evidence_image_url holds a storage object name, not a renderable URL --
    // the damage_reports bucket is private. Sign on demand, only for the one
    // image actually being opened.
    const handleViewImage = async (stored: string) => {
        const signed = await getEvidenceSignedUrl(stored);
        if (signed) {
            setPreviewImage(signed);
        } else {
            toast.error(dict().transactions.evidenceLoadFailed);
        }
    };

    // Confirmation Modal State
    const [confirmAction, setConfirmAction] = useState<{
        title: string;
        message: string;
        confirmLabel: string;
        isDestructive?: boolean;
        onConfirm: () => Promise<void>;
    } | null>(null);

    // Initialization (same loadData)
    const loadData = async () => {
        setLoading(true);
        try {
            const [txData, userData, deptData] = await Promise.all([
                fetchTransactions(),
                fetchUsers(),
                fetchDepartments()
            ]);

            // Map users for easy lookup
            const uMap: Record<string, string> = {};
            userData.forEach(u => { uMap[u.id] = u.full_name; });
            setUsers(uMap);

            setTransactions(txData);
            setDepartments(deptData);

            // Get Current User (Reset first)
            let authUser = null;
            const userResponse = await supabase.auth.getUser();
            if (userResponse.data.user) {
                authUser = userResponse.data.user;
            } else {
                // Fallback to session
                const sessionResponse = await supabase.auth.getSession();
                if (sessionResponse.data.session) {
                    authUser = sessionResponse.data.session.user;
                }
            }

            if (authUser) {
                const fullName = uMap[authUser.id] || authUser.user_metadata?.full_name || 'Admin';
                setCurrentUser({ id: authUser.id, name: fullName });
            } else {
                // Fallback if no auth found (shouldn't happen in admin, but safe fallback)
                console.warn("No auth user found in TransactionHistory, defaulting to Admin");
                setCurrentUser({ id: 'unknown', name: 'Admin' });
            }

        } catch (error) {
            console.error("Failed to load transactions", error);
            toast.error(dict().transactions.loadFailed);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // ... (useEffect for filter reset and useMemo processedTransactions remain)

    // Data Processing needs to handle newly added 'notes' if needed for search? 
    // Yes, let's add notes to search
    const processedTransactions = useMemo(() => {
        let data = transactions.filter(tx => {
            const term = searchTerm.toLowerCase();
            const matchesSearch =
                tx.pallet_id.toLowerCase().includes(term) ||
                (tx.department_dest || '').toLowerCase().includes(term) ||
                (tx.transaction_remark || '').toLowerCase().includes(term);

            // Action Filter
            const matchesAction = actionFilter === 'all' || tx.action_type === actionFilter;

            // Location Filter (Destination)
            const matchesLocation = locationFilter === 'all' || (tx.department_dest === locationFilter);

            // Date Filter
            let matchesDate = true;
            if (dateRange.start) {
                const start = new Date(dateRange.start);
                start.setHours(0, 0, 0, 0);
                matchesDate = matchesDate && new Date(tx.timestamp) >= start;
            }
            if (dateRange.end) {
                const end = new Date(dateRange.end);
                end.setHours(23, 59, 59, 999);
                matchesDate = matchesDate && new Date(tx.timestamp) <= end;
            }

            // User Filter
            const matchesUser = userFilter === 'all' || tx.user_id === userFilter;

            return matchesSearch && matchesAction && matchesLocation && matchesDate && matchesUser;
        });

        // Sorting (including notes?)
        if (sortConfig) {
            data.sort((a, b) => {
                const valA = a[sortConfig.key] || '';
                const valB = b[sortConfig.key] || '';

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return data;
    }, [transactions, users, searchTerm, actionFilter, locationFilter, userFilter, dateRange, sortConfig]);


    // Handlers (Sort, Clear, Export, Cleanup remain)
    const handleSort = (key: keyof Transaction) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setActionFilter('all');
        setLocationFilter('all');
        setUserFilter('all');
        setDateRange({ start: '', end: '' });
    };

    const handleExport = () => {
        // ... (Export logic, add Notes column)
        try {
            const strings = dict();
            // Column names come from the shared csv.header block, so this export and
            // the full-history one in utils/exportHelpers.ts head their columns alike.
            const h = strings.csv.header;
            const headers = [
                strings.transactions.colDateTime,
                h.palletId,
                h.actionType,
                strings.common.user,
                h.locationDest,
                strings.common.remark,
                h.evidenceFile
            ];
            const rows = processedTransactions.map(tx => [
                formatDateTime(tx.timestamp),
                tx.pallet_id,
                // Was the raw enum ("report_damage") under a heading that reads
                // "Action". Same table every badge and dropdown on this screen uses.
                strings.action[tx.action_type] ?? tx.action_type,
                users[tx.user_id] || tx.user_id,
                tx.department_dest || '',
                tx.transaction_remark || '',
                tx.evidence_image_url || ''
            ]);

            const d = new Date();
            const filename = `transactions_export_${d.toISOString().split('T')[0]}.csv`;

            const success = generateCSV(headers, rows, filename);

            if (success) {
                toast.success(strings.transactions.exportDone(processedTransactions.length));
            } else {
                toast.error(strings.transactions.exportFailed);
            }
        } catch (e) {
            console.error(e);
            toast.error(dict().transactions.exportFailed);
        }
    };

    // --- EDIT & DELETE HANDLERS ---

    const handleEdit = (tx: Transaction) => {
        setEditModal({ isOpen: true, transaction: tx });
    };

    const handleSaveEdit = async (id: string, updates: { department_dest?: string, transaction_remark?: string }) => {
        if (!editModal.transaction) return;
        try {
            const originalRemark = editModal.transaction.transaction_remark || '';
            let finalRemark = updates.transaction_remark || '';

            // Auto-append stamp if logic requires (e.g. if changed)
            if (finalRemark !== originalRemark && currentUser) {
                const d = new Date();
                const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                // 'en-GB' stays: the stamp has to read the same as every other date
                // on screen and in the CSV. Only the wording around it is translated.
                finalRemark = `${finalRemark.trim()} ${dict().transactions.remarkStamp(dateStr, timeStr, currentUser.name)}`;
            }

            await updateTransaction(id, editModal.transaction.pallet_id, {
                ...updates,
                transaction_remark: finalRemark
            });

            toast.success(dict().transactions.updated);
            loadData(); // Reload to see changes
        } catch (error) {
            console.error(error);
            toast.error(dict().transactions.updateFailed);
        }
    };

    const handleDelete = (id: string) => {
        // ConfirmationModal renders whatever it is handed, so the wording is
        // translated here, at the call site that knows what is being confirmed.
        const c = dict();
        setConfirmAction({
            title: c.transactions.deleteTitle,
            message: c.transactions.deleteMessage,
            confirmLabel: c.common.delete,
            isDestructive: true,
            onConfirm: async () => {
                try {
                    await deleteTransaction(id);
                    toast.success(dict().transactions.deleted);
                    loadData();
                } catch (error) {
                    toast.error(dict().transactions.deleteFailed);
                }
            }
        });
    };

    const handleCleanup = async () => {
        // ... (Cleanup logic)
        const c = dict();
        setConfirmAction({
            title: c.transactions.cleanupTitle,
            message: c.transactions.cleanupMessage,
            confirmLabel: c.transactions.cleanupConfirm,
            isDestructive: true,
            onConfirm: async () => {
                try {
                    const count = await cleanupOldData(2);
                    toast.success(dict().transactions.cleanupDone(count));
                    loadData();
                } catch (e: any) {
                    toast.error(dict().transactions.cleanupFailed(describeAppError(e)));
                }
            }
        });
    };

    // Pagination Slicing
    const totalPages = Math.ceil(processedTransactions.length / itemsPerPage);
    const paginatedTransactions = processedTransactions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );


    if (loading) {
        return <div className="p-12 text-center text-gray-500">{t.transactions.loading}</div>;
    }

    return (
        <div className="h-[calc(100vh-110px)] flex flex-col gap-6 overflow-hidden">
            {/* Header ... */}
            <div className="shrink-0">
                <TransactionHeader
                    onCleanup={handleCleanup}
                    onExport={handleExport}
                />
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-2 flex flex-col gap-6 styled-scrollbar">
                <TransactionFilters
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    actionFilter={actionFilter}
                    setActionFilter={setActionFilter}
                    locationFilter={locationFilter}
                    setLocationFilter={setLocationFilter}
                    dateRange={dateRange}
                    setDateRange={setDateRange}
                    departments={departments}
                    userFilter={userFilter}
                    setUserFilter={setUserFilter}
                    users={users}
                />

                <TransactionTable
                    paginatedTransactions={paginatedTransactions}
                    totalProcessedCount={processedTransactions.length}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    currentPage={currentPage}
                    itemsPerPage={itemsPerPage}
                    totalPages={totalPages}
                    setCurrentPage={setCurrentPage}
                    userMap={users}
                    onClearFilters={handleClearFilters}
                    onViewImage={handleViewImage}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            </div>

            <TransactionEditModal
                isOpen={editModal.isOpen}
                onClose={() => setEditModal({ isOpen: false, transaction: null })}
                onSave={handleSaveEdit}
                transaction={editModal.transaction}
                departments={departments}
            />

            {/* Image Preview Modal */}
            <ImageViewerModal
                src={previewImage}
                onClose={() => setPreviewImage(null)}
            />

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!confirmAction}
                title={confirmAction?.title || ''}
                message={confirmAction?.message || ''}
                confirmLabel={confirmAction?.confirmLabel || ''}
                isDestructive={confirmAction?.isDestructive}
                onConfirm={async () => {
                    if (confirmAction) {
                        await confirmAction.onConfirm();
                        setConfirmAction(null);
                    }
                }}
                onCancel={() => setConfirmAction(null)}
            />

        </div>
    );
};
