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

    // --- Alerts & Reports card ---
    // One card, because the three things in it answer one continuous question:
    // what counts as overdue, on which days it gets reported, and at what time.
    // They used to be two cards in two columns of different widths, which is how
    // the threshold ended up as a 128px input alone in a 480px card.
    //
    // The subtitle carries what used to be a two-line hint under the threshold
    // input. Folded in here it costs nothing, because this line already existed.
    notificationsTitle: 'Alerts & Automated Reports',
    notificationsSubtitle: 'Pallets checked out longer than this threshold count as overdue',
    overdueThreshold: 'Overdue Threshold',
    days: 'Days',

    sendReportsOn: 'Automated Report Days',
    // Display only. The argument is the value stored in
    // system_settings.report_scheduled_days ("Mon", "Tue", ...) and the edge
    // function matches on it, so the caller must keep passing the raw value
    // around -- only what the button shows goes through here.
    weekday: (day: string) => day,
    // Kept short on purpose. These two sit in ~144px columns of a single-row
    // layout, and the longer wording wrapped to two lines in Thai while the
    // other labels in the row stayed on one. They pair with the send actions
    // in the menu -- Alert Time / Send Alert, Summary Time / Send Summary --
    // and the card heading already says these are report times.
    overdueReportTime: 'Alert Time',
    summaryReportTime: 'Summary Time',
    sendAlertNow: 'Send Alert',
    sendSummaryNow: 'Send Summary',
    sendingOverdueReport: 'Sending Morning Report...',
    sendingSummaryReport: 'Sending Evening Report...',

    // The label on the menu trigger holding the two send actions. A dropdown
    // rather than two buttons because two full buttons cost ~300px of a row that
    // has none to spare -- and one word rather than two because the trigger has
    // 96px to live in. The panel it opens still says "Send Alert" / "Send
    // Summary" in full, so the short label never has to carry the whole meaning.
    testSendTitle: 'Test',

    // The two buttons call an edge function that reads system_settings from the
    // database. They do not see the state of this screen, so a token typed into
    // the field above and not yet saved has no effect on what they send. The
    // hint is the only place that says so -- without it the screen invites
    // exactly the wrong conclusion from a test that "worked".
    // --- LINE Messaging API card ---
    lineTitle: 'LINE Messaging API',
    lineSubtitle: 'Where the system delivers its reports',
    // The chip on this card used to read "Active" no matter what was stored --
    // it was a literal, not a reading of anything. Reading the two secrets below
    // was no better: RLS hides them from the browser, so the chip then said "Not
    // configured" forever. It reports get_line_config_status() instead, which is
    // why there is a third state -- an RPC that fails must not be rendered as an
    // answer.
    lineConfigured: 'Configured',
    lineNotConfigured: 'Not configured',
    lineStatusUnknown: 'Status unavailable',
    channelToken: 'Channel Access Token',
    channelTokenHint: '(Long-lived)',
    channelTokenPlaceholder: '•••••••••••••••• (Hidden) - Type to Change',
    targetId: 'Target ID',
    targetIdHint: '(User ID or Group ID)',
    targetIdPlaceholder: '•••••••• (Hidden) - Type to Change',

    // --- Danger zone ---
    // No heading of its own. What marks this section as different from the two
    // cards above it is the card's red tone and the extra space before it, set
    // in SettingsView. The warning below is the only text that says who the
    // button affects, so it stays in full.
    adminEmailBase: 'Admin Email Base',
    adminEmailBaseHint: '(for Employee ID Login)',
    updateEmail: 'Update Email',
    warningLabel: 'WARNING:',
    adminEmailWarning: 'This email is used for admin password resets and user registration. Changing this will require all users to log in with the new email domain.',
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

    notificationsTitle: 'การแจ้งเตือนและรายงานอัตโนมัติ',
    notificationsSubtitle: 'พาเลทที่ถูกเบิกออกนานเกินเกณฑ์นี้จะถูกนับว่าเกินกำหนด',
    overdueThreshold: 'เกณฑ์เกินกำหนด',
    days: 'วัน',

    sendReportsOn: 'วันส่งรายงานอัตโนมัติ',
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
    overdueReportTime: 'เวลาส่งแจ้งเตือน',
    summaryReportTime: 'เวลาส่งสรุปประจำวัน',
    sendAlertNow: 'ส่งแจ้งเตือน',
    sendSummaryNow: 'ส่งสรุป',
    sendingOverdueReport: 'กำลังส่งรายงานรอบเช้า...',
    sendingSummaryReport: 'กำลังส่งรายงานรอบเย็น...',

    testSendTitle: 'ทดสอบ',

    lineTitle: 'LINE Messaging API',
    lineSubtitle: 'ปลายทางที่ระบบจะส่งรายงานไปให้',
    lineConfigured: 'ตั้งค่าแล้ว',
    lineNotConfigured: 'ยังไม่ได้ตั้งค่า',
    lineStatusUnknown: 'ตรวจสอบสถานะไม่ได้',
    channelToken: 'Channel Access Token',
    channelTokenHint: '(Long-lived)',
    channelTokenPlaceholder: '•••••••••••••••• (ซ่อนไว้) - พิมพ์เพื่อเปลี่ยน',
    targetId: 'Target ID',
    targetIdHint: '(User ID หรือ Group ID)',
    targetIdPlaceholder: '•••••••• (ซ่อนไว้) - พิมพ์เพื่อเปลี่ยน',

    adminEmailBase: 'อีเมลหลักของผู้ดูแลระบบ',
    adminEmailBaseHint: '(สำหรับเข้าสู่ระบบด้วยรหัสพนักงาน)',
    updateEmail: 'อัปเดตอีเมล',
    warningLabel: 'คำเตือน:',
    adminEmailWarning: 'อีเมลนี้ใช้สำหรับรีเซ็ตรหัสผ่านของผู้ดูแลระบบและลงทะเบียนผู้ใช้งาน การเปลี่ยนค่านี้จะทำให้ผู้ใช้ทุกคนต้องเข้าสู่ระบบด้วยโดเมนอีเมลใหม่',
    confirmEmailTitle: 'ยืนยันการเปลี่ยนอีเมลหลักของผู้ดูแลระบบ?',
    confirmEmailMessage:
        'คำเตือน: ระบบจะเปลี่ยนอีเมลสำหรับเข้าสู่ระบบของผู้ใช้ทุกคนพร้อมกัน ผู้ใช้ทั้งหมดจะต้องเข้าสู่ระบบด้วยโดเมนใหม่ และการเปลี่ยนแปลงนี้ย้อนกลับทีละคนไม่ได้ ยืนยันที่จะดำเนินการต่อหรือไม่?',
    confirmEmailAction: 'อัปเดตและย้ายบัญชีผู้ใช้',
    emailUpdated: 'อัปเดตอีเมลหลักและย้ายบัญชีผู้ใช้ทั้งหมดเรียบร้อยแล้ว',
    migrationFailed: (reason: string) => `ย้ายบัญชีผู้ใช้ไม่สำเร็จ: ${reason}`,
};
