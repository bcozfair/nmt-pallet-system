
import { fetchPallets } from '../services/palletService';
import { fetchUsers } from '../services/userService';
import { fetchTransactions } from '../services/transactionService';
import { formatDate, formatDateTime, palletStatusLabel } from '../components/admin/common/AdminHelpers';
import { toast } from '../services/toast';
import { dict } from '../services/i18n';
import { describeAppError } from '../services/appError';



// U+FEFF. Excel on Windows ignores the charset in a data: URI and falls back to
// the system ANSI codepage, which turns every Thai character into mojibake. A
// leading byte-order mark is the only thing that makes it read the file as
// UTF-8. Harmless for the all-ASCII case, so it is always emitted.
const UTF8_BOM = '﻿';

export const generateCSV = (headers: string[], rows: (string | number)[][], filename: string) => {

    try {
        const csvContent = UTF8_BOM
            + headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n"
            + rows.map(e => (Array.isArray(e) ? e : [e]).map(cell => `"${(cell ?? '').toString().replace(/"/g, '""')}"`).join(",")).join("\n");

        // Blob + object URL rather than a data: URI. encodeURI() leaves the BOM
        // and other non-ASCII characters to be re-encoded by the browser, and
        // data: URIs are additionally capped at a couple of MB in some browsers
        // -- a full transaction history export can exceed that.
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return true;
    } catch (e) {
        console.error("CSV generation failed", e);
        return false;
    }
};

export const exportInventoryCSV = async () => {

    // dict() throughout: this module is called from event handlers, not rendered.
    const t = dict();

    try {
        toast.info(t.csv.preparingInventory);

        // 1. Fetch all necessary data
        const [pallets, users, transactions] = await Promise.all([
            fetchPallets(),
            fetchUsers(),
            fetchTransactions()
        ]);

        // 2. Create Lookups
        const userMap = users.reduce((acc, u) => ({ ...acc, [u.id]: u.full_name }), {} as Record<string, string>);
        const latestTxMap: Record<string, typeof transactions[0]> = {};

        // Find latest transaction for each pallet to determine "Responsible Person" and "Action Details"
        // Transactions are already ordered by timestamp desc from service, but let's be safe
        transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        transactions.forEach(tx => {
            if (!latestTxMap[tx.pallet_id]) {
                latestTxMap[tx.pallet_id] = tx;
            }
        });

        // 3. Define Columns
        const h = t.csv.header;
        const headers = [
            h.palletId,
            h.status,
            h.currentLocation,
            h.responsiblePerson,
            h.lastAction,
            h.lastActivityDate,
            h.daysOverdue,
            h.dateAdded,
            h.evidenceFile      // storage object name; bucket is private
        ];

        const rows = pallets.map(p => {
            const tx = latestTxMap[p.pallet_id];
            const responsiblePerson = tx ? (userMap[tx.user_id] || tx.user_id) : '-';

            // Calculate Overdue
            let overdue = 0;
            if (p.status === 'in_use' && p.last_checkout_date) {
                overdue = Math.floor((new Date().getTime() - new Date(p.last_checkout_date).getTime()) / (1000 * 3600 * 24));
            }

            // Format Dates
            const lastActivity = p.last_transaction_date ? formatDateTime(p.last_transaction_date) :
                (tx ? formatDateTime(tx.timestamp) : '-');

            const created = p.created_at ? formatDate(p.created_at) : '-';
            const evidence = tx?.evidence_image_url && tx.evidence_image_url !== 'image_deleted' ? tx.evidence_image_url : '';

            return [
                p.pallet_id,
                palletStatusLabel(p.status),
                p.current_location,
                responsiblePerson,
                // Was tx.action_type -- the raw enum ("report_damage") in a column
                // headed "Last Action". Same table the history export uses below.
                tx ? (t.action[tx.action_type] ?? tx.action_type) : '-',
                lastActivity,
                overdue > 0 ? overdue.toString() : '0',
                created,
                evidence
            ];
        });


        const d = new Date();
        const filenameDate = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
        const filename = `nmt_current_inventory_${filenameDate}.csv`;

        generateCSV(headers, rows, filename);


        toast.success(t.csv.inventoryDone(pallets.length));
    } catch (e: any) {
        console.error(e);
        toast.error(t.csv.exportFailed(describeAppError(e)));
    }
};

export const exportHistoryCSV = async () => {
    const t = dict();

    try {
        toast.info(t.csv.preparingHistory);
        // 1. Fetch data in parallel
        const [users, transactions] = await Promise.all([
            fetchUsers(),
            fetchTransactions()
        ]);

        // 2. Create User Map
        const userMap = users.reduce((acc, u) => ({ ...acc, [u.id]: u.full_name }), {} as Record<string, string>);

        // 3. Build CSV Lines
        const h = t.csv.header;
        const headers = [
            h.date,
            h.time,
            h.palletId,
            h.actionType,
            h.performedBy,
            h.locationDest,
            h.evidenceFile
        ];

        const rows = transactions.map(tx => {
            const dateObj = new Date(tx.timestamp);
            const dateStr = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
            const timeStr = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

            const userName = userMap[tx.user_id] || `${t.common.user}: ${tx.user_id}`;
            // This used to be a five-branch ternary duplicating the same labels
            // MobileHistory had its own copy of. Both now read the one table.
            const action = t.action[tx.action_type] ?? tx.action_type;

            const evidence = tx.evidence_image_url && tx.evidence_image_url !== 'image_deleted' ? tx.evidence_image_url : '';

            return [
                dateStr,
                timeStr,
                tx.pallet_id,
                action,
                userName,
                tx.department_dest || t.csv.warehouse,
                evidence
            ];
        });


        // 4. Generate CSV
        const d = new Date();
        const filenameDate = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
        const filename = `nmt_transaction_history_${filenameDate}.csv`;

        generateCSV(headers, rows, filename);


        toast.success(t.csv.historyDone(rows.length));

    } catch (e: any) {
        console.error(e);
        toast.error(t.csv.exportFailed(describeAppError(e)));
    }
};
