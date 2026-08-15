import { Transaction } from '../types';

/**
 * หนึ่งชุด = หนึ่งครั้งที่กดบันทึก ไม่ว่าครั้งนั้นจะมีกี่พาเลท
 *
 * ไฟล์นี้เป็นที่เดียวในระบบที่นิยามว่า "แถวไหนอยู่ชุดเดียวกัน" ทั้งชั้นดึงข้อมูล
 * (fetchUserTransactions ต้องนับชุดเพื่อจะรู้ว่าดึงพอหรือยัง) และชั้นแสดงผล
 * (หน้าประวัติพนักงานจัดกลุ่มเป็นการ์ด) อ่านจากที่นี่ที่เดียว -- ถ้าสองที่นั้นนิยาม
 * ชุดไม่ตรงกันแม้แต่นิดเดียว จำนวนที่ดึงมากับจำนวนที่แสดงจะไม่ตรงกัน โดยไม่มีอะไรฟ้อง
 */
export interface TransactionBatch {
    key: string;
    action_type: string;
    department_dest: string | null;
    timestamp: string;
    /** หมายเหตุเป็นของทั้งชุด (createBulkTransaction เขียนค่าเดียวกันลงทุกแถว) */
    remark?: string;
    /** สมาชิกที่ผ่านตัวกรองแล้ว -- อาจน้อยกว่า total */
    items: Transaction[];
    /** ขนาดจริงของชุด ก่อนถูกตัวกรองใด ๆ ตัด */
    total: number;
}

/**
 * คีย์ที่บอกว่าแถวนี้อยู่ชุดไหน
 *
 * ตารางไม่มีคอลัมน์ batch_id ให้จับกลุ่ม สิ่งที่ใช้แทนได้คือ createBulkTransaction
 * คำนวณ timestamp ครั้งเดียวก่อนเข้าลูป แล้วประทับค่าเดียวกันนั้นให้ทุกแถวในชุด --
 * เบิกออก 12 พาเลทครั้งเดียวจึงเป็น 12 แถวที่ timestamp เท่ากันถึงระดับมิลลิวินาที
 * ไม่ใช่ค่าที่ไล่กันทีละนิด
 *
 * นี่ไม่ใช่ข้อสังเกตที่บังเอิญเป็นจริงจากข้อมูลชุดหนึ่ง แต่เป็นสัญญาที่โค้ดฝั่ง service
 * พึ่งพาอยู่ก่อนหน้านี้แล้ว (fetchTransactions เรียง id เป็นคีย์รองด้วยเหตุผลนี้พอดี)
 * และมีเทสต์ล็อกไว้ที่ transactionService.test.ts -- ถ้าวันหนึ่งมีคนเปลี่ยนไปให้
 * ฐานข้อมูลใส่ now() ให้ทีละแถว การจัดกลุ่มทั้งหมดนี้จะพังเงียบ ๆ กลายเป็นการ์ดละพาเลท
 * เทสต์ตัวนั้นคือสิ่งที่ทำให้มันพังเสียงดังแทน
 *
 * พ่วง action กับปลายทางไปด้วย ทั้งที่ timestamp ระดับมิลลิวินาทีแทบไม่มีทางชนกันเอง --
 * เพราะทางเดียวที่ timestamp ถูกกำหนดเองคือหน้าบันทึกย้อนหลังของแอดมิน ซึ่งเลือกได้
 * แค่ระดับนาที และการรวมการเบิกออกกับการรับคืนเข้าเป็นการ์ดเดียวจะอ่านไม่รู้เรื่องเลย
 */
export const batchKeyOf = (tx: Transaction): string =>
    `${tx.timestamp}|${tx.action_type}|${tx.department_dest ?? ''}`;

/**
 * จับแถวธุรกรรมกลับเป็นชุดตามครั้งที่บันทึก
 *
 * รับแถวที่เรียงมาแล้วอย่างไร ก็คืนชุดตามลำดับนั้น: Map ในจาวาสคริปต์ไล่ค่าตามลำดับที่ใส่
 * เข้าไป ชุดจึงเรียงตามแถวแรกที่เจอของแต่ละชุด ซึ่งคือลำดับเวลาที่ส่งเข้ามา
 */
export const groupIntoBatches = (rows: Transaction[]): TransactionBatch[] => {
    const byKey = new Map<string, TransactionBatch>();

    for (const tx of rows) {
        const key = batchKeyOf(tx);
        const batch = byKey.get(key);

        if (batch) {
            batch.items.push(tx);
            batch.total++;
            continue;
        }

        byKey.set(key, {
            key,
            action_type: tx.action_type,
            department_dest: tx.department_dest,
            timestamp: tx.timestamp,
            remark: tx.transaction_remark,
            items: [tx],
            total: 1,
        });
    }

    return Array.from(byKey.values());
};
