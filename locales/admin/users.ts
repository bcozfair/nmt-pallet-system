// Strings for the users area of the admin dashboard.
//
// Both languages live in this one file, next to each other, so a reviewer can
// check a translation against its original without opening a second file.
//
// The English object defines the shape; the Thai one is typed against it, so a
// key translated on one side and not the other fails `npm run typecheck`.
//
// Shared wording (Save, Cancel, Search, Status, Location, ...) belongs in
// `common` in locales/en.ts -- do not restate it here. A user's role is never
// rendered from the raw 'admin' / 'staff' enum either: it goes through the
// `role` table in locales/en.ts so the two screens that show it cannot drift.

export const usersEn = {
    // Header
    title: 'User Management',
    subtitle: 'Manage system access, roles, and user details.',
    exportList: 'Export List',
    addUser: 'Add New User',

    // Filters. The aria labels are translated too -- a screen reader announcing
    // English into a Thai form is exactly the kind of half-translation the
    // typed dictionary exists to prevent.
    searchAria: 'Search Users',
    searchPlaceholder: 'Search Name or Employee ID...',
    filterLocationAria: 'Filter by Location',
    allLocations: 'All Locations',
    filterRoleAria: 'Filter by Role',
    allRoles: 'All Roles',

    // Table and card list
    employeeId: 'Employee ID',
    fullName: 'Full Name',
    roleLabel: 'Role',
    createdAt: 'Created At',
    lastSignIn: 'Last Sign In',
    editingUser: 'Editing User',
    noneFound: 'No users found matching your filters.',

    // Row actions. One key each, reused for the icon tooltip, the confirmation
    // title and its confirm button, so the three can never disagree.
    resetPassword: 'Reset Password',
    deleteUser: 'Delete User',

    // Create user modal
    createTitle: 'Create New User',
    fullNamePlaceholder: 'John Doe',
    selectDepartment: 'Select Dept',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    passwordsMatch: 'Passwords match',
    passwordsDoNotMatch: 'Passwords do not match',
    creating: 'Creating...',
    createSubmit: 'Create User',
    createSuccess: 'User created successfully',
    // `reason` is whatever services/authService.ts raised, and that stays in
    // English on purpose -- including "Account created as staff, but granting
    // admin rights failed", which tells the admin the account does exist. Only
    // the prefix is translated; rewording the detail would lose that.
    createFailed: (reason: string) => `Failed to create user: ${reason}`,

    // Reset password modal
    resettingFor: 'Resetting password for',
    newPassword: 'New Password',
    confirmNewPassword: 'Confirm New Password',
    resetting: 'Resetting...',
    confirmReset: 'Confirm Reset',
    resetSuccess: (name: string) => `Password for ${name} has been reset`,
    resetFailed: (reason: string) => `Failed to reset password: ${reason}`,

    // List loading and row edits
    loadFailed: 'Failed to load users',
    updateSuccess: 'User updated successfully',
    updateFailed: 'Failed to update user',
    deleteMessage: (name: string, employeeId: string) =>
        `Are you sure you want to delete ${name} (${employeeId})? This action cannot be undone.`,
    deleteSuccess: 'User deleted successfully',
    deleteFailed: (reason: string) => `Failed to delete user: ${reason}`,
    unknownError: 'Unknown error',
};

export type UsersDict = typeof usersEn;

export const usersTh: UsersDict = {
    title: 'จัดการผู้ใช้งาน',
    subtitle: 'จัดการสิทธิ์เข้าใช้งาน บทบาท และข้อมูลผู้ใช้งาน',
    exportList: 'ส่งออกรายชื่อ',
    addUser: 'เพิ่มผู้ใช้งาน',

    searchAria: 'ค้นหาผู้ใช้งาน',
    searchPlaceholder: 'ค้นหาชื่อ หรือ รหัสพนักงาน...',
    filterLocationAria: 'กรองตามสถานที่',
    allLocations: 'ทุกสถานที่',
    filterRoleAria: 'กรองตามบทบาท',
    allRoles: 'ทุกบทบาท',

    employeeId: 'รหัสพนักงาน',
    fullName: 'ชื่อ-นามสกุล',
    roleLabel: 'บทบาท',
    createdAt: 'วันที่สร้าง',
    lastSignIn: 'เข้าใช้งานล่าสุด',
    editingUser: 'กำลังแก้ไขผู้ใช้งาน',
    noneFound: 'ไม่พบผู้ใช้งานที่ตรงกับตัวกรอง',

    resetPassword: 'รีเซ็ตรหัสผ่าน',
    deleteUser: 'ลบผู้ใช้งาน',

    createTitle: 'เพิ่มผู้ใช้งานใหม่',
    fullNamePlaceholder: 'สมชาย ใจดี',
    selectDepartment: 'เลือกแผนก',
    password: 'รหัสผ่าน',
    confirmPassword: 'ยืนยันรหัสผ่าน',
    passwordsMatch: 'รหัสผ่านตรงกัน',
    passwordsDoNotMatch: 'รหัสผ่านไม่ตรงกัน',
    creating: 'กำลังสร้าง...',
    createSubmit: 'สร้างผู้ใช้งาน',
    createSuccess: 'สร้างผู้ใช้งานเรียบร้อยแล้ว',
    // `reason` มาจาก services/authService.ts และยังเป็นภาษาอังกฤษตามต้นฉบับ
    // โดยเฉพาะกรณี "Account created as staff, but granting admin rights failed"
    // ที่บอกว่าบัญชีถูกสร้างแล้วจริง แปลเฉพาะข้อความนำหน้าเท่านั้น
    createFailed: (reason: string) => `สร้างผู้ใช้งานไม่สำเร็จ: ${reason}`,

    resettingFor: 'กำลังรีเซ็ตรหัสผ่านของ',
    newPassword: 'รหัสผ่านใหม่',
    confirmNewPassword: 'ยืนยันรหัสผ่านใหม่',
    resetting: 'กำลังรีเซ็ต...',
    confirmReset: 'ยืนยันการรีเซ็ต',
    resetSuccess: (name: string) => `รีเซ็ตรหัสผ่านของ ${name} เรียบร้อยแล้ว`,
    resetFailed: (reason: string) => `รีเซ็ตรหัสผ่านไม่สำเร็จ: ${reason}`,

    loadFailed: 'โหลดข้อมูลผู้ใช้งานไม่สำเร็จ',
    updateSuccess: 'บันทึกข้อมูลผู้ใช้งานเรียบร้อยแล้ว',
    updateFailed: 'บันทึกข้อมูลผู้ใช้งานไม่สำเร็จ',
    deleteMessage: (name: string, employeeId: string) =>
        `ต้องการลบ ${name} (${employeeId}) ใช่หรือไม่? การลบนี้ไม่สามารถย้อนกลับได้`,
    deleteSuccess: 'ลบผู้ใช้งานเรียบร้อยแล้ว',
    deleteFailed: (reason: string) => `ลบผู้ใช้งานไม่สำเร็จ: ${reason}`,
    unknownError: 'ไม่ทราบสาเหตุ',
};
