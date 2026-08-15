import type { Transaction } from '../types';

export interface TransactionFilterCriteria {
    searchTerm: string;
    /** 'all' หรือค่าใน ActionType */
    actionFilter: string;
    /** 'all' หรือชื่อสถานที่ตรงตัว */
    locationFilter: string;
    /** 'all' หรือ user id */
    userFilter: string;
    /** ว่างได้ทั้งคู่ รูปแบบ yyyy-mm-dd จาก <input type="date"> */
    dateRange: { start: string; end: string };
}

/**
 * เงื่อนไขของแถบตัวกรองหน้าประวัติรายการ (ฝั่งแอดมิน) เป็นฟังก์ชันบริสุทธิ์
 *
 * แยกออกมาจาก TransactionView เพื่อให้ทดสอบสองข้อล่างนี้ได้ตรง ๆ โดยไม่ต้องเมานต์
 * ทั้งหน้าและ mock ทุกบริการที่หน้านั้นเรียก
 *
 * @param userName ชื่อผู้ทำรายการที่ resolve แล้ว (มาจาก userMap) -- ไม่ใช่ user_id
 *                 ช่องค้นหาต้องรับ "ชื่อคน" ได้ เพราะนั่นคือสิ่งที่ตาเห็นในตาราง
 *                 ส่วน id เป็น uuid ที่ไม่มีใครจำ
 */
export const matchesTransactionFilters = (
    tx: Transaction,
    criteria: TransactionFilterCriteria,
    userName?: string,
): boolean => {
    const { searchTerm, actionFilter, locationFilter, userFilter, dateRange } = criteria;

    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
        term === '' ||
        tx.pallet_id.toLowerCase().includes(term) ||
        // ต้นทางถูกค้นได้ด้วย ไม่ใช่ปลายทางอย่างเดียว -- แถวรับคืนมีปลายทางเป็น
        // 'Warehouse' ทุกแถว และแถวแจ้งชำรุด/ตัดออกไม่มีปลายทางเลย ที่ตั้งจริงของ
        // สองประเภทนั้นอยู่ในฟิลด์ต้นทางที่เดียว
        (tx.department_origin || '').toLowerCase().includes(term) ||
        (tx.department_dest || '').toLowerCase().includes(term) ||
        (tx.transaction_remark || '').toLowerCase().includes(term) ||
        (userName || '').toLowerCase().includes(term);

    const matchesAction = actionFilter === 'all' || tx.action_type === actionFilter;

    // ตรงปลายใดปลายหนึ่งก็นับ: เลือก "ฝ่ายผลิต" แล้วเห็นแต่ของที่เบิก*ไป*ที่นั่น
    // โดยไม่เห็นของที่คืน*มาจาก*ที่นั่น คือการตอบครึ่งเดียวของกิจกรรมที่จุดนั้น
    const matchesLocation =
        locationFilter === 'all' ||
        tx.department_dest === locationFilter ||
        tx.department_origin === locationFilter;

    const matchesUser = userFilter === 'all' || tx.user_id === userFilter;

    // ขอบวันตามเวลาเครื่องของผู้ใช้ เหมือนที่หน้าจอเคยทำมา
    let matchesDate = true;
    if (dateRange.start) {
        const start = new Date(dateRange.start);
        start.setHours(0, 0, 0, 0);
        matchesDate = matchesDate && new Date(tx.timestamp) >= start;
    }
    if (dateRange.end) {
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && new Date(tx.timestamp) <= end;
    }

    return matchesSearch && matchesAction && matchesLocation && matchesUser && matchesDate;
};
