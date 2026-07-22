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
    exportCsv: 'Export CSV',

    // --- Filters ---
    searchPlaceholder: 'Search by Pallet ID, Notes...',
    allUsers: 'All Users',
    allLocations: 'All Locations',
    allActions: 'All Actions',
    startDate: 'Start Date',
    endDate: 'End Date',

    // --- Table ---
    // Doubles as the "Timestamp" column of this screen's CSV export: one column
    // holding formatDateTime output deserves the same heading in both places.
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
    exportDone: (count: number) => `Exported ${count} records.`,
    exportFailed: 'Export failed.',
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
    exportCsv: 'ส่งออก CSV',

    searchPlaceholder: 'ค้นหาด้วยรหัสพาเลท หรือหมายเหตุ...',
    allUsers: 'ผู้ใช้งานทั้งหมด',
    allLocations: 'สถานที่ทั้งหมด',
    allActions: 'ทุกประเภทรายการ',
    startDate: 'วันที่เริ่ม',
    endDate: 'ถึงวันที่',

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
    exportDone: (count: number) => `ส่งออก ${count} รายการแล้ว`,
    exportFailed: 'ส่งออกไม่สำเร็จ',
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
