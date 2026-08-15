import { describe, expect, it } from 'vitest';
import type { Transaction } from '../types';
import { scrapEvidenceByTxId } from './transactionEvidence';

const tx = (over: Partial<Transaction>): Transaction => ({
    id: 'x',
    pallet_id: 'P001',
    user_id: 'staff-1',
    action_type: 'check_out',
    department_origin: 'คลังกลาง',
    department_dest: 'ฝ่ายผลิต',
    evidence_image_url: null,
    timestamp: '2026-08-15T03:00:00.000Z',
    ...over,
});

const damage = (over: Partial<Transaction>) =>
    tx({
        action_type: 'report_damage',
        department_dest: null,
        evidence_image_url: 'dmg.jpg',
        ...over,
    });

const scrap = (over: Partial<Transaction>) =>
    tx({ action_type: 'scrap', department_dest: null, ...over });

describe('scrapEvidenceByTxId', () => {
    it('แถวตัดออกจากระบบยืมรูปจากรายงานความเสียหายของพาเลทใบเดียวกัน', () => {
        const map = scrapEvidenceByTxId([
            damage({ id: 'd1', timestamp: '2026-08-10T00:00:00.000Z' }),
            scrap({ id: 's1', timestamp: '2026-08-12T00:00:00.000Z' }),
        ]);

        expect(map.s1).toBe('dmg.jpg');
    });

    it('หยิบรายงานล่าสุดที่เกิดก่อนการตัดออก ไม่ใช่รายงานแรกสุด', () => {
        const map = scrapEvidenceByTxId([
            damage({ id: 'd1', timestamp: '2026-08-01T00:00:00.000Z', evidence_image_url: 'old.jpg' }),
            damage({ id: 'd2', timestamp: '2026-08-10T00:00:00.000Z', evidence_image_url: 'new.jpg' }),
            scrap({ id: 's1', timestamp: '2026-08-12T00:00:00.000Z' }),
        ]);

        expect(map.s1).toBe('new.jpg');
    });

    // พาเลทที่ถูกตัดออกแล้วสร้างใหม่ด้วยรหัสเดิม จะมีรายงานรอบใหม่ตามหลังแถว scrap เก่า
    it('ไม่ยืมรูปจากรายงานที่เกิดหลังการตัดออก', () => {
        const map = scrapEvidenceByTxId([
            scrap({ id: 's1', timestamp: '2026-08-12T00:00:00.000Z' }),
            damage({ id: 'd2', timestamp: '2026-08-20T00:00:00.000Z', evidence_image_url: 'later.jpg' }),
        ]);

        expect(map.s1).toBeUndefined();
    });

    it('ไม่ข้ามพาเลท -- รายงานของ P002 ไม่ตกไปอยู่กับการตัดออกของ P001', () => {
        const map = scrapEvidenceByTxId([
            damage({ id: 'd1', pallet_id: 'P002', timestamp: '2026-08-10T00:00:00.000Z' }),
            scrap({ id: 's1', pallet_id: 'P001', timestamp: '2026-08-12T00:00:00.000Z' }),
        ]);

        expect(map.s1).toBeUndefined();
    });

    // resolveDamage() ลบไฟล์จริงแล้วเขียน sentinel ทับไว้ -- ปุ่มที่เปิดค่านี้จะเปิดอะไรไม่ได้
    it('รูปที่ถูกลบไปแล้ว (sentinel) ไม่นับว่าเป็นหลักฐานที่ยืมได้', () => {
        const map = scrapEvidenceByTxId([
            damage({ id: 'd1', timestamp: '2026-08-10T00:00:00.000Z', evidence_image_url: 'image_deleted' }),
            scrap({ id: 's1', timestamp: '2026-08-12T00:00:00.000Z' }),
        ]);

        expect(map.s1).toBeUndefined();
    });

    it('แถวประเภทอื่นไม่ยืมรูป แม้จะมีรายงานความเสียหายของพาเลทใบเดียวกันอยู่', () => {
        const map = scrapEvidenceByTxId([
            damage({ id: 'd1', timestamp: '2026-08-10T00:00:00.000Z' }),
            tx({ id: 'c1', action_type: 'check_out', timestamp: '2026-08-12T00:00:00.000Z' }),
            tx({ id: 'r1', action_type: 'repair', timestamp: '2026-08-12T00:00:00.000Z' }),
        ]);

        expect(map).toEqual({});
    });
});
