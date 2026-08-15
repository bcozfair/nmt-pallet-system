import type { Transaction } from '../types';
import { IMAGE_DELETED } from './storageService';

/**
 * รูปหลักฐานที่แถว "ตัดออกจากระบบ" ยืมมาจากรายงานความเสียหายก่อนหน้าของพาเลทใบเดียวกัน
 *
 * ---------------------------------------------------------------------------
 * ทำไมต้องยืม แทนที่จะเก็บ evidence_image_url ลงแถว scrap ตอนบันทึก
 *
 * scrapPallet() จงใจไม่ลบรูปของรายงานความเสียหายทิ้ง (ต่างจาก resolveDamage ที่ลบ)
 * เพราะรูปนั้นคือ "เหตุผลที่ตัดทรัพย์สินออกจากบัญชี" -- แต่ตัวแถว scrap เองไม่มีรูป
 * คอลัมน์หลักฐานของแถวนั้นจึงว่างเปล่า ทั้งที่หลักฐานยังอยู่ครบในถัง
 *
 * ทางที่ดูง่ายกว่าคือคัดลอกชื่อไฟล์เดิมลงแถว scrap ด้วย -- ห้ามทำ เพราะ
 * deleteTransaction() ลบไฟล์ในถังตามค่าที่อยู่ในแถวที่กำลังลบ (removeEvidenceObjects)
 * สองแถวที่ชี้ไฟล์เดียวกันจึงแปลว่า ลบแถวไหนก่อนก็ตาม อีกแถวจะเหลือแต่ชื่อไฟล์ที่
 * ไม่มีไฟล์อยู่จริง โดยไม่มีอะไรฟ้อง
 *
 * การจับคู่จึงทำตอนแสดงผลแทน: ไม่แตะฐานข้อมูล ไม่มีไฟล์ที่ถูกอ้างสองที่
 * ---------------------------------------------------------------------------
 *
 * รับแถวมาเท่าที่หน้าจอโหลดไว้ ถ้ารายงานความเสียหายอยู่นอกช่วงนั้น แถว scrap จะไม่มี
 * คีย์อยู่ในผลลัพธ์ และหน้าจอต้องแสดงว่า "ไม่มีหลักฐาน" ตามจริง ไม่ใช่เดาว่ามี
 *
 * @returns map จาก id ของแถว scrap ไปยังค่าที่เก็บใน evidence_image_url ของรายงานนั้น
 */
export const scrapEvidenceByTxId = (rows: Transaction[]): Record<string, string> => {
    // รูปที่ถูกลบไปแล้ว (sentinel) นับเป็นไม่มีรูป -- มันเปิดไม่ได้แล้วจริง ๆ
    const usable = (tx: Transaction) =>
        !!tx.evidence_image_url && tx.evidence_image_url !== IMAGE_DELETED;

    const damageByPallet = new Map<string, Transaction[]>();
    for (const tx of rows) {
        if (tx.action_type !== 'report_damage' || !usable(tx)) continue;
        const list = damageByPallet.get(tx.pallet_id);
        if (list) list.push(tx);
        else damageByPallet.set(tx.pallet_id, [tx]);
    }

    const result: Record<string, string> = {};
    for (const tx of rows) {
        if (tx.action_type !== 'scrap' || usable(tx)) continue;

        const candidates = damageByPallet.get(tx.pallet_id);
        if (!candidates) continue;

        // ต้องเป็นรายงานที่เกิด "ก่อน" การตัดออกเท่านั้น พาเลทที่ถูกตัดออกแล้วสร้างใหม่
        // ด้วยรหัสเดิมจะมีรายงานความเสียหายรอบใหม่ตามหลังมา การหยิบรูปที่ใหม่ที่สุด
        // โดยไม่ดูเวลาจะทำให้แถวเก่าอ้างรูปของเหตุการณ์ที่ยังไม่เกิดตอนนั้น
        let best: Transaction | null = null;
        for (const dmg of candidates) {
            if (dmg.timestamp > tx.timestamp) continue;
            if (!best || dmg.timestamp > best.timestamp) best = dmg;
        }

        if (best) result[tx.id] = best.evidence_image_url as string;
    }

    return result;
};
