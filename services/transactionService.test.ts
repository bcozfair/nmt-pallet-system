import { describe, expect, it, vi, beforeEach } from 'vitest';

// เทสต์ชุดนี้ mock แค่ ./supabase ตัวเดียว -- storageService ตัวจริงถูกเรียกใช้งาน
// จริงผ่าน transactionService เพราะสิ่งที่ต้องพิสูจน์คือ "แถวกับไฟล์หายไปด้วยกัน"
// ซึ่งเป็นข้อตกลงระหว่างสองไฟล์นั้น ไม่ใช่พฤติกรรมของไฟล์ใดไฟล์หนึ่ง
const mocks = vi.hoisted(() => ({
    from: vi.fn(),
    remove: vi.fn(),
    /** ลำดับเหตุการณ์ที่เกิดขึ้นจริง ใช้พิสูจน์ว่าลบไฟล์ก่อนลบแถว */
    events: [] as string[],
}));

vi.mock('./supabase', () => ({
    supabase: {
        from: mocks.from,
        storage: { from: () => ({ remove: mocks.remove }) },
    },
}));

import { cleanupOldData, deleteTransaction } from './transactionService';

/** ผลลัพธ์ที่ mock query builder จะตอบกลับ -- แต่ละเทสต์เขียนทับได้ */
const results = {
    select: { data: [] as { evidence_image_url: string | null }[], error: null as unknown },
    selectSingle: { data: null as { evidence_image_url: string | null } | null, error: null as unknown },
    delete: { count: 0, error: null as unknown },
};

// PostgREST builder เป็นเชนที่คืนตัวเองไปเรื่อย ๆ แล้วค่อย await ตอนท้าย ตัวปลอม
// จึงต้องคืนตัวเองทุกเมธอด และเป็น thenable เพื่อให้ await ได้ ส่วนคำตอบเลือกจาก
// เมธอดตั้งต้น (select หรือ delete) ที่ถูกเรียกไปแล้วในเชนนั้น
const makeBuilder = () => {
    let mode: 'select' | 'delete' = 'select';
    const builder: any = {};

    for (const method of ['not', 'lt', 'gte', 'eq', 'in', 'order', 'range', 'limit']) {
        builder[method] = vi.fn(() => builder);
    }
    builder.select = vi.fn(() => {
        mode = 'select';
        return builder;
    });
    builder.delete = vi.fn(() => {
        mode = 'delete';
        mocks.events.push('delete-rows');
        return builder;
    });
    builder.maybeSingle = vi.fn(() => Promise.resolve(results.selectSingle));
    builder.then = (resolve: any, reject: any) =>
        Promise.resolve(mode === 'select' ? results.select : results.delete).then(resolve, reject);

    return builder;
};

beforeEach(() => {
    vi.clearAllMocks();
    mocks.events.length = 0;
    results.select = { data: [], error: null };
    results.selectSingle = { data: null, error: null };
    results.delete = { count: 0, error: null };
    mocks.from.mockImplementation(() => makeBuilder());
    mocks.remove.mockImplementation((names: string[]) => {
        mocks.events.push('remove-files');
        return Promise.resolve({ data: names.map((name) => ({ name })), error: null });
    });
});

// อาการที่เทสต์ชุดนี้กัน: ของเดิม cleanupOldData ลบเฉพาะแถว ไฟล์หลักฐานอยู่ต่อใน
// ถังโดยไม่มีอะไรอ้างถึง และเมื่อแถวที่เคยชี้ไปหามันหายแล้ว ก็ไม่เหลือทางบอกได้อีก
// ว่าไฟล์ไหนกำพร้า -- ยิ่งกดล้างข้อมูล พื้นที่ยิ่งถูกจองถาวรมากขึ้น ซึ่งเป็นเรื่อง
// คอขาดบาดตายบนโควตา 50MB
describe('cleanupOldData', () => {
    it('ลบไฟล์หลักฐานของแถวที่กำลังจะถูกลบด้วย', async () => {
        results.select = {
            data: [{ evidence_image_url: 'P001_1.jpg' }, { evidence_image_url: 'P002_2.jpg' }],
            error: null,
        };
        results.delete = { count: 7, error: null };

        const result = await cleanupOldData(2);

        expect(mocks.remove).toHaveBeenCalledWith(['P001_1.jpg', 'P002_2.jpg']);
        expect(result).toEqual({ transactions: 7, images: 2 });
    });

    // ลำดับไม่ใช่รสนิยม: ลบไฟล์พลาดแล้วหยุด = ข้อมูลยังครบ กดใหม่ได้ ส่วนลบแถวผ่าน
    // แล้วลบไฟล์พลาด = ไฟล์กำพร้าถาวรที่ไม่มีทางตามหาเจอว่าเป็นของแถวไหน
    it('ลบไฟล์ก่อนลบแถว', async () => {
        results.select = { data: [{ evidence_image_url: 'P001_1.jpg' }], error: null };

        await cleanupOldData(2);

        expect(mocks.events).toEqual(['remove-files', 'delete-rows']);
    });

    it('ลบไฟล์ไม่สำเร็จต้องไม่ลบแถวต่อ', async () => {
        results.select = { data: [{ evidence_image_url: 'P001_1.jpg' }], error: null };
        mocks.remove.mockResolvedValue({ data: null, error: { message: 'permission denied' } });

        await expect(cleanupOldData(2)).rejects.toBeDefined();
        expect(mocks.events).not.toContain('delete-rows');
    });

    // อ่านรายชื่อไฟล์ไม่ครบ = ลบแถวทิ้งไปมากกว่าไฟล์ที่ลบ ซึ่งคือการสร้างไฟล์กำพร้า
    // ด้วยมือตัวเอง หยุดไว้ดีกว่าเดินต่อด้วยรายการที่ไม่ครบ
    it('อ่านรายชื่อไฟล์ไม่สำเร็จต้องไม่ลบแถวต่อ', async () => {
        results.select = { data: [], error: { message: 'timeout' } };

        await expect(cleanupOldData(2)).rejects.toBeDefined();
        expect(mocks.events).toEqual([]);
    });

    // แถวส่วนใหญ่ในตารางเป็นเบิกออก/รับคืนซึ่งไม่มีรูป การล้างข้อมูลที่ไม่เจอรูปเลย
    // ต้องไม่ยิงคำขอไปที่ storage เปล่า ๆ
    it('ไม่มีรูปให้ลบก็ไม่ยิงคำขอไป storage', async () => {
        results.delete = { count: 12, error: null };

        const result = await cleanupOldData(2);

        expect(mocks.remove).not.toHaveBeenCalled();
        expect(result).toEqual({ transactions: 12, images: 0 });
    });
});

describe('deleteTransaction', () => {
    it('ลบรูปของแถวนั้นก่อนแล้วจึงลบแถว', async () => {
        results.selectSingle = { data: { evidence_image_url: 'P009_9.jpg' }, error: null };

        await deleteTransaction('tx-1');

        expect(mocks.remove).toHaveBeenCalledWith(['P009_9.jpg']);
        expect(mocks.events).toEqual(['remove-files', 'delete-rows']);
    });

    it('แถวที่ไม่มีรูปยังลบได้ตามปกติ โดยไม่แตะ storage', async () => {
        results.selectSingle = { data: { evidence_image_url: null }, error: null };

        await expect(deleteTransaction('tx-2')).resolves.toBe(true);
        expect(mocks.remove).not.toHaveBeenCalled();
        expect(mocks.events).toEqual(['delete-rows']);
    });

    // แอดมินอีกคนลบตัดหน้าไปแล้ว -- ไม่ใช่ข้อผิดพลาด แค่ไม่มีอะไรให้ลบเพิ่ม
    it('หาแถวไม่เจอก็ไม่ล้ม', async () => {
        results.selectSingle = { data: null, error: null };

        await expect(deleteTransaction('tx-3')).resolves.toBe(true);
        expect(mocks.remove).not.toHaveBeenCalled();
    });
});
