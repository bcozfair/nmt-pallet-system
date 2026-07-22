// Strings for the settings area of the admin dashboard.
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
// Product names (LINE, Supabase, Channel Access Token, Target ID) are left in
// English on both sides: they are what the LINE developer console calls them,
// so translating them would only make the admin's two screens disagree.

export const settingsEn = {
    // --- Page header ---
    title: 'System Settings',
    subtitle: 'Configure system-wide settings and preferences.',
    saveChanges: 'Save Changes',
    loading: 'Loading settings...',
    loadFailed: 'Failed to load system settings',
    saved: 'Configuration saved successfully!',
    saveFailed: (reason: string) => `Failed to save: ${reason}`,

    // --- Rules & Alerts card ---
    rulesTitle: 'Rules & Alerts',
    rulesSubtitle: 'Notification and alert rules',
    overdueThreshold: 'Overdue Threshold (Days)',
    days: 'Days',
    overdueHint: 'Pallets checked out longer than this will be marked as overdue.',

    // --- Scheduling card ---
    scheduleTitle: 'Scheduling',
    scheduleSubtitle: 'Automated report delivery times',
    sendReportsOn: 'Send Reports On:',
    // Display only. The argument is the value stored in
    // system_settings.report_scheduled_days ("Mon", "Tue", ...) and the edge
    // function matches on it, so the caller must keep passing the raw value
    // around -- only what the button shows goes through here.
    weekday: (day: string) => day,
    overdueReportTime: 'Overdue Report Time:',
    summaryReportTime: 'Summary Report Time:',
    sendAlertNow: 'ALERT',
    sendSummaryNow: 'SEND',
    sendingOverdueReport: 'Sending Morning Report...',
    sendingSummaryReport: 'Sending Evening Report...',

    // --- LINE Messaging API card ---
    lineTitle: 'LINE Messaging API',
    lineSubtitle: 'Integration with LINE messaging',
    channelToken: 'Channel Access Token',
    channelTokenHint: '(Long-lived)',
    channelTokenPlaceholder: '•••••••••••••••• (Hidden) - Type to Change',
    targetId: 'Target ID',
    targetIdHint: '(User ID or Group ID)',
    targetIdPlaceholder: '•••••••• (Hidden) - Type to Change',

    // --- System Core Configuration card ---
    coreTitle: 'System Core Configuration',
    coreSubtitle: 'Critical settings affecting user access',
    adminEmailBase: 'Admin Email Base',
    adminEmailBaseHint: '(for Employee ID Login)',
    updateEmail: 'Update Email',
    warningLabel: 'WARNING:',
    adminEmailWarning: 'Changing this will require all users to log in with the new email domain.',
    // Saving this one key runs an RPC that rewrites every user's login alias in
    // a single transaction -- there is no per-user undo. The confirmation text
    // has to be alarming in both languages, not merely informative.
    confirmEmailTitle: 'Update Admin Email Base?',
    confirmEmailMessage:
        'WARNING: This will update the login email for ALL users. Users will need to log in using the new domain. Are you sure you want to proceed?',
    confirmEmailAction: 'Update & Migrate Users',
    emailUpdated: 'Admin Email Base updated and users migrated!',
    migrationFailed: (reason: string) => `Migration failed: ${reason}`,
};

export type SettingsDict = typeof settingsEn;

// Wording conventions on this screen: the reader is an administrator, so the
// Thai is a step more formal than the staff-facing screens -- "กำหนดค่า" rather
// than "ตั้งค่า" for the act of configuring, and full sentences in the hints.
export const settingsTh: SettingsDict = {
    title: 'ตั้งค่าระบบ',
    subtitle: 'กำหนดค่าและพฤติกรรมการทำงานของระบบทั้งหมด',
    saveChanges: 'บันทึกการเปลี่ยนแปลง',
    loading: 'กำลังโหลดการตั้งค่า...',
    loadFailed: 'โหลดการตั้งค่าระบบไม่สำเร็จ',
    saved: 'บันทึกการตั้งค่าเรียบร้อยแล้ว',
    saveFailed: (reason: string) => `บันทึกไม่สำเร็จ: ${reason}`,

    rulesTitle: 'กฎและการแจ้งเตือน',
    rulesSubtitle: 'กำหนดกฎการแจ้งเตือนของระบบ',
    overdueThreshold: 'เกณฑ์เกินกำหนด (วัน)',
    days: 'วัน',
    overdueHint: 'พาเลทที่ถูกเบิกออกนานเกินจำนวนวันนี้จะถูกนับว่าเกินกำหนด',

    scheduleTitle: 'ตารางส่งรายงาน',
    scheduleSubtitle: 'เวลาส่งรายงานอัตโนมัติ',
    sendReportsOn: 'ส่งรายงานในวัน:',
    // แปลเฉพาะสิ่งที่แสดงบนปุ่ม ค่าที่บันทึกลงฐานข้อมูลยังเป็น "Mon"/"Tue"
    // เหมือนเดิม เพราะ edge function ที่ส่งรายงานเทียบกับค่าภาษาอังกฤษ
    weekday: (day: string) =>
        ({
            Mon: 'จ.',
            Tue: 'อ.',
            Wed: 'พ.',
            Thu: 'พฤ.',
            Fri: 'ศ.',
            Sat: 'ส.',
            Sun: 'อา.',
        } as Record<string, string>)[day] ?? day,
    overdueReportTime: 'เวลาส่งรายงานเกินกำหนด:',
    summaryReportTime: 'เวลาส่งรายงานสรุป:',
    sendAlertNow: 'ส่งแจ้งเตือน',
    sendSummaryNow: 'ส่งสรุป',
    sendingOverdueReport: 'กำลังส่งรายงานรอบเช้า...',
    sendingSummaryReport: 'กำลังส่งรายงานรอบเย็น...',

    lineTitle: 'LINE Messaging API',
    lineSubtitle: 'การเชื่อมต่อแจ้งเตือนผ่าน LINE',
    channelToken: 'Channel Access Token',
    channelTokenHint: '(แบบอายุยาว)',
    channelTokenPlaceholder: '•••••••••••••••• (ซ่อนไว้) - พิมพ์เพื่อเปลี่ยน',
    targetId: 'Target ID',
    targetIdHint: '(User ID หรือ Group ID)',
    targetIdPlaceholder: '•••••••• (ซ่อนไว้) - พิมพ์เพื่อเปลี่ยน',

    coreTitle: 'การตั้งค่าแกนหลักของระบบ',
    coreSubtitle: 'การตั้งค่าสำคัญที่มีผลต่อการเข้าใช้งานของผู้ใช้',
    adminEmailBase: 'อีเมลหลักของผู้ดูแลระบบ',
    adminEmailBaseHint: '(สำหรับเข้าสู่ระบบด้วยรหัสพนักงาน)',
    updateEmail: 'อัปเดตอีเมล',
    warningLabel: 'คำเตือน:',
    adminEmailWarning: 'การเปลี่ยนค่านี้จะทำให้ผู้ใช้ทุกคนต้องเข้าสู่ระบบด้วยโดเมนอีเมลใหม่',
    confirmEmailTitle: 'ยืนยันการเปลี่ยนอีเมลหลักของผู้ดูแลระบบ?',
    confirmEmailMessage:
        'คำเตือน: ระบบจะเปลี่ยนอีเมลสำหรับเข้าสู่ระบบของผู้ใช้ทุกคนพร้อมกัน ผู้ใช้ทั้งหมดจะต้องเข้าสู่ระบบด้วยโดเมนใหม่ และการเปลี่ยนแปลงนี้ย้อนกลับทีละคนไม่ได้ ยืนยันที่จะดำเนินการต่อหรือไม่?',
    confirmEmailAction: 'อัปเดตและย้ายบัญชีผู้ใช้',
    emailUpdated: 'อัปเดตอีเมลหลักและย้ายบัญชีผู้ใช้ทั้งหมดเรียบร้อยแล้ว',
    migrationFailed: (reason: string) => `ย้ายบัญชีผู้ใช้ไม่สำเร็จ: ${reason}`,
};
