import { describe, expect, it } from 'vitest';
import { nextPalletId, palletIdRange, parsePalletId } from './palletIdSequence';

// This module is pure, which is the whole reason it was split out of
// AddPalletModal: every case below is an edge case, and reaching any of them
// through the modal would mean opening it, typing an id and reading a preview
// line. Here they are twelve assertions in one file.

describe('parsePalletId', () => {
    it('แยก prefix, เลข และความกว้างของการเติมศูนย์', () => {
        expect(parsePalletId('P001')).toEqual({ prefix: 'P', number: 1, width: 3 });
    });

    it('เลขที่ล้นความกว้างเดิม คืน width ตามจำนวนหลักที่เขียนจริง', () => {
        expect(parsePalletId('P1000')).toEqual({ prefix: 'P', number: 1000, width: 4 });
    });

    it('รหัสที่ไม่มีเลขท้าย คืน null', () => {
        expect(parsePalletId('TEST')).toBeNull();
    });

    // นี่คือกรณีที่บังคับให้ prefix ต้องเป็น [A-Za-z]* ไม่ใช่ `.*?` -- prefix ที่รับ
    // อะไรก็ได้จะอ่าน 'SPECIAL-01' เป็น prefix 'SPECIAL-' + 1 แล้วสร้าง SPECIAL-02
    // ต่อให้ ทั้งที่รหัสนี้เห็นชัดว่าถูกตั้งมาเป็นใบเดี่ยว
    it('รหัสที่มีตัวคั่นอย่าง SPECIAL-01 คืน null', () => {
        expect(parsePalletId('SPECIAL-01')).toBeNull();
    });

    it('สตริงว่าง คืน null', () => {
        expect(parsePalletId('')).toBeNull();
    });
});

describe('nextPalletId', () => {
    it('ยังไม่มีพาเลทสักใบ เริ่มที่ P001', () => {
        expect(nextPalletId([])).toBe('P001');
    });

    it('มีแต่รหัสที่หลุดรูปแบบ ก็ยังเริ่มที่ P001', () => {
        expect(nextPalletId(['TEST', 'ABC'])).toBe('P001');
    });

    it('นับต่อจากเลขสูงสุด', () => {
        expect(nextPalletId(['P001', 'P023'])).toBe('P024');
    });

    // ไม่ใช้รหัสที่ถูกลบไปแล้วซ้ำ: P010 หายไปจากรายการ แต่ตัวนับยังเดินต่อจาก P023
    // เพราะรหัสไปอยู่บนสติกเกอร์ QR ที่แปะบนพาเลทจริง ใช้ซ้ำแล้วประวัติสองใบปนกัน
    it('รหัสที่ถูกลบไปแล้วไม่ถูกนำกลับมาใช้', () => {
        expect(nextPalletId(['P001', 'P023'])).toBe('P024');
        expect(nextPalletId(['P001', 'P002', 'P023'])).toBe('P024');
    });

    it('ความยาวไม่เท่ากันปนกัน ยึด width ของตัวที่เลขสูงสุด', () => {
        expect(nextPalletId(['P9', 'P010'])).toBe('P011');
    });

    it('เลขล้น width ปล่อยให้ยาวขึ้น ไม่ตัดทิ้งและไม่วนกลับ', () => {
        expect(nextPalletId(['P999'])).toBe('P1000');
    });

    // กฎเลือก prefix: กลุ่มที่สมาชิกมากที่สุดชนะ ไม่ใช่ "เลขสูงสุดของทั้งชุด"
    // ถ้ายึดเลขสูงสุด รหัสแปลกปลอมใบเดียวอย่าง X900 จะลากพาเลทที่จะสร้างใหม่
    // ทั้งหมดให้กลายเป็น X901, X902, ... ทันที
    it('รหัสแปลกปลอมใบเดียวไม่ลาก prefix ของทั้งกลุ่ม', () => {
        expect(nextPalletId(['P001', 'P002', 'X900'])).toBe('P003');
    });

    it('จำนวนสมาชิกเท่ากัน ตัดสินด้วยกลุ่มที่เลขสูงกว่า', () => {
        expect(nextPalletId(['P001', 'X900'])).toBe('X901');
    });
});

describe('palletIdRange', () => {
    it('สร้างช่วงต่อเนื่องตามจำนวนที่ขอ', () => {
        expect(palletIdRange('P024', 3)).toEqual(['P024', 'P025', 'P026']);
    });

    it('จำนวน 1 คืนรหัสเดียว', () => {
        expect(palletIdRange('P024', 1)).toEqual(['P024']);
    });

    it('ช่วงที่คร่อมการล้น width ยาวขึ้นกลางช่วงได้', () => {
        expect(palletIdRange('P998', 3)).toEqual(['P998', 'P999', 'P1000']);
    });

    // โยน ไม่ใช่คืน [startId] เงียบ ๆ -- การคืนใบเดียวคือการสร้างพาเลท 1 ใบทั้งที่
    // ผู้ใช้ขอ 20 ใบ ซึ่งเป็นความผิดพลาดที่ไม่มีอะไรบนจอบอก
    it('รหัสที่ parse ไม่ได้ สร้างช่วงไม่ได้ ต้องโยน error', () => {
        expect(() => palletIdRange('SPECIAL-01', 5)).toThrow();
    });

    it('จำนวนที่ไม่ใช่จำนวนเต็มบวก ต้องโยน error', () => {
        expect(() => palletIdRange('P024', 0)).toThrow();
        expect(() => palletIdRange('P024', -1)).toThrow();
    });
});
