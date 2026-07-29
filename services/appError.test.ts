import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppError, describeAppError } from './appError';

afterEach(() => {
    vi.restoreAllMocks();
});

// สิ่งที่เทสต์นี้กันไว้ไม่ใช่ข้อความบนจอ แต่เป็นสิ่งที่เหลือให้คนดีบักหลังจากนั้น
//
// error ที่ไม่ใช่ AppError จะถูกยุบเป็น errors.unknown ก้อนเดียว ซึ่งถูกต้อง --
// สตริงภายในไม่ควรโผล่บน UI แต่ผู้เรียกส่วนใหญ่ไม่ได้ log ตัวจริงไว้เอง
// รายละเอียดจึงหายไปทั้งหมดตรงบรรทัดนี้ถ้าไม่มีใครเก็บสำเนา
describe('describeAppError -- error ที่อ่านไม่ออกต้องไม่หายเงียบ', () => {
    it('log error ที่ไม่ใช่ AppError ออกคอนโซล พร้อมตัว error ทั้งก้อน', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        // รูปร่างเดียวกับที่ supabase-js โยนออกมาจริงตอน RLS ปฏิเสธ
        const postgrestError = {
            code: '42501',
            message: 'new row violates row-level security policy (USING expression)',
        };

        describeAppError(postgrestError);

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy.mock.calls[0]).toContain(postgrestError);
    });

    // AppError เป็นสิ่งที่เราตั้งใจโยนเอง ข้อความของมันถูกแสดงเต็ม ๆ อยู่แล้ว
    // การ log ด้วยจะกลบตัวที่ไม่มีใครคาดคิดซึ่งเป็นตัวที่ต้องการสายตาจริง ๆ
    it('ไม่ log AppError ที่เราโยนเอง', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

        describeAppError(new AppError('pallet_not_found', { palletId: 'P001' }));

        expect(spy).not.toHaveBeenCalled();
    });

    // การ log ต้องไม่เปลี่ยนสิ่งที่ผู้ใช้เห็น
    it('ยังคืนข้อความกลางสำหรับ error ที่ไม่รู้จัก และคืนข้อความเฉพาะสำหรับ AppError', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});

        const unknown = describeAppError(new Error('boom'));
        const known = describeAppError(new AppError('destination_required'));

        expect(unknown).toBeTruthy();
        expect(known).toBeTruthy();
        expect(known).not.toBe(unknown);
    });
});
