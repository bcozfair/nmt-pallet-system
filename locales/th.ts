import type { Dictionary } from './en';

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
        cancel: 'ยกเลิก',
        error: 'ข้อผิดพลาด:',
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
};
