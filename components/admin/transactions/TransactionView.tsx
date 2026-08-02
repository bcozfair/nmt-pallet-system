import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, Department } from '../../../types';
import { fetchUsers } from '../../../services/userService';
import { fetchDepartments } from '../../../services/departmentService';
import { fetchTransactions, cleanupOldData, updateTransaction, deleteTransaction } from '../../../services/transactionService';
import { supabase } from '../../../services/supabase';
import { toast } from '../../../services/toast';
import { TransactionFilters } from './TransactionFilters';
import { TransactionTable, TxSortConfig } from './TransactionTable';
import { TransactionEditModal } from './TransactionEditModal';
import { ImageViewerModal } from '../common/ImageViewerModal';
import { TransactionHeader } from './TransactionHeader';
import { ConfirmDialog, StickyHeader } from '../../ui';
import { ReportPrintHost, useReportPrint } from '../../report';
import { TransactionReport } from './report/TransactionReport';
import { exportHistoryCSV } from '../../../utils/exportHelpers';
import { getEvidenceSignedUrl } from '../../../services/storageService';
import { useT } from '../../../hooks/useT';
import { dict } from '../../../services/i18n';
import { describeAppError } from '../../../services/appError';

// The handlers below read dict() rather than the hook's `t`. They are async, and
// two of them (loadData, and the onConfirm stored in confirmAction) outlive the
// render that created them -- dict() is read at the moment the message is shown,
// so a language switch mid-request cannot leave a toast in the old language.
// JSX still uses the hook, which is what re-renders this screen on a switch.


// This screen filters, sorts and paginates in the browser, so every row it can
// possibly show has to be in memory. Unbounded, that was a select of the whole
// table -- which PostgREST silently trimmed to db.max_rows (1000) anyway, so the
// screen was already capped, just without saying so or letting anyone choose the
// number. 2000 is that choice: two years of this fleet's activity fits inside it,
// and the note below tells the reader when it does not.
const TX_FETCH_LIMIT = 2000;

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
        /** ตั้งเฉพาะคำสั่งที่ลบทีละหลายแถว -- ดู ConfirmDialog.confirmPhrase */
        confirmPhrase?: string;
        confirmPhraseLabel?: string;
        onConfirm: () => Promise<void>;
    } | null>(null);

    // Initialization (same loadData)
    const loadData = async () => {
        setLoading(true);
        try {
            const [txData, userData, deptData] = await Promise.all([
                // Newest first, because a cap only makes sense from one end and
                // this is the end an operator opens the screen looking for. The
                // CSV export further down writes out whatever passed the filters,
                // so it inherits the same window -- utils/exportHelpers.ts is
                // still the export that promises the complete history.
                fetchTransactions({ limit: TX_FETCH_LIMIT, order: 'desc' }),
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

    // Page 1 whenever the filters change. This effect was described in a comment
    // here as already existing and did not -- UserView.tsx, LocationView.tsx and
    // useInventoryFilters.ts all have it. Without it, narrowing the filters
    // while on page 5 of a result set that is now one page long leaves the table
    // empty with nothing on screen saying why.
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, actionFilter, locationFilter, userFilter, dateRange]);

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

    // How many of the five are off their default. The filter bar shows its
    // "N results / clear filters" row only when this is above zero -- an
    // untouched screen has nothing to report and no filters to clear.
    const activeFilterCount = [
        searchTerm !== '',
        actionFilter !== 'all',
        locationFilter !== 'all',
        userFilter !== 'all',
        dateRange.start !== '' || dateRange.end !== '',
    ].filter(Boolean).length;

    // The rows that passed the filters, not the whole table: the file has to be
    // what is on screen. exportHistoryCSV fetches the entire history itself when
    // it is handed nothing, which is how the dashboard's copy of this button
    // behaves.
    //
    // This screen used to assemble the CSV here instead. That builder is gone --
    // exportHelpers.ts's header comment lists what it carried: a storage object
    // name in the Evidence column that opened nothing, a combined date-time cell
    // in a different format from the other export's, and a filename that made
    // the same report look like two. It reported through toasts of its own too,
    // which is why `transactions.exportDone`/`exportFailed` are gone with it.
    const handleExport = () => {
        void exportHistoryCSV(processedTransactions);
    };

    // --- PRINT ---
    //
    // THIS SCREEN NO LONGER PRINTS ITSELF. It used to render every filtered row
    // and hide the off-page ones so a `tr[data-print-row]` rule could reveal them
    // for print. That produced a document, but the rows per sheet were whatever
    // the engine happened to fit and the remark column vanished from the paper
    // because it is `xl:` and A4 is narrower than `xl`.
    //
    // What replaces it is a separate A4 document that declares its own pages --
    // report/TransactionReport.tsx, on the shared kit in components/report/.
    // Nothing has to be fetched before it can be built: unlike the inventory
    // report's photo appendix, every value this one prints is already in
    // `processedTransactions`.
    const { job: printJob, print: printReport } = useReportPrint();

    // What the printed sheet says the rows were filtered by. Assembled here
    // because this is the component holding every filter's value; the report only
    // lays out the phrases it is handed.
    const printFilters: string[] = [];
    if (searchTerm) printFilters.push(`${t.common.search}: ${searchTerm}`);
    if (actionFilter !== 'all') {
        printFilters.push(
            `${t.transactions.colAction}: ${t.action[actionFilter as keyof typeof t.action] ?? actionFilter}`,
        );
    }
    // A location is a department name an admin typed in, and a user name is a
    // person's name -- both print verbatim, never translated.
    if (locationFilter !== 'all') printFilters.push(`${t.common.location}: ${locationFilter}`);
    if (userFilter !== 'all') printFilters.push(`${t.common.user}: ${users[userFilter] ?? userFilter}`);
    if (dateRange.start || dateRange.end) {
        printFilters.push(`${t.common.date}: ${dateRange.start || '…'} – ${dateRange.end || '…'}`);
    }

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
        // ConfirmDialog renders whatever it is handed, so the wording is
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
            // ด่านพิมพ์คำ -- คำสั่งเดียวในหน้านี้ที่ลบหลายแถวรวดเดียวและเลือกแถว
            // ไม่ได้ ต่างจากปุ่มลบรายแถวที่คนกดหลังจากมองรายการนั้นอยู่แล้ว
            confirmPhrase: c.transactions.cleanupPhrase,
            confirmPhraseLabel: c.transactions.cleanupPhraseLabel(c.transactions.cleanupPhrase),
            onConfirm: async () => {
                try {
                    const { transactions: rows, images } = await cleanupOldData(2);
                    toast.success(dict().transactions.cleanupDone(rows, images));
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


    return (
        // No height and no overflow here, on purpose. This used to be a box
        // clamped to h-[calc(100vh-110px)] wrapping an inner overflow-y-auto
        // scroller wrapping a table clamped to h-[calc(100vh-240px)] -- the
        // nested-scroll-container pattern InventoryView.tsx, AdminDashboard.tsx
        // and index.css's print section all record as abandoned everywhere else
        // in this app, for the same two reasons: the scrollbar it produces
        // belongs to an inner box instead of the page, so the wheel stops dead
        // at that box's edge instead of continuing down the document; and a box
        // clamped to 100vh has nothing below the fold to hand to the printer.
        <div className="flex flex-col gap-4">
            {/* Everything above the rows travels together and stays pinned at
                xl: the page header and the filter bar. What scrolls is the rows
                and the pagination under them. The table's own head pins directly
                beneath this block -- see StickyHeader and DataTable for how the
                two find each other.

                The inner gap-4 is this page's own rhythm, repeated here because
                these two are no longer direct children of the column that sets
                it. */}
            <StickyHeader className="flex flex-col gap-4">
                <TransactionHeader
                    onCleanup={handleCleanup}
                    onExport={handleExport}
                    onPrintReport={printReport}
                />

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
                    activeFilterCount={activeFilterCount}
                    resultCount={processedTransactions.length}
                    onClearFilters={handleClearFilters}
                />
            </StickyHeader>

            {/* Shown only when the fetch actually came back full. Below the cap
                the list IS the whole history and a note would be a lie; at the
                cap the filters and the row count underneath are describing a
                window, and nothing else on screen says so.

                The wording is assembled from history.showing and history.recentOnly
                rather than a literal, because a hardcoded string here would be
                English on a Thai screen. Neither key was written for this screen
                -- see the note in the summary about giving transactions its own.

                Deliberately outside StickyHeader: it describes the data set, not
                a control, and anything added to the pinned stack is height taken
                away from the rows for the whole of every scroll. */}
            {transactions.length >= TX_FETCH_LIMIT && (
                <p className="-mb-2 px-1 text-xs text-slate-500">
                    {t.history.showing(transactions.length)} ({t.history.recentOnly})
                </p>
            )}

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
                // Was a full-page `if (loading) return <div>Loading...</div>`,
                // which held the page header and the filter bar back for a whole
                // fetch. The table draws a skeleton in its own card instead, and
                // everything above it arrives immediately -- same as the
                // inventory screen.
                isLoading={loading}
            />

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

            {/* เรนเดอร์เฉพาะตอนมี action จริง เพื่อให้ state ภายใน (กำลังทำงาน)
                ถูกล้างทุกครั้งที่เปิดกล่องใหม่ -- เหมือน InventoryView.tsx และ
                LocationView.tsx ของเดิมเรนเดอร์ค้างไว้เสมอแล้วสลับด้วย isOpen

                เรียก ConfirmDialog ตรง ๆ ไม่ผ่าน common/ConfirmationModal แล้ว:
                ที่ wrapper นั้นมีอยู่ก็เพื่อเติมสามป้ายกับช่องทาง error ให้ call site
                ที่ยังไม่ได้ย้าย -- พอย้ายแล้วก็ส่งเองได้ตรงนี้ ไฟล์นั้นยังอยู่เพราะ
                SettingsView.tsx ใช้อยู่ */}
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
                    confirmPhrase={confirmAction.confirmPhrase}
                    confirmPhraseLabel={confirmAction.confirmPhraseLabel}
                    onConfirm={confirmAction.onConfirm}
                    onCancel={() => setConfirmAction(null)}
                    onError={(error) => toast.error(describeAppError(error))}
                />
            )}

            {/* Mounted only while a print is in flight. It portals as many sheets
                as the filtered rows need into <body> -- up to TX_FETCH_LIMIT of
                them, which is why it is not built on every visit to this screen
                for a reader who never presses the button. */}
            {printJob && (
                <ReportPrintHost>
                    <TransactionReport
                        transactions={processedTransactions}
                        userMap={users}
                        filterLine={
                            printFilters.length > 0
                                ? `${t.common.printFilters} ${printFilters.join(' · ')}`
                                : undefined
                        }
                        // Only when the fetch actually came back full. Below the
                        // cap the list IS the whole history and the note would be
                        // a lie -- the same test the on-screen note above uses.
                        windowLimit={
                            transactions.length >= TX_FETCH_LIMIT ? TX_FETCH_LIMIT : undefined
                        }
                        generatedAt={printJob.at}
                    />
                </ReportPrintHost>
            )}
        </div>
    );
};
