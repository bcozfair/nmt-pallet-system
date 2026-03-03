
import { fetchPallets } from '../services/palletService';
import { fetchUsers } from '../services/userService';
import { fetchTransactions } from '../services/transactionService';
import { formatDate, formatDateTime } from '../components/admin/common/AdminHelpers';
import { toast } from '../services/toast';



export const generateCSV = (headers: string[], rows: (string | number)[][], filename: string) => {

    try {
        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => (Array.isArray(e) ? e : [e]).map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return true;
    } catch (e) {
        console.error("CSV generation failed", e);
        return false;
    }
};

export const exportInventoryCSV = async () => {

    try {
        toast.info("Preparing inventory report...");

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
        const headers = [
            'Pallet ID',
            'Status',
            'Current Location',
            'Responsible Person', // New
            'Last Action',        // New
            'Last Activity Date',
            'Days Overdue',       // New
            'Date Added',         // New
            'Evidence URL'        // New
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
                p.status,
                p.current_location,
                responsiblePerson,
                tx ? tx.action_type : '-',
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


        toast.success(`Exported ${pallets.length} inventory items.`);
    } catch (e: any) {
        console.error(e);
        toast.error("Export failed: " + e.message);
    }
};

export const exportHistoryCSV = async () => {
    try {
        toast.info("Preparing full history export...");
        // 1. Fetch data in parallel
        const [users, transactions] = await Promise.all([
            fetchUsers(),
            fetchTransactions()
        ]);

        // 2. Create User Map
        const userMap = users.reduce((acc, u) => ({ ...acc, [u.id]: u.full_name }), {} as Record<string, string>);

        // 3. Build CSV Lines
        const headers = [
            'Date',
            'Time',
            'Pallet ID',
            'Action Type',
            'Performed By',
            'Location/Destination',
            'Evidence URL'
        ];

        const rows = transactions.map(tx => {
            const dateObj = new Date(tx.timestamp);
            const dateStr = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
            const timeStr = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

            const userName = userMap[tx.user_id] || `User: ${tx.user_id}`;
            const action = tx.action_type === 'check_out' ? 'Check Out' :
                tx.action_type === 'check_in' ? 'Check In' :
                    tx.action_type === 'report_damage' ? 'Damage Reported' :
                        tx.action_type === 'repair' ? 'Repaired' : tx.action_type;

            const evidence = tx.evidence_image_url && tx.evidence_image_url !== 'image_deleted' ? tx.evidence_image_url : '';

            return [
                dateStr,
                timeStr,
                tx.pallet_id,
                action,
                userName,
                tx.department_dest || 'Warehouse',
                evidence
            ];
        });


        // 4. Generate CSV
        const d = new Date();
        const filenameDate = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
        const filename = `nmt_transaction_history_${filenameDate}.csv`;

        generateCSV(headers, rows, filename);


        toast.success(`Exported ${rows.length} records successfully.`);

    } catch (e: any) {
        console.error(e);
        toast.error("History export failed: " + e.message);
    }
};
