import { describe, expect, it, vi, beforeEach } from 'vitest';

// vi.mock ถูกยกขึ้นไปบนสุดของไฟล์ก่อน const ทุกตัว -- เหตุผลเดียวกับที่
// settingsService.test.ts บันทึกไว้
const mocks = vi.hoisted(() => ({
    remove: vi.fn(),
    storageFrom: vi.fn(),
}));

vi.mock('./supabase', () => ({
    supabase: {
        storage: { from: mocks.storageFrom },
    },
}));

import { removeEvidenceObjects, DAMAGE_BUCKET, IMAGE_DELETED } from './storageService';

beforeEach(() => {
    vi.clearAllMocks();
    mocks.storageFrom.mockReturnValue({ remove: mocks.remove });
    // ค่าปริยาย: ลบผ่านทุกไฟล์ที่ขอ
    mocks.remove.mockImplementation((names: string[]) =>
        Promise.resolve({ data: names.map((name) => ({ name })), error: null }),
    );
});

describe('removeEvidenceObjects', () => {
    it('ลบไฟล์ตามชื่อ object ที่เก็บไว้ในแถว', async () => {
        const removed = await removeEvidenceObjects(['P001_1700000000000.jpg']);

        expect(mocks.storageFrom).toHaveBeenCalledWith(DAMAGE_BUCKET);
        expect(mocks.remove).toHaveBeenCalledWith(['P001_1700000000000.jpg']);
        expect(removed).toBe(1);
    });

    // แถวที่เขียนก่อนถังถูกทำเป็น private เก็บ URL เต็ม -- ถ้าส่งทั้ง URL เข้า
    // remove() ไฟล์จะไม่ถูกลบและไม่มี error ด้วย มันจะกลายเป็นไฟล์กำพร้าเงียบ ๆ
    it('ดึงชื่อไฟล์ออกจาก URL เต็มแบบเก่าได้', async () => {
        await removeEvidenceObjects([
            'https://x.supabase.co/storage/v1/object/public/damage_reports/P002_1700000000001.jpg',
        ]);

        expect(mocks.remove).toHaveBeenCalledWith(['P002_1700000000001.jpg']);
    });

    // แถวที่ไม่มีรูป กับแถวที่ resolveDamage() ลบรูปไปแล้ว ต้องไม่กลายเป็นคำขอ
    // ที่ยิงออกไปเปล่า ๆ -- การล้างข้อมูลสองปีเจอแถวแบบนี้เป็นส่วนใหญ่
    it('ข้าม null, undefined และ sentinel image_deleted โดยไม่ยิงคำขอ', async () => {
        const removed = await removeEvidenceObjects([null, undefined, IMAGE_DELETED]);

        expect(mocks.remove).not.toHaveBeenCalled();
        expect(removed).toBe(0);
    });

    // สองแถวชี้ไปไฟล์เดียวกันได้ แถวหนึ่งเก็บ URL เต็ม อีกแถวเก็บชื่อเปล่า
    it('ตัดชื่อซ้ำก่อนส่ง เพื่อไม่ให้จำนวนที่รายงานเกินจริง', async () => {
        const removed = await removeEvidenceObjects([
            'P003_1700000000002.jpg',
            'https://x.supabase.co/storage/v1/object/public/damage_reports/P003_1700000000002.jpg',
        ]);

        expect(mocks.remove).toHaveBeenCalledWith(['P003_1700000000002.jpg']);
        expect(removed).toBe(1);
    });

    it('ตัดเป็นชุดละ 100 เมื่อไฟล์เยอะ', async () => {
        const names = Array.from({ length: 250 }, (_, i) => `P${i}_170000000000${i}.jpg`);

        const removed = await removeEvidenceObjects(names);

        expect(mocks.remove).toHaveBeenCalledTimes(3);
        expect(mocks.remove.mock.calls[0][0]).toHaveLength(100);
        expect(mocks.remove.mock.calls[2][0]).toHaveLength(50);
        expect(removed).toBe(250);
    });

    // ถ้ากลืน error ตรงนี้ คนเรียก (cleanupOldData / deleteTransaction) จะเดินหน้า
    // ลบแถวที่ชี้มาหาไฟล์เหล่านี้ต่อ ไฟล์จึงกลายเป็นกำพร้าถาวรโดยไม่มีใครรู้
    it('โยน error ของ storage ต่อ ไม่กลืน', async () => {
        const failure = { message: 'permission denied' };
        mocks.remove.mockResolvedValue({ data: null, error: failure });

        await expect(removeEvidenceObjects(['P004_1700000000003.jpg'])).rejects.toBe(failure);
    });

    // ไฟล์ที่หายไปก่อนแล้วจะไม่อยู่ใน data ที่ตอบกลับมา -- นับตาม batch.length จะ
    // รายงานว่าคืนพื้นที่ได้มากกว่าความจริง
    it('นับเฉพาะไฟล์ที่เซิร์ฟเวอร์บอกว่าลบจริง', async () => {
        mocks.remove.mockResolvedValue({ data: [{ name: 'a.jpg' }], error: null });

        const removed = await removeEvidenceObjects(['a.jpg', 'b.jpg']);

        expect(removed).toBe(1);
    });
});
