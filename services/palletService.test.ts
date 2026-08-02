import { describe, expect, it, vi, beforeEach } from 'vitest';

// mock แค่ ./supabase ตัวเดียว -- storageService ตัวจริงถูกเรียกใช้จริง เพราะสิ่งที่
// ต้องพิสูจน์คือ "พาเลทกับรูปหายไปด้วยกัน" ซึ่งเป็นข้อตกลงระหว่างสองไฟล์
const mocks = vi.hoisted(() => ({
    from: vi.fn(),
    remove: vi.fn(),
    events: [] as string[],
}));

vi.mock('./supabase', () => ({
    supabase: {
        from: mocks.from,
        storage: { from: () => ({ remove: mocks.remove }) },
    },
}));

import { deletePallet } from './palletService';

const results = {
    select: { data: [] as { evidence_image_url: string | null }[], error: null as unknown },
    delete: { error: null as unknown },
};

const makeBuilder = () => {
    let mode: 'select' | 'delete' = 'select';
    const builder: any = {};

    for (const method of ['not', 'lt', 'eq', 'order', 'range']) {
        builder[method] = vi.fn(() => builder);
    }
    builder.select = vi.fn(() => {
        mode = 'select';
        return builder;
    });
    builder.delete = vi.fn(() => {
        mode = 'delete';
        mocks.events.push('delete-pallet');
        return builder;
    });
    builder.then = (resolve: any, reject: any) =>
        Promise.resolve(mode === 'select' ? results.select : results.delete).then(resolve, reject);

    return builder;
};

beforeEach(() => {
    vi.clearAllMocks();
    mocks.events.length = 0;
    results.select = { data: [], error: null };
    results.delete = { error: null };
    mocks.from.mockImplementation(() => makeBuilder());
    mocks.remove.mockImplementation((names: string[]) => {
        mocks.events.push('remove-files');
        return Promise.resolve({ data: names.map((name) => ({ name })), error: null });
    });
});

// อาการที่เทสต์ชุดนี้กัน: transactions.pallet_id เป็น ON DELETE CASCADE การลบพาเลท
// จึงลบประวัติทั้งหมดของมันทิ้งฝั่งฐานข้อมูลโดยที่โค้ดฝั่งแอปไม่เคยเห็นแถวเหล่านั้น
// ไฟล์รูปในถังจึงค้างอยู่ตลอดกาล และไม่เหลือทางบอกได้ด้วยซ้ำว่ามันเคยเป็นของใคร --
// เป็นรูรั่วที่เงียบกว่าอีกสองทางที่ลบแถวได้ เพราะไม่มีบรรทัดไหนใน JS ที่แตะ
// transactions เลย
describe('deletePallet', () => {
    it('ลบรูปหลักฐานของประวัติพาเลทใบนั้นก่อนลบพาเลท', async () => {
        results.select = {
            data: [{ evidence_image_url: 'P001_1.jpg' }, { evidence_image_url: 'P001_2.jpg' }],
            error: null,
        };

        await deletePallet('P001');

        expect(mocks.remove).toHaveBeenCalledWith(['P001_1.jpg', 'P001_2.jpg']);
        expect(mocks.events).toEqual(['remove-files', 'delete-pallet']);
    });

    it('ลบรูปไม่สำเร็จต้องไม่ลบพาเลทต่อ', async () => {
        results.select = { data: [{ evidence_image_url: 'P001_1.jpg' }], error: null };
        mocks.remove.mockResolvedValue({ data: null, error: { message: 'permission denied' } });

        await expect(deletePallet('P001')).rejects.toBeDefined();
        expect(mocks.events).not.toContain('delete-pallet');
    });

    // อ่านรายชื่อไฟล์ไม่ครบแล้วลบพาเลทต่อ = สร้างไฟล์กำพร้าด้วยมือตัวเอง
    it('อ่านรายชื่อรูปไม่สำเร็จต้องไม่ลบพาเลทต่อ', async () => {
        results.select = { data: [], error: { message: 'timeout' } };

        await expect(deletePallet('P001')).rejects.toBeDefined();
        expect(mocks.events).toEqual([]);
    });

    // พาเลทส่วนใหญ่ไม่เคยถูกแจ้งชำรุด จึงไม่มีรูปสักใบ
    it('พาเลทที่ไม่มีรูปเลยยังลบได้ตามปกติ โดยไม่แตะ storage', async () => {
        await expect(deletePallet('P002')).resolves.toBeUndefined();

        expect(mocks.remove).not.toHaveBeenCalled();
        expect(mocks.events).toEqual(['delete-pallet']);
    });
});
