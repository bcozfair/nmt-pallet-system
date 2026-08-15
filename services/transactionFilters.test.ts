import { describe, expect, it } from 'vitest';
import type { Transaction } from '../types';
import { matchesTransactionFilters, TransactionFilterCriteria } from './transactionFilters';

const tx = (over: Partial<Transaction>): Transaction => ({
    id: 'x',
    pallet_id: 'P001',
    user_id: 'staff-1',
    action_type: 'check_out',
    department_origin: 'คลังกลาง',
    department_dest: 'ฝ่ายผลิต',
    evidence_image_url: null,
    timestamp: '2026-08-15T03:00:00.000Z',
    transaction_remark: undefined,
    ...over,
});

const none: TransactionFilterCriteria = {
    searchTerm: '',
    actionFilter: 'all',
    locationFilter: 'all',
    userFilter: 'all',
    dateRange: { start: '', end: '' },
};

const criteria = (over: Partial<TransactionFilterCriteria>): TransactionFilterCriteria => ({
    ...none,
    ...over,
});

describe('matchesTransactionFilters -- ช่องค้นหา', () => {
    it('ไม่กรองอะไรเลยเมื่อทุกตัวเป็นค่าเริ่มต้น', () => {
        expect(matchesTransactionFilters(tx({}), none)).toBe(true);
    });

    it('ค้นด้วยชื่อผู้ทำรายการได้ ไม่ใช่เฉพาะ user_id', () => {
        const row = tx({ user_id: 'uuid-ที่ไม่มีใครจำ' });
        const c = criteria({ searchTerm: 'สมชาย' });

        expect(matchesTransactionFilters(row, c, 'สมชาย ใจดี')).toBe(true);
        expect(matchesTransactionFilters(row, c, 'สมหญิง ใจงาม')).toBe(false);
    });

    it('ค้นด้วยชื่อต้นทางได้ -- ที่ตั้งของแถวแจ้งชำรุดอยู่ในฟิลด์นี้ที่เดียว', () => {
        const row = tx({ action_type: 'report_damage', department_origin: 'ฝ่ายผลิต', department_dest: null });
        expect(matchesTransactionFilters(row, criteria({ searchTerm: 'ฝ่ายผลิต' }))).toBe(true);
    });

    it('ยังค้นด้วยรหัสพาเลท ปลายทาง และหมายเหตุได้เหมือนเดิม', () => {
        expect(matchesTransactionFilters(tx({}), criteria({ searchTerm: 'p001' }))).toBe(true);
        expect(matchesTransactionFilters(tx({}), criteria({ searchTerm: 'ฝ่ายผลิต' }))).toBe(true);
        expect(
            matchesTransactionFilters(tx({ transaction_remark: 'ขาหัก' }), criteria({ searchTerm: 'ขาหัก' })),
        ).toBe(true);
    });

    it('คำค้นที่มีแต่ช่องว่างไม่ตัดแถวไหนทิ้ง', () => {
        expect(matchesTransactionFilters(tx({}), criteria({ searchTerm: '   ' }))).toBe(true);
    });
});

describe('matchesTransactionFilters -- ตัวกรองสถานที่', () => {
    it('ตรงที่ปลายทางก็นับ', () => {
        expect(matchesTransactionFilters(tx({}), criteria({ locationFilter: 'ฝ่ายผลิต' }))).toBe(true);
    });

    // นี่คือครึ่งที่หายไป: การรับคืน "จากฝ่ายผลิต" เขียนปลายทางเป็น Warehouse เสมอ
    it('ตรงที่ต้นทางก็นับ -- ของที่คืนมาจากจุดนั้นต้องอยู่ในผลลัพธ์ด้วย', () => {
        const row = tx({
            action_type: 'check_in',
            department_origin: 'ฝ่ายผลิต',
            department_dest: 'Warehouse',
        });
        expect(matchesTransactionFilters(row, criteria({ locationFilter: 'ฝ่ายผลิต' }))).toBe(true);
    });

    it('ไม่ตรงทั้งสองปลายก็ตัดออก', () => {
        expect(matchesTransactionFilters(tx({}), criteria({ locationFilter: 'ฝ่ายบรรจุ' }))).toBe(false);
    });
});

describe('matchesTransactionFilters -- ตัวกรองที่มีอยู่เดิม', () => {
    it('ประเภทรายการ', () => {
        expect(matchesTransactionFilters(tx({}), criteria({ actionFilter: 'check_out' }))).toBe(true);
        expect(matchesTransactionFilters(tx({}), criteria({ actionFilter: 'check_in' }))).toBe(false);
    });

    it('ผู้ทำรายการ', () => {
        expect(matchesTransactionFilters(tx({}), criteria({ userFilter: 'staff-1' }))).toBe(true);
        expect(matchesTransactionFilters(tx({}), criteria({ userFilter: 'staff-2' }))).toBe(false);
    });

    it('ช่วงวันที่นับรวมทั้งวันเริ่มและวันสิ้นสุด', () => {
        const row = tx({ timestamp: new Date('2026-08-15T10:00:00').toISOString() });
        expect(
            matchesTransactionFilters(row, criteria({ dateRange: { start: '2026-08-15', end: '2026-08-15' } })),
        ).toBe(true);
        expect(
            matchesTransactionFilters(row, criteria({ dateRange: { start: '2026-08-16', end: '' } })),
        ).toBe(false);
    });

    it('เงื่อนไขทุกตัวต้องผ่านพร้อมกัน ไม่ใช่ผ่านตัวใดตัวหนึ่ง', () => {
        const c = criteria({ searchTerm: 'P001', actionFilter: 'check_in' });
        expect(matchesTransactionFilters(tx({}), c)).toBe(false);
    });
});
