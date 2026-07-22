// Strings for the shared admin modals: pallet detail, QR printing and the
// evidence image viewer. They get their own module because they are opened from
// several feature areas rather than belonging to any one of them.
//
// Both languages live in this one file, next to each other, so a reviewer can
// check a translation against its original without opening a second file.
//
// The English object defines the shape; the Thai one is typed against it, so a
// key translated on one side and not the other fails `npm run typecheck`.
//
// Shared wording (Save, Cancel, Search, Status, Location, ...) belongs in
// `common` in locales/en.ts -- do not restate it here.

export const modalsEn = {
    // --- Pallet detail ---
    // The timeline's event labels are NOT here: a row is labelled from
    // `action` in locales/en.ts, which is `satisfies Record<ActionType, string>`
    // and therefore cannot silently miss one.
    addedOn: (date: string) => `Added on ${date}`,
    currentLocation: 'Current Location',
    lastInteraction: 'Last Interaction',
    never: 'Never',
    activityHistory: 'Activity History',
    loadingHistory: 'Loading history...',
    noHistory: 'No history found.',
    // Rendered either side of a bold <span>, so these stay separate fragments
    // rather than one sentence. Both languages put the name after the word.
    by: 'by',
    toDest: 'To',
    unknownUser: (userId: string) => `User ${userId}`,
    evidenceAlt: 'Evidence',
    evidenceDeleted: 'Original evidence image was deleted upon repair.',

    // --- QR print sheet ---
    qrSheetTitle: 'QR Code Master Sheet',
    itemsSelected: (count: number) => `${count} items selected.`,
    printPdf: 'Print / PDF',
    downloadPng: 'Download PNG',
    // Names no menu item on purpose. The original quoted Chrome's English
    // "Save Image As", which is wrong the moment the browser is not in English
    // -- and a Thai user reading Thai UI is the likeliest case here.
    downloadFailed: 'Could not auto-download. Please right-click the image and save it manually.',

    // Shown in the separate print window, which loads none of the app's own
    // strings or styles.
    printWindowTitle: 'NMT Pallet QR Codes',
    saveAsPdf: 'Save as PDF',
    // Takes the bolded fragment already wrapped in <strong>, so the emphasis
    // survives without the dictionary carrying markup of its own.
    printHint: (saveAsPdf: string) => `Use your browser's print dialog to ${saveAsPdf} or Print.`,
    printNow: 'Print Now',
    // The ownership mark printed under each QR. The label itself carries only
    // the pallet ID otherwise -- keep anything added here short, it shares a
    // 150px card with the code.
    propertyMark: 'NMT PROPERTY',
    propertyMarkShort: 'NMT Prop',

    // --- Image viewer ---
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    resetZoom: 'Reset Zoom',
    downloadImage: 'Download Image',
    previewAlt: 'Preview',
};

export type ModalsDict = typeof modalsEn;

export const modalsTh: ModalsDict = {
    // --- Pallet detail ---
    addedOn: (date: string) => `เพิ่มเข้าระบบเมื่อ ${date}`,
    currentLocation: 'สถานที่ปัจจุบัน',
    lastInteraction: 'ทำรายการล่าสุด',
    never: 'ไม่เคยใช้งาน',
    activityHistory: 'ประวัติการใช้งาน',
    loadingHistory: 'กำลังโหลดประวัติ...',
    noHistory: 'ไม่พบประวัติการใช้งาน',
    by: 'โดย',
    toDest: 'ไปยัง',
    unknownUser: (userId: string) => `ผู้ใช้ ${userId}`,
    evidenceAlt: 'หลักฐาน',
    evidenceDeleted: 'รูปหลักฐานเดิมถูกลบเมื่อบันทึกการซ่อม',

    // --- QR print sheet ---
    qrSheetTitle: 'แผ่นรวม QR พาเลท',
    itemsSelected: (count: number) => `เลือกไว้ ${count} รายการ`,
    printPdf: 'พิมพ์ / PDF',
    downloadPng: 'ดาวน์โหลด PNG',
    downloadFailed: 'ดาวน์โหลดอัตโนมัติไม่สำเร็จ กรุณาคลิกขวาที่รูปแล้วสั่งบันทึกรูปเอง',

    printWindowTitle: 'QR พาเลท NMT',
    saveAsPdf: 'บันทึกเป็น PDF',
    printHint: (saveAsPdf: string) => `ใช้หน้าต่างพิมพ์ของเบราว์เซอร์เพื่อ${saveAsPdf} หรือสั่งพิมพ์`,
    printNow: 'พิมพ์เลย',
    propertyMark: 'ทรัพย์สินของ NMT',
    propertyMarkShort: 'ทรัพย์สิน NMT',

    // --- Image viewer ---
    zoomIn: 'ขยาย',
    zoomOut: 'ย่อ',
    resetZoom: 'รีเซ็ตขนาด',
    downloadImage: 'ดาวน์โหลดรูป',
    previewAlt: 'ตัวอย่างรูป',
};
