// Strings for the inventory area of the admin dashboard.
//
// Both languages live in this one file, next to each other, so a reviewer can
// check a translation against its original without opening a second file.
//
// The English object defines the shape; the Thai one is typed against it, so a
// key translated on one side and not the other fails `npm run typecheck`.
//
// Shared wording (Save, Cancel, Search, Status, Location, ...) belongs in
// `common` in locales/en.ts -- do not restate it here.

export const inventoryEn = {
    // --- Header ---
    title: 'Inventory Management',
    subtitle: 'Manage assets, track location, and monitor status.',
    exportList: 'Export List',
    printAllQr: 'Print All QRs',
    addPallet: 'Add Pallet',
    selectedCount: (count: number) => `${count} Selected`,
    showIds: 'Show IDs',
    hideIds: 'Hide IDs',
    transaction: 'Transaction',
    printQr: 'Print QR',

    // --- Filters ---
    // Two variants of the same idea: the placeholder trails off, the aria-label
    // is read aloud and should not.
    searchPallet: 'Search Pallet ID',
    searchPlaceholder: 'Search Pallet ID...',
    filterByLocation: 'Filter by Location',
    allLocations: 'All Locations',
    filterByStatus: 'Filter by Status',
    allActive: 'All Active',
    startDate: 'Start Date',
    endDate: 'End Date',
    overdueOnly: 'Overdue Only',

    // --- Table ---
    selectAllPallets: 'Select all pallets',
    lastUpdated: 'Last Updated',
    lastCheckout: 'Last Checkout',
    overdue: 'Overdue',
    daysCount: (days: number) => `${days} Days`,
    markRepairedTitle: 'Mark as Repaired',
    markScrappedTitle: 'Mark as Scrapped (retires the pallet, keeps its history)',
    printQrTitle: 'Print QR Code',
    editPalletTitle: 'Edit Pallet',
    deletePalletTitle: 'Delete Pallet',
    noResults: 'No pallets found matching your filters.',

    // --- Add pallet modal ---
    addPalletTitle: 'Add New Pallet',
    palletIdHint: 'Pallet ID (e.g., P105)',
    initialLocation: 'Initial Location',
    creating: 'Creating...',
    createPallet: 'Create Pallet',
    palletCreated: (id: string) => `Pallet ${id} created successfully.`,
    createFailed: 'Error creating pallet. ID might already exist.',

    // --- Confirm modal ---
    working: 'Working...',
    actionFailed: 'Action failed. Please try again.',

    // --- Edit pallet modal ---
    editTitle: 'Edit Pallet Details',
    idChangeWarning: 'Warning: Changing ID will update history references.',
    remarkPlaceholder: 'Add notes about this pallet...',
    saveChanges: 'Save Changes',

    // --- Bulk transaction modal ---
    bulkTitle: 'Create Transaction',
    // Split around the count rather than written as one function: the number is
    // rendered inside its own bold <span>, so the sentence has to be handed to
    // JSX in two pieces. Thai puts the count late, hence the trailing classifier
    // in the suffix.
    processingPrefix: 'Processing ',
    processingSuffix: ' selected pallets.',
    actionLabel: 'Action',
    destination: 'Destination',
    selectLocation: 'Select Location',
    noteOptional: 'Optional note...',
    processing: 'Processing...',

    // --- Confirmations and toasts (hooks/inventory/useInventoryActions.ts) ---
    // Delete and Scrap read almost the same in English but mean opposite things
    // for the audit trail, so both messages spell out what happens to history.
    deleteTitle: 'Delete Pallet?',
    deleteMessage: (id: string) =>
        `Permanently delete ${id}? Its ENTIRE transaction history will be deleted with it and cannot be recovered. To retire a pallet while keeping its history, mark it Scrapped instead.`,
    palletDeleted: (id: string) => `Pallet ${id} deleted.`,

    bulkDeleteTitle: 'Delete Selected Items?',
    bulkDeleteMessage: (count: number) =>
        `PERMANENTLY DELETE ${count} pallets? The ENTIRE transaction history of each one will be deleted with it and cannot be recovered. To retire pallets while keeping their history, mark them Scrapped instead.`,
    deleteAll: 'Delete All',
    deletedCount: (count: number) => `${count} items deleted.`,

    repairTitle: 'Repair Pallet?',
    repairMessage: (id: string) => `Mark ${id} as Repaired (Available)?`,
    repair: 'Repair',
    palletRepaired: (id: string) => `Pallet ${id} repaired.`,

    bulkRepairTitle: 'Repair Selected Items?',
    bulkRepairMessage: (count: number) => `Mark ${count} items as Repaired (Available)?`,
    markRepaired: 'Mark Repaired',
    repairedCount: (count: number) => `${count} items marked as repaired.`,

    scrapTitle: 'Scrap Pallet?',
    scrapMessage: (id: string) =>
        `Mark ${id} as Scrapped? It leaves the fleet permanently and cannot be returned to service — but its history and damage evidence are kept.`,
    scrap: 'Scrap',
    palletScrapped: (id: string) => `Pallet ${id} scrapped.`,

    bulkScrapTitle: 'Scrap Selected Items?',
    bulkScrapMessage: (count: number) =>
        `Mark ${count} items as Scrapped? They leave the fleet permanently and cannot be returned to service — but their history and damage evidence are kept.`,
    scrapAll: 'Scrap All',
    scrappedCount: (count: number) => `${count} items scrapped.`,

    bulkPartial: (done: number, failed: string) => `Processed ${done} items. Failed: ${failed}`,
    bulkDone: (count: number) => `Successfully processed ${count} items.`,
    bulkFailed: (reason: string) => `Bulk transaction failed: ${reason}`,
    unknownError: 'Unknown error',

    palletUpdated: 'Pallet updated successfully',
    idExists: 'Pallet ID already exists',
    updateFailed: 'Failed to update pallet',

    // The other column headers of this export come from `csv.header` in
    // locales/en.ts, which the transactions export shares. Only this one has no
    // counterpart there.
    exportFailed: 'Export failed. Please try again.',
};

export type InventoryDict = typeof inventoryEn;

export const inventoryTh: InventoryDict = {
    // --- Header ---
    title: 'จัดการคลังพาเลท',
    subtitle: 'จัดการพาเลท ติดตามสถานที่ และตรวจสอบสถานะ',
    exportList: 'ส่งออกรายการ',
    printAllQr: 'พิมพ์ QR ทั้งหมด',
    addPallet: 'เพิ่มพาเลท',
    selectedCount: (count: number) => `เลือกไว้ ${count} รายการ`,
    showIds: 'แสดงรหัส',
    hideIds: 'ซ่อนรหัส',
    transaction: 'ทำรายการ',
    printQr: 'พิมพ์ QR',

    // --- Filters ---
    searchPallet: 'ค้นหารหัสพาเลท',
    searchPlaceholder: 'ค้นหารหัสพาเลท...',
    filterByLocation: 'กรองตามสถานที่',
    allLocations: 'ทุกสถานที่',
    filterByStatus: 'กรองตามสถานะ',
    // ไม่ใช่ "ทั้งหมด" จริง ๆ แต่หมายถึงพาเลทที่ยังอยู่ในระบบ คือไม่รวมที่ตัดออกไปแล้ว
    allActive: 'ทั้งหมดที่ยังใช้งาน',
    startDate: 'วันที่เริ่ม',
    endDate: 'วันที่สิ้นสุด',
    overdueOnly: 'เฉพาะเกินกำหนด',

    // --- Table ---
    selectAllPallets: 'เลือกพาเลททั้งหมด',
    lastUpdated: 'อัปเดตล่าสุด',
    lastCheckout: 'เบิกออกล่าสุด',
    overdue: 'เกินกำหนด',
    daysCount: (days: number) => `${days} วัน`,
    markRepairedTitle: 'ทำเครื่องหมายว่าซ่อมแล้ว',
    markScrappedTitle: 'ตัดออกจากระบบ (เลิกใช้พาเลทนี้ถาวร แต่ยังเก็บประวัติไว้)',
    printQrTitle: 'พิมพ์ QR Code',
    editPalletTitle: 'แก้ไขข้อมูลพาเลท',
    deletePalletTitle: 'ลบพาเลท',
    noResults: 'ไม่พบพาเลทที่ตรงกับตัวกรอง',

    // --- Add pallet modal ---
    addPalletTitle: 'เพิ่มพาเลทใหม่',
    palletIdHint: 'รหัสพาเลท (เช่น P105)',
    initialLocation: 'สถานที่เริ่มต้น',
    creating: 'กำลังสร้าง...',
    createPallet: 'สร้างพาเลท',
    palletCreated: (id: string) => `สร้างพาเลท ${id} เรียบร้อยแล้ว`,
    createFailed: 'สร้างพาเลทไม่สำเร็จ รหัสนี้อาจมีอยู่ในระบบแล้ว',

    // --- Confirm modal ---
    working: 'กำลังดำเนินการ...',
    actionFailed: 'ทำรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',

    // --- Edit pallet modal ---
    editTitle: 'แก้ไขรายละเอียดพาเลท',
    idChangeWarning: 'คำเตือน: การเปลี่ยนรหัสจะอัปเดตการอ้างอิงในประวัติทั้งหมดด้วย',
    remarkPlaceholder: 'เพิ่มหมายเหตุเกี่ยวกับพาเลทนี้...',
    saveChanges: 'บันทึกการแก้ไข',

    // --- Bulk transaction modal ---
    bulkTitle: 'สร้างรายการ',
    processingPrefix: 'ทำรายการกับพาเลทที่เลือกไว้ ',
    processingSuffix: ' รายการ',
    actionLabel: 'ประเภทรายการ',
    destination: 'ปลายทาง',
    selectLocation: 'เลือกสถานที่',
    noteOptional: 'หมายเหตุเพิ่มเติม (ถ้ามี)',
    processing: 'กำลังดำเนินการ...',

    // --- Confirmations and toasts ---
    // ข้อความ "ลบ" กับ "ตัดออกจากระบบ" ต้องต่างกันให้ชัด เพราะการลบทำให้
    // ประวัติหายทั้งหมด ส่วนการตัดออกยังเก็บประวัติไว้
    deleteTitle: 'ลบพาเลทนี้?',
    deleteMessage: (id: string) =>
        `ลบ ${id} ออกถาวรหรือไม่? ประวัติการทำรายการทั้งหมดของพาเลทนี้จะถูกลบไปด้วยและกู้คืนไม่ได้ หากต้องการเลิกใช้พาเลทแต่ยังเก็บประวัติไว้ ให้เลือกตัดออกจากระบบแทน`,
    palletDeleted: (id: string) => `ลบพาเลท ${id} แล้ว`,

    bulkDeleteTitle: 'ลบพาเลทที่เลือก?',
    bulkDeleteMessage: (count: number) =>
        `ลบพาเลท ${count} รายการออกถาวรหรือไม่? ประวัติการทำรายการทั้งหมดของแต่ละพาเลทจะถูกลบไปด้วยและกู้คืนไม่ได้ หากต้องการเลิกใช้พาเลทแต่ยังเก็บประวัติไว้ ให้เลือกตัดออกจากระบบแทน`,
    deleteAll: 'ลบทั้งหมด',
    deletedCount: (count: number) => `ลบพาเลท ${count} รายการแล้ว`,

    repairTitle: 'ซ่อมพาเลทนี้แล้ว?',
    repairMessage: (id: string) => `เปลี่ยนสถานะ ${id} เป็นซ่อมแล้ว (พร้อมใช้งาน) หรือไม่?`,
    repair: 'ซ่อมแล้ว',
    palletRepaired: (id: string) => `พาเลท ${id} ซ่อมแล้ว`,

    bulkRepairTitle: 'ซ่อมพาเลทที่เลือกแล้ว?',
    bulkRepairMessage: (count: number) =>
        `เปลี่ยนสถานะพาเลท ${count} รายการเป็นซ่อมแล้ว (พร้อมใช้งาน) หรือไม่?`,
    markRepaired: 'ยืนยันซ่อมแล้ว',
    repairedCount: (count: number) => `เปลี่ยนสถานะพาเลท ${count} รายการเป็นซ่อมแล้ว`,

    scrapTitle: 'ตัดพาเลทนี้ออกจากระบบ?',
    scrapMessage: (id: string) =>
        `ตัด ${id} ออกจากระบบหรือไม่? พาเลทจะเลิกใช้งานถาวรและนำกลับมาใช้ไม่ได้ แต่ประวัติและรูปหลักฐานความเสียหายจะยังถูกเก็บไว้`,
    scrap: 'ตัดออกจากระบบ',
    palletScrapped: (id: string) => `ตัดพาเลท ${id} ออกจากระบบแล้ว`,

    bulkScrapTitle: 'ตัดพาเลทที่เลือกออกจากระบบ?',
    bulkScrapMessage: (count: number) =>
        `ตัดพาเลท ${count} รายการออกจากระบบหรือไม่? พาเลททั้งหมดจะเลิกใช้งานถาวรและนำกลับมาใช้ไม่ได้ แต่ประวัติและรูปหลักฐานความเสียหายจะยังถูกเก็บไว้`,
    scrapAll: 'ตัดออกทั้งหมด',
    scrappedCount: (count: number) => `ตัดพาเลท ${count} รายการออกจากระบบแล้ว`,

    bulkPartial: (done: number, failed: string) => `ทำรายการสำเร็จ ${done} รายการ ไม่สำเร็จ: ${failed}`,
    bulkDone: (count: number) => `ทำรายการสำเร็จ ${count} รายการ`,
    bulkFailed: (reason: string) => `ทำรายการหลายพาเลทไม่สำเร็จ: ${reason}`,
    unknownError: 'ไม่ทราบสาเหตุ',

    palletUpdated: 'บันทึกข้อมูลพาเลทแล้ว',
    idExists: 'รหัสพาเลทนี้มีอยู่ในระบบแล้ว',
    updateFailed: 'บันทึกข้อมูลพาเลทไม่สำเร็จ',

    exportFailed: 'ส่งออกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
};
