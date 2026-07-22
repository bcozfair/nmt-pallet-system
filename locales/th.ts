import type { Dictionary } from './en';
import {
    dashboardTh,
    inventoryTh,
    transactionsTh,
    usersTh,
    locationsTh,
    settingsTh,
    modalsTh,
} from './admin';

// Typed as Dictionary, so this file cannot compile while a key is missing or a
// function's parameters drift from the English original. That is the whole
// safety net -- there is no runtime fallback to English on purpose, because a
// silent fallback is how half-translated screens ship unnoticed.
//
// Wording conventions:
//  - Warehouse jargon stays in the form staff actually say it. "เบิกออก" and
//    "รับคืน" are the words used on the floor; a literal "ตรวจสอบออก" would be
//    correct Thai and still mean nothing to the person holding the scanner.
//  - Buttons are imperative and short. Thai runs longer than English and these
//    render inside fixed-height cards on a phone.
export const th: Dictionary = {
    app: {
        loadingSystem: 'กำลังโหลดระบบ...',
        loadingProfile: 'กำลังโหลดข้อมูลผู้ใช้...',
    },

    common: {
        save: 'บันทึก',
        saving: 'กำลังบันทึก...',
        cancel: 'ยกเลิก',
        delete: 'ลบ',
        edit: 'แก้ไข',
        close: 'ปิด',
        confirm: 'ยืนยัน',
        add: 'เพิ่ม',
        search: 'ค้นหา',
        export: 'ส่งออก',
        print: 'พิมพ์',
        download: 'ดาวน์โหลด',
        refresh: 'รีเฟรช',
        retry: 'ลองใหม่',
        back: 'ย้อนกลับ',
        view: 'ดู',
        apply: 'ใช้งาน',
        clearFilters: 'ล้างตัวกรอง',

        loading: 'กำลังโหลด...',
        noData: 'ไม่พบข้อมูล',
        error: 'ข้อผิดพลาด:',
        required: 'จำเป็นต้องกรอก',
        popupBlocked: 'เบราว์เซอร์บล็อกป๊อปอัป กรุณาอนุญาตป๊อปอัปสำหรับเว็บไซต์นี้เพื่อสั่งพิมพ์',

        actions: 'จัดการ',
        all: 'ทั้งหมด',
        status: 'สถานะ',
        location: 'สถานที่',
        department: 'แผนก',
        date: 'วันที่',
        time: 'เวลา',
        user: 'ผู้ใช้งาน',
        remark: 'หมายเหตุ',
        palletId: 'รหัสพาเลท',
        total: 'รวม',
        active: 'เปิดใช้งาน',
        inactive: 'ปิดใช้งาน',
    },

    csv: {
        preparingInventory: 'กำลังเตรียมรายงานคลังพาเลท...',
        inventoryDone: (count: number) => `ส่งออกข้อมูลพาเลท ${count} รายการแล้ว`,
        preparingHistory: 'กำลังเตรียมรายงานประวัติทั้งหมด...',
        historyDone: (count: number) => `ส่งออกประวัติ ${count} รายการแล้ว`,
        exportFailed: (reason: string) => `ส่งออกไม่สำเร็จ: ${reason}`,
        warehouse: 'คลังสินค้า',
        header: {
            palletId: 'รหัสพาเลท',
            status: 'สถานะ',
            currentLocation: 'สถานที่ปัจจุบัน',
            responsiblePerson: 'ผู้รับผิดชอบ',
            lastAction: 'รายการล่าสุด',
            lastActivityDate: 'วันที่ทำรายการล่าสุด',
            daysOverdue: 'จำนวนวันที่เกินกำหนด',
            dateAdded: 'วันที่เพิ่มเข้าระบบ',
            evidenceFile: 'ไฟล์หลักฐาน',
            date: 'วันที่',
            time: 'เวลา',
            actionType: 'ประเภทรายการ',
            performedBy: 'ผู้ทำรายการ',
            locationDest: 'สถานที่/ปลายทาง',
        },
    },

    errors: {
        unknown: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
        palletNotFound: (palletId: string) => `ไม่พบพาเลท ${palletId}`,
        palletExists: (palletId: string) => `รหัสพาเลท ${palletId} มีอยู่ในระบบแล้ว`,
        palletAlreadyScrapped: (palletId: string) => `พาเลท ${palletId} ถูกตัดออกจากระบบไปแล้ว`,
        palletNotDamaged: (palletId: string, status: string) =>
            `ต้องแจ้งชำรุดพาเลท ${palletId} ก่อนจึงจะตัดออกจากระบบได้ (สถานะปัจจุบันคือ ${status})`,
        palletMissingForCheckout: (palletId: string) =>
            `ไม่พบพาเลท ${palletId} กรุณาเพิ่มในคลังพาเลทก่อนเบิกออก`,
        scrapRequiresUser: 'ต้องเข้าสู่ระบบก่อนจึงจะตัดพาเลทออกจากระบบได้ เพื่อบันทึกว่าใครเป็นผู้ทำรายการ',
        destinationRequired: 'ต้องเลือกแผนกปลายทางก่อนเบิกพาเลทออก',
        imageUploadFailed: (reason: string) => `อัปโหลดรูปไม่สำเร็จ: ${reason}`,
        deleteDenied: 'ลบไม่สำเร็จ: ไม่พบรายการนี้แล้ว หรือคุณไม่มีสิทธิ์ลบ',
        updateDenied: 'บันทึกไม่สำเร็จ: ไม่พบผู้ใช้งานนี้แล้ว หรือคุณไม่มีสิทธิ์แก้ไข',
        // ต้องบอกให้ชัดว่าบัญชีถูกสร้างแล้ว ถ้าผู้ดูแลเข้าใจว่าล้มเหลวทั้งหมด
        // แล้วกดสร้างซ้ำ จะไปเจอข้อความว่ารหัสพนักงานนี้ถูกใช้แล้ว
        adminPromotionFailed: (reason: string) =>
            `สร้างบัญชีสำเร็จแล้ว แต่ยังเป็นสิทธิ์พนักงานอยู่ เพราะให้สิทธิ์ผู้ดูแลระบบไม่สำเร็จ (${reason}) กรุณาเปลี่ยนสิทธิ์จากหน้ารายชื่อผู้ใช้งาน`,
    },

    report: {
        notConfigured: 'ยังไม่ได้ตั้งค่า Supabase URL',
        notSignedIn: 'ยังไม่ได้เข้าสู่ระบบ',
        sendFailed: (reason: string) => `ส่งรายงานไม่สำเร็จ: ${reason}`,
        sentOverdue: 'ส่งรายงานพาเลทเกินกำหนดแล้ว',
        sentSummary: 'ส่งรายงานสรุปแล้ว',
    },

    nav: {
        menu: 'เมนู',
        system: 'ระบบ',
        dashboard: 'ภาพรวม',
        inventory: 'คลังพาเลท',
        transactions: 'ประวัติรายการ',
        users: 'ผู้ใช้งาน',
        locations: 'สถานที่',
        settings: 'ตั้งค่า',
        signOut: 'ออกจากระบบ',
    },

    role: {
        admin: 'ผู้ดูแลระบบ',
        staff: 'พนักงาน',
    },

    pagination: {
        firstPage: 'หน้าแรก',
        prevPage: 'หน้าก่อนหน้า',
        nextPage: 'หน้าถัดไป',
        lastPage: 'หน้าสุดท้าย',
        page: 'หน้า',
        ofTotal: (total: number) => `จาก ${total}`,
        showing: (from: number, to: number, total: number) =>
            `แสดง ${from}-${to} จากทั้งหมด ${total} รายการ`,
    },

    status: {
        available: 'พร้อมใช้งาน',
        in_use: 'ถูกเบิกออก',
        damaged: 'ชำรุด',
        scrapped: 'ตัดออกจากระบบ',
        unknown: 'ไม่ทราบสถานะ',
    },

    action: {
        check_out: 'เบิกออก',
        check_in: 'รับคืน',
        report_damage: 'แจ้งชำรุด',
        repair: 'ซ่อมแล้ว',
        scrap: 'ตัดออกจากระบบ',
    },

    session: {
        expired: 'เซสชันหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง',
        idle: 'ออกจากระบบอัตโนมัติเนื่องจากไม่มีการใช้งาน',
    },

    login: {
        title: 'ระบบจัดการพาเลท NMT',
        subtitle: 'เข้าสู่ระบบสำหรับพนักงาน',
        recoveryTitle: 'กู้คืนรหัสผ่าน',
        recoverySubtitle: 'กรอกรหัสพนักงานหรืออีเมลของคุณ',
        identifierLabel: 'อีเมล หรือ รหัสพนักงาน',
        identifierPlaceholder: 'admin@nmt.com หรือ EMP001',
        passwordLabel: 'รหัสผ่าน',
        rememberMe: 'จดจำฉันไว้',
        rememberHint:
            'ระบบจะจดจำการเข้าสู่ระบบบนเครื่องนี้ไว้ไม่เกิน 12 ชั่วโมง หากใช้เครื่องร่วมกับผู้อื่นไม่ควรติ๊กช่องนี้ เพราะเซสชันจะจบทันทีที่ปิดแท็บ',
        forgotPassword: 'ลืมรหัสผ่าน?',
        resetHint:
            'ลิงก์รีเซ็ตรหัสผ่านจะถูกส่งไปยังอีเมลของผู้ดูแลระบบที่ลงทะเบียนไว้ พนักงานทั่วไปกรุณาแจ้งผู้ดูแลระบบเพื่อรีเซ็ตรหัสผ่านให้',
        // ต้องคงความกำกวมไว้เหมือนต้นฉบับ: ห้ามบอกว่าบัญชีมีอยู่จริงหรือไม่
        // เพราะนั่นคือข้อมูลที่ใช้ไล่เดารหัสพนักงานได้
        resetSent:
            'หากรหัสนี้ตรงกับบัญชีในระบบ ลิงก์รีเซ็ตรหัสผ่านจะถูกส่งไปยังอีเมลของผู้ดูแลระบบที่ลงทะเบียนไว้ หากไม่ได้รับกรุณาติดต่อผู้ดูแลระบบ',
        signIn: 'เข้าสู่ระบบ',
        resetPassword: 'รีเซ็ตรหัสผ่าน',
        processing: 'กำลังดำเนินการ...',
        authorizedOnly: 'สำหรับผู้มีสิทธิ์เข้าใช้งานเท่านั้น',
        backToSignIn: 'กลับไปหน้าเข้าสู่ระบบ',
        invalidCredentials: 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง',
        tooManyAttempts: 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่',
        genericFailure: 'ดำเนินการไม่สำเร็จ กรุณาตรวจสอบข้อมูลเข้าสู่ระบบ',
    },

    resetPassword: {
        title: 'ตั้งรหัสผ่านใหม่',
        subtitle: 'กรุณาตั้งรหัสผ่านใหม่ที่ปลอดภัยสำหรับบัญชีของคุณ',
        newPassword: 'รหัสผ่านใหม่',
        confirmPassword: 'ยืนยันรหัสผ่าน',
        passwordsMatch: 'รหัสผ่านตรงกัน',
        passwordsDoNotMatch: 'รหัสผ่านไม่ตรงกัน',
        tooShort: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
        updateFailed: 'เปลี่ยนรหัสผ่านไม่สำเร็จ',
        updating: 'กำลังบันทึก...',
        submit: 'รีเซ็ตรหัสผ่าน',
        successTitle: 'เปลี่ยนรหัสผ่านสำเร็จ',
        successBody: 'บันทึกรหัสผ่านใหม่เรียบร้อยแล้ว ระบบจะพากลับไปหน้าเข้าสู่ระบบในอีกสักครู่',
    },

    mobileHome: {
        checkOut: 'เบิกออก',
        checkOutSub: 'ส่งไปยังแผนก',
        checkIn: 'รับคืน',
        checkInSub: 'คืนเข้าคลัง',
        myHistory: 'ประวัติของฉัน',
        myHistorySub: 'ดูรายการล่าสุด',
        reportDamage: 'แจ้งชำรุด',
        reportDamageSub: 'สแกนและแนบรูปหลักฐาน',
    },

    scanner: {
        scanning: 'กำลังสแกน...',
        alignQr: 'เล็ง QR ให้อยู่ในกรอบ',
        cameraError: 'ไม่สามารถเข้าถึงกล้องได้ หรือเปิดเครื่องสแกนไม่สำเร็จ',
        addedToList: 'เพิ่มเข้ารายการแล้ว',
        actionFailed: 'ทำรายการไม่สำเร็จ',
        continueScanning: 'สแกนต่อ',
    },

    scanError: {
        alreadyInList: 'อยู่ในรายการแล้ว',
        notFound: 'ไม่พบพาเลทนี้',
        scrapped: 'พาเลทถูกตัดออกแล้ว',
        damaged: 'พาเลทชำรุด',
        alreadyScrapped: 'ตัดออกไปแล้ว',
        alreadyDamaged: 'แจ้งชำรุดไปแล้ว',
        generic: 'สแกนไม่สำเร็จ',
    },

    batch: {
        checkOutList: 'รายการเบิกออก',
        checkInList: 'รายการรับคืน',
        toDept: (name: string) => `ไปยัง: ${name}`,
        returningToWarehouse: 'คืนเข้าคลัง',
        empty: 'สแกน QR เพื่อเพิ่มรายการ...',
        saving: 'กำลังบันทึก...',
        confirm: 'ยืนยันและบันทึก',
        checkedOut: (count: number) => `เบิกออกสำเร็จ ${count} พาเลท`,
        returned: (count: number) => `รับคืนสำเร็จ ${count} พาเลท`,
        failed: 'บันทึกรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
    },

    location: {
        selectDestination: 'เลือกปลายทาง',
        whereGoing: 'จะส่งพาเลทไปที่แผนกใด?',
    },

    damage: {
        titleFor: (palletId: string) => `แจ้งชำรุด: ${palletId}`,
        uploadEvidence: 'อัปโหลดรูปหลักฐาน',
        openCamera: 'เปิดกล้อง',
        removePhoto: 'ลบรูป',
        compressing: 'กำลังบีบอัดรูป...',
        submitting: 'กำลังส่ง...',
        submit: 'ส่งรายงาน',
        reported: (palletId: string) => `แจ้งชำรุดพาเลท ${palletId} แล้ว`,
        submitFailed: 'ส่งรายงานชำรุดไม่สำเร็จ',
        manualTitle: 'แจ้งชำรุด',
        manualSubtitle: 'สแกน QR เพื่อระบุพาเลท',
        manualHint: 'หาก QR ชำรุดหรือสแกนไม่ติด สามารถกรอกรหัสพาเลทเองได้ที่ปุ่มด้านล่าง',
        enterIdManually: 'กรอกรหัสพาเลทเอง',
        promptEnterId: 'กรอกรหัสพาเลท (เช่น P001):',
    },

    history: {
        searchPlaceholder: 'ค้นหารหัสพาเลท, สถานที่...',
        recent: 'ล่าสุด',
        recentOnly: 'เฉพาะล่าสุด',
        recentLast50: 'ล่าสุด (50 รายการ)',
        filterAll: 'ทั้งหมด',
        filterOut: 'เบิกออก',
        filterIn: 'รับคืน',
        filterDamage: 'ชำรุด',
        loading: 'กำลังโหลดประวัติ...',
        empty: 'ไม่พบรายการ',
        clearFilters: 'ล้างตัวกรอง',
        to: 'ไปยัง:',
        showing: (count: number) => `แสดง ${count} รายการ`,
    },

    dashboard: dashboardTh,
    inventory: inventoryTh,
    transactions: transactionsTh,
    users: usersTh,
    locations: locationsTh,
    settings: settingsTh,
    modals: modalsTh,
};
