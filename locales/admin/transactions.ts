// Strings for the transactions area of the admin dashboard.
//
// Both languages live in this one file, next to each other, so a reviewer can
// check a translation against its original without opening a second file.
//
// The English object defines the shape; the Thai one is typed against it, so a
// key translated on one side and not the other fails `npm run typecheck`.
//
// Shared wording (Save, Cancel, Search, Status, Location, ...) belongs in
// `common` in locales/en.ts -- do not restate it here.
//
// The five action types are NOT listed here either: they live in `action` in
// locales/en.ts, because the badge, the filter dropdown, the CSV column and the
// mobile history all have to say the same thing. This screen shows them on
// every row, so it is the file most likely to drift if they were copied.

export const transactionsEn = {
    // --- Header ---
    title: 'Transaction Management',
    subtitle: 'View full history of check-ins, check-outs, and repairs.',
    cleanup: 'Cleanup Data',
    // `exportCsv` used to sit here, reading "Export CSV" while the dashboard's
    // identical button read "Export Data". Both now read `common.exportData`.

    // Heads the printed sheet (components/ui/PrintReportHeader.tsx). Its own key
    // rather than reusing `title` above: that one names a screen you manage
    // things on, this one names a document somebody is holding.
    reportTitle: 'Transaction History Report',

    // --- Filters ---
    searchPlaceholder: 'Search by Pallet ID, Notes...',
    allUsers: 'All Users',
    allLocations: 'All Locations',
    allActions: 'All Actions',
    startDate: 'Start Date',
    endDate: 'End Date',
    // The six below are read out loud, not seen: the filter bar's controls carry
    // no visible <label>, so each one needs a name of its own. They are spelled
    // out here rather than borrowed from `inventory` because the rule at the top
    // of this file cuts both ways -- a screen does not reach into another
    // screen's block either.
    searchTransactions: 'Search transactions',
    clearSearch: 'Clear search',
    filterByUser: 'Filter by user',
    filterByLocation: 'Filter by location',
    filterByAction: 'Filter by action type',
    // Sits under the filter card, and only while something is actually filtered.
    resultCount: (count: number) => `${count} results`,

    // --- Table ---
    // On-screen only now. It used to double as the CSV's timestamp heading, back
    // when this screen built its own export and wrote one combined cell; that
    // export is exportHistoryCSV, which splits the stamp into a `csv.header.date`
    // column and a `csv.header.time` column.
    colDateTime: 'Date & Time',
    colAction: 'Action',
    colPerformedBy: 'Performed By',
    colEvidence: 'Evidence',
    viewEvidence: 'View Evidence Image',
    deleteRecord: 'Delete Record',
    emptyFiltered: 'No transactions found matching your filters.',
    loading: 'Loading transactions...',

    // --- Edit modal ---
    // Also the tooltip on the row's edit button, which opens this modal.
    editTitle: 'Edit Transaction',
    dateReadOnly: 'Date (Read Only)',
    locationLabel: 'Location / Destination',
    noLocation: '(No Location)',
    locationSyncNote: "* Note: Updating the latest transaction will verify & sync the Pallet's location.",
    remarkLabel: 'Remarks / Notes',
    remarkPlaceholder: 'Add reason for edit or extra details...',
    saveChanges: 'Save Changes',
    // Appended to the remark when an admin edits it, so the floor can see the
    // note was changed after the fact. Date and time arrive pre-formatted in the
    // house DD-MMM-YYYY / 24h format -- they are not localised, on purpose.
    remarkStamp: (date: string, time: string, user: string) =>
        `(Updated: ${date}, ${time} by ${user})`,

    // --- Toasts and confirmations ---
    loadFailed: 'Failed to load transaction history.',
    evidenceLoadFailed: 'Could not load the evidence image.',
    // `exportDone` and `exportFailed` used to sit here, for the CSV builder this
    // screen carried in TransactionView. That builder is gone -- the screen calls
    // exportHistoryCSV now, which reports through `csv.historyDone` and
    // `csv.exportFailed` like the other two exports do.
    updated: 'Transaction updated successfully',
    updateFailed: 'Failed to update transaction',
    deleteTitle: 'Delete Transaction?',
    deleteMessage: 'Are you sure you want to delete this record? This action cannot be undone.',
    deleted: 'Transaction deleted',
    deleteFailed: 'Failed to delete transaction',
    cleanupTitle: 'Clean Old Data?',
    cleanupMessage: 'This will permanently delete transactions older than 2 years from the database. This action cannot be undone.',
    cleanupConfirm: 'Clean Data',
    cleanupDone: (count: number) => `Cleanup complete. Deleted ${count} old records.`,
    cleanupFailed: (reason: string) => `Cleanup failed: ${reason}`,
};

export type TransactionsDict = typeof transactionsEn;

export const transactionsTh: TransactionsDict = {
    title: 'จัดการประวัติรายการ',
    subtitle: 'ดูประวัติการเบิกออก รับคืน และการซ่อมทั้งหมด',
    cleanup: 'ล้างข้อมูลเก่า',
    reportTitle: 'รายงานประวัติการทำรายการ',

    searchPlaceholder: 'ค้นหาด้วยรหัสพาเลท หรือหมายเหตุ...',
    allUsers: 'ผู้ใช้งานทั้งหมด',
    allLocations: 'สถานที่ทั้งหมด',
    allActions: 'ทุกประเภทรายการ',
    startDate: 'วันที่เริ่ม',
    endDate: 'ถึงวันที่',
    searchTransactions: 'ค้นหารายการ',
    clearSearch: 'ล้างคำค้นหา',
    filterByUser: 'กรองตามผู้ใช้',
    filterByLocation: 'กรองตามสถานที่',
    filterByAction: 'กรองตามประเภทรายการ',
    resultCount: (count: number) => `พบ ${count} รายการ`,

    colDateTime: 'วันที่และเวลา',
    colAction: 'ประเภทรายการ',
    colPerformedBy: 'ผู้ทำรายการ',
    colEvidence: 'หลักฐาน',
    viewEvidence: 'ดูรูปหลักฐาน',
    deleteRecord: 'ลบรายการนี้',
    emptyFiltered: 'ไม่พบรายการที่ตรงกับตัวกรอง',
    loading: 'กำลังโหลดประวัติรายการ...',

    editTitle: 'แก้ไขรายการ',
    dateReadOnly: 'วันที่ (แก้ไขไม่ได้)',
    locationLabel: 'สถานที่/ปลายทาง',
    noLocation: '(ไม่ระบุสถานที่)',
    locationSyncNote: '* หมายเหตุ: การแก้ไขรายการล่าสุดจะตรวจสอบและอัปเดตสถานที่ของพาเลทให้ตรงกัน',
    remarkLabel: 'หมายเหตุ',
    remarkPlaceholder: 'ระบุเหตุผลที่แก้ไข หรือรายละเอียดเพิ่มเติม...',
    saveChanges: 'บันทึกการแก้ไข',
    remarkStamp: (date: string, time: string, user: string) =>
        `(แก้ไข: ${date}, ${time} โดย ${user})`,

    loadFailed: 'โหลดประวัติรายการไม่สำเร็จ',
    evidenceLoadFailed: 'โหลดรูปหลักฐานไม่สำเร็จ',
    updated: 'แก้ไขรายการเรียบร้อยแล้ว',
    updateFailed: 'แก้ไขรายการไม่สำเร็จ',
    deleteTitle: 'ลบรายการนี้?',
    deleteMessage: 'ต้องการลบรายการนี้ใช่หรือไม่ เมื่อลบแล้วไม่สามารถย้อนกลับได้',
    deleted: 'ลบรายการแล้ว',
    deleteFailed: 'ลบรายการไม่สำเร็จ',
    cleanupTitle: 'ล้างข้อมูลเก่า?',
    cleanupMessage: 'ระบบจะลบรายการที่เก่ากว่า 2 ปีออกจากฐานข้อมูลอย่างถาวร เมื่อลบแล้วไม่สามารถย้อนกลับได้',
    cleanupConfirm: 'ล้างข้อมูล',
    cleanupDone: (count: number) => `ล้างข้อมูลเสร็จแล้ว ลบรายการเก่า ${count} รายการ`,
    cleanupFailed: (reason: string) => `ล้างข้อมูลไม่สำเร็จ: ${reason}`,
};
