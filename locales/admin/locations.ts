// Strings for the locations area of the admin dashboard.
//
// Both languages live in this one file, next to each other, so a reviewer can
// check a translation against its original without opening a second file.
//
// The English object defines the shape; the Thai one is typed against it, so a
// key translated on one side and not the other fails `npm run typecheck`.
//
// Shared wording (Save, Cancel, Search, Status, Location, ...) belongs in
// `common` in locales/en.ts -- do not restate it here.

export const locationsEn = {
    // Header
    title: 'Location Management',
    subtitle: 'Manage warehouse locations and tracking zones.',

    // Filter bar. The aria labels are translated too -- a screen reader
    // announcing English into a Thai form is exactly the kind of
    // half-translation the typed dictionary exists to prevent.
    searchPlaceholder: 'Search Location Name...',
    searchAria: 'Search locations',
    clearSearch: 'Clear search',
    allStatus: 'All Status',
    filterStatusAria: 'Filter by status',
    allConditions: 'All Conditions',
    filterConditionAria: 'Filter by condition',
    withPallets: 'With Pallets',
    emptyLocations: 'Empty Locations',
    hasOverdue: '⚠ Has Overdue',
    hasDamaged: '⚠ Has Damaged',
    // Sits under the filter card, and only while something is actually filtered.
    resultCount: (count: number) => `${count} results`,

    // Table headers. Total / Status / Actions come from `common`, and the
    // damaged column reuses `status.damaged`.
    // `rowNumber` replaces a literal "#", which a screen reader reads out as
    // "number sign" -- the column is the row's position in the list.
    rowNumber: 'No.',
    locationName: 'Location Name',
    overdue: 'Overdue',
    lastUpdated: 'Last Updated',
    noResults: 'No locations found matching your criteria.',
    loading: 'Loading locations...',

    // Row action tooltips
    saveChanges: 'Save Changes',
    enterNameFirst: 'Enter a location name first',
    cancelEdit: 'Cancel Edit',
    activate: 'Activate',
    deactivate: 'Deactivate',
    editName: 'Edit Name',
    deleteLocation: 'Delete Location',

    // Add / edit dialog
    addLocation: 'Add Location',
    editLocation: 'Edit Location',
    namePlaceholder: 'e.g., Warehouse A',
    nameHint: 'Names must be unique and descriptive.',
    saveLocation: 'Save Location',

    // Delete confirmation
    confirmDeleteTitle: 'Delete Location?',
    confirmDeleteMessage: 'Are you sure you want to delete this location? This action cannot be undone.',

    // Toasts
    refreshFailed: 'Failed to refresh data',
    nameRequired: 'Location name cannot be empty.',
    added: (name: string) => `Location "${name}" added`,
    updated: 'Location updated',
    activated: 'Location activated',
    deactivated: 'Location deactivated',
    deleted: 'Location deleted',
    statusUpdateFailed: 'Failed to update status',
    // The unique index matches lower(trim(name)), so a collision has to spell
    // out the matching rule -- to someone typing "line a" next to an existing
    // "Line A" a bare "duplicate" reads like a bug. The two example names stay
    // in English in both languages: they are illustrating capitalisation, which
    // Thai script does not have.
    duplicateName: (name: string) =>
        `A location named "${name}" already exists. Names are compared ignoring capitalisation and surrounding spaces, so "Line A" and "line a" are the same location.`,
    saveFailed: (reason: string) => `Failed to save location: ${reason}`,
    deleteInUse: 'Cannot delete: Location is in use. Deactivate it instead.',
    deleteFailed: (reason: string) => `Failed to delete: ${reason}`,
    // Fallback when the database rejects a write without a readable message.
    unknownError: 'Unknown error',
};

export type LocationsDict = typeof locationsEn;

export const locationsTh: LocationsDict = {
    title: 'จัดการสถานที่',
    subtitle: 'จัดการสถานที่ในคลังและพื้นที่ติดตามพาเลท',

    searchPlaceholder: 'ค้นหาชื่อสถานที่...',
    searchAria: 'ค้นหาสถานที่',
    clearSearch: 'ล้างคำค้นหา',
    allStatus: 'ทุกสถานะ',
    filterStatusAria: 'กรองตามสถานะ',
    allConditions: 'ทุกเงื่อนไข',
    filterConditionAria: 'กรองตามเงื่อนไข',
    withPallets: 'มีพาเลท',
    emptyLocations: 'ไม่มีพาเลท',
    hasOverdue: '⚠ มีพาเลทเกินกำหนด',
    hasDamaged: '⚠ มีพาเลทชำรุด',
    resultCount: (count: number) => `พบ ${count} รายการ`,

    rowNumber: 'ลำดับ',
    locationName: 'ชื่อสถานที่',
    overdue: 'เกินกำหนด',
    lastUpdated: 'อัปเดตล่าสุด',
    noResults: 'ไม่พบสถานที่ที่ตรงกับเงื่อนไข',
    loading: 'กำลังโหลดข้อมูลสถานที่...',

    saveChanges: 'บันทึกการแก้ไข',
    enterNameFirst: 'กรุณากรอกชื่อสถานที่ก่อน',
    cancelEdit: 'ยกเลิกการแก้ไข',
    activate: 'เปิดใช้งาน',
    deactivate: 'ปิดใช้งาน',
    editName: 'แก้ไขชื่อ',
    deleteLocation: 'ลบสถานที่',

    addLocation: 'เพิ่มสถานที่',
    editLocation: 'แก้ไขสถานที่',
    namePlaceholder: 'เช่น คลังสินค้า A',
    nameHint: 'ชื่อต้องไม่ซ้ำกับสถานที่อื่น และสื่อความหมายชัดเจน',
    saveLocation: 'บันทึกสถานที่',

    confirmDeleteTitle: 'ลบสถานที่นี้?',
    confirmDeleteMessage: 'ยืนยันการลบสถานที่นี้หรือไม่ การลบแล้วไม่สามารถย้อนกลับได้',

    refreshFailed: 'โหลดข้อมูลใหม่ไม่สำเร็จ',
    nameRequired: 'กรุณากรอกชื่อสถานที่',
    added: (name: string) => `เพิ่มสถานที่ "${name}" แล้ว`,
    updated: 'แก้ไขสถานที่แล้ว',
    activated: 'เปิดใช้งานสถานที่แล้ว',
    deactivated: 'ปิดใช้งานสถานที่แล้ว',
    deleted: 'ลบสถานที่แล้ว',
    statusUpdateFailed: 'อัปเดตสถานะไม่สำเร็จ',
    duplicateName: (name: string) =>
        `มีสถานที่ชื่อ "${name}" อยู่แล้ว ระบบเทียบชื่อโดยไม่สนตัวพิมพ์ใหญ่-เล็กและช่องว่างหน้าหลัง "Line A" กับ "line a" จึงถือเป็นสถานที่เดียวกัน`,
    saveFailed: (reason: string) => `บันทึกสถานที่ไม่สำเร็จ: ${reason}`,
    deleteInUse: 'ลบไม่ได้ เนื่องจากสถานที่นี้ถูกใช้งานอยู่ กรุณาปิดใช้งานแทน',
    deleteFailed: (reason: string) => `ลบไม่สำเร็จ: ${reason}`,
    unknownError: 'ข้อผิดพลาดที่ไม่ทราบสาเหตุ',
};
