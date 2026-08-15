import { describe, expect, it, vi, beforeEach } from 'vitest';

// เทสต์ชุดนี้ mock แค่ ./supabase ตัวเดียว -- storageService ตัวจริงถูกเรียกใช้งาน
// จริงผ่าน transactionService เพราะสิ่งที่ต้องพิสูจน์คือ "แถวกับไฟล์หายไปด้วยกัน"
// ซึ่งเป็นข้อตกลงระหว่างสองไฟล์นั้น ไม่ใช่พฤติกรรมของไฟล์ใดไฟล์หนึ่ง
const mocks = vi.hoisted(() => ({
    from: vi.fn(),
    remove: vi.fn(),
    /** ลำดับเหตุการณ์ที่เกิดขึ้นจริง ใช้พิสูจน์ว่าลบไฟล์ก่อนลบแถว */
    events: [] as string[],
    /** payload ทุกก้อนที่ถูก insert ใช้ตรวจสิ่งที่เขียนลงตาราง ไม่ใช่แค่ว่าเขียนสำเร็จ */
    inserted: [] as any[],
}));

vi.mock('./supabase', () => ({
    supabase: {
        from: mocks.from,
        storage: { from: () => ({ remove: mocks.remove }) },
    },
}));

import {
    cleanupOldData,
    deleteTransaction,
    fetchUserTransactions,
    createBulkTransaction,
} from './transactionService';
import { batchKeyOf, groupIntoBatches } from './transactionBatch';

/** ผลลัพธ์ที่ mock query builder จะตอบกลับ -- แต่ละเทสต์เขียนทับได้ */
const results = {
    select: { data: [] as { evidence_image_url: string | null }[], error: null as unknown },
    /** คำตอบเรียงตามลำดับ query สำหรับเทสต์ที่ยิงหลายรอบ -- ว่างไว้ = ใช้ results.select เหมือนเดิม */
    selectQueue: [] as { data: unknown; error: unknown }[],
    selectSingle: { data: null as { evidence_image_url: string | null } | null, error: null as unknown },
    delete: { count: 0, error: null as unknown },
};

// PostgREST builder เป็นเชนที่คืนตัวเองไปเรื่อย ๆ แล้วค่อย await ตอนท้าย ตัวปลอม
// จึงต้องคืนตัวเองทุกเมธอด และเป็น thenable เพื่อให้ await ได้ ส่วนคำตอบเลือกจาก
// เมธอดตั้งต้น (select หรือ delete) ที่ถูกเรียกไปแล้วในเชนนั้น
const makeBuilder = () => {
    let mode: 'select' | 'delete' = 'select';
    const builder: any = {};

    // lte/gt อยู่ในนี้ด้วยเพราะเส้นทางกรองรายวันเรียกมันจริง -- ตอนที่ยังไม่มี builder.lte
    // เป็น undefined, การเรียกมันโยน TypeError, และ catch ในโค้ดจริงกลืนมันเป็น 'Invalid date
    // filter' เทสต์จึงผ่านโดยที่เงื่อนไขวันไม่เคยถูกใส่ลงคำสั่งเลย
    for (const method of ['not', 'lt', 'lte', 'gt', 'gte', 'eq', 'in', 'order', 'range', 'limit']) {
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
    builder.insert = vi.fn((payload: any) => {
        mocks.inserted.push(payload);
        return builder;
    });
    builder.update = vi.fn(() => builder);
    builder.maybeSingle = vi.fn(() => Promise.resolve(results.selectSingle));
    builder.then = (resolve: any, reject: any) => {
        const answer =
            mode === 'select'
                ? results.selectQueue.length > 0
                    ? results.selectQueue.shift()
                    : results.select
                : results.delete;
        return Promise.resolve(answer).then(resolve, reject);
    };

    return builder;
};

beforeEach(() => {
    vi.clearAllMocks();
    mocks.events.length = 0;
    mocks.inserted.length = 0;
    results.select = { data: [], error: null };
    results.selectQueue = [];
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

// อาการที่เทสต์ชุดนี้กัน: เดิมโหมดทั้งวันตัดที่ 500 แถว ซึ่งตั้งจากสมมติฐานว่าชุดหนึ่งมี
// ไม่กี่พาเลท การใช้งานจริงเบิกทีละ 20-50 พาเลท วันที่ทำงานหนักเพียง 11 ครั้งก็ทะลุแล้ว
// และชุดที่เกินไปจะหายจากหน้าประวัติเงียบ ๆ
describe('fetchUserTransactions -- โหมดทั้งวัน: ครบทั้งวัน', () => {
    const DAY = '2026-08-15';

    const dayRows = (count: number, offset = 0) =>
        Array.from({ length: count }, (_, i) => ({
            id: `row-${offset + i}`,
            pallet_id: `P${offset + i}`,
            timestamp: '2026-08-15T05:00:00.000Z',
        }));

    it('วันที่มีแถวเกินหนึ่งหน้า ต้องไล่ขอจนหมด ไม่ตัดทิ้งที่หน้าแรก', async () => {
        results.selectQueue = [
            { data: dayRows(1000), error: null },
            { data: dayRows(1000, 1000), error: null },
            { data: dayRows(320, 2000), error: null },
        ];

        const rows = await fetchUserTransactions('staff-1', DAY);

        expect(rows).toHaveLength(2320);
        expect(mocks.from).toHaveBeenCalledTimes(3);
    });

    it('วันที่มีแถวไม่ถึงหนึ่งหน้า ก็จบในรอบเดียว', async () => {
        results.selectQueue = [{ data: dayRows(12), error: null }];

        const rows = await fetchUserTransactions('staff-1', DAY);

        expect(rows).toHaveLength(12);
        expect(mocks.from).toHaveBeenCalledTimes(1);
    });
});

// เพดานของโหมด "ล่าสุด" นับเป็นชุด ไม่ใช่แถว -- หน้าประวัติแสดงหนึ่งชุดต่อหนึ่งการ์ด
// เพดานที่นับเป็นแถวจึงให้จำนวนการ์ดที่เดาไม่ได้ ขึ้นกับว่าพนักงานเบิกทีละกี่พาเลท
describe('fetchUserTransactions -- โหมดล่าสุด: นับเป็นชุด', () => {
    /** ชุดละ rowsPerBatch พาเลท ไล่เวลาถอยหลังทีละนาที */
    const BASE = Date.parse('2026-08-15T05:00:00.000Z');
    const makeRows = (batches: number, rowsPerBatch: number, offset = 0) =>
        Array.from({ length: batches * rowsPerBatch }, (_, i) => {
            const batch = offset + Math.floor(i / rowsPerBatch);
            return {
                id: `row-${batch}-${i % rowsPerBatch}`,
                pallet_id: `P${i}`,
                action_type: 'check_out',
                department_dest: 'คลังกลาง',
                // คำนวณจาก epoch ไม่ใช่ประกอบสตริงนาทีเอง -- เทสต์ด้านล่างใช้ชุดเกิน 60 ชุด
                // ซึ่งการลบเลขนาทีตรง ๆ จะได้ "05:-1:00" ที่ไม่ใช่เวลาจริงอีกต่อไป
                timestamp: new Date(BASE - batch * 60_000).toISOString(),
            };
        });

    it('หยุดตรงที่ชุดที่ 51 เริ่ม ชุดที่ 50 จึงมาครบทุกพาเลท ไม่ถูกตัดกลาง', async () => {
        // 200 แถว = 66 ชุด ชุดละ 3 พาเลท ถ้าตัดที่ "แถวที่ 50" ชุดที่ 17 จะเหลือ 2 พาเลทจาก 3
        results.selectQueue = [{ data: makeRows(66, 3), error: null }];

        const rows = await fetchUserTransactions('staff-1');
        const batches = groupIntoBatches(rows as any);

        expect(batches).toHaveLength(50);
        expect(rows).toHaveLength(150);
        expect(batches.every((batch) => batch.total === 3)).toBe(true);
    });

    // ชุดใหญ่คือกรณีที่เพดานเป็นแถวเจ็บที่สุด และเป็นการใช้งานจริงของที่นี่: เบิกทีละ 20-50
    // พาเลทต่อครั้ง 50 ชุดจึงเป็นหลักพันแถว ต้องไล่ขอหลายหน้าโดยที่จำนวนชุดยังต้องได้ 50 พอดี
    it('ชุดละ 20 พาเลท: หน้าแรกเต็ม 1000 แถวแล้วยังไม่ครบ 50 ชุด ก็ขอหน้าถัดไปจนครบ', async () => {
        results.selectQueue = [
            // 25 ชุด ชุดละ 40 พาเลท = เต็มหน้า 1000 แถว แต่ได้มาแค่ 25 ชุด
            { data: makeRows(25, 40), error: null },
            // อีก 25 ชุด = ครบ 50 ชุดพอดีตอนจบหน้าที่สอง แต่หน้าเต็มพอดี จึงยังไม่รู้ว่า
            // ชุดที่ 50 จบแล้วหรือยัง ต้องขอหน้าที่สามมาดูขอบ
            { data: makeRows(25, 40, 25), error: null },
            // หน้าที่สามขึ้นต้นด้วยชุดที่ 51 จึงหยุดทันทีโดยไม่เก็บสักแถว
            { data: makeRows(1, 40, 50), error: null },
        ];

        const rows = await fetchUserTransactions('staff-1');

        expect(groupIntoBatches(rows as any)).toHaveLength(50);
        expect(rows).toHaveLength(2000);
        expect(mocks.from).toHaveBeenCalledTimes(3);
    });

    it('ข้อมูลหมดก่อนครบ 50 ชุด ก็จบเท่าที่มี ไม่วนขอต่อ', async () => {
        results.selectQueue = [{ data: makeRows(4, 3), error: null }];

        const rows = await fetchUserTransactions('staff-1');

        expect(groupIntoBatches(rows as any)).toHaveLength(4);
        expect(mocks.from).toHaveBeenCalledTimes(1);
    });
});

// สัญญาที่การจัดกลุ่มทั้งระบบพึ่งพา: ไม่มีคอลัมน์ batch_id ในตาราง สิ่งเดียวที่บอกได้ว่า
// แถวไหนอยู่ชุดเดียวกันคือ timestamp ที่เท่ากันเป๊ะ ถ้าวันหนึ่งมีคนเปลี่ยนไปให้ฐานข้อมูล
// ใส่ now() ให้ทีละแถว หน้าประวัติจะแตกเป็นการ์ดละพาเลทเงียบ ๆ โดยไม่มีอะไรพัง เทสต์ตัวนี้
// คือสิ่งที่ทำให้มันพังเสียงดังแทน
describe('createBulkTransaction -- timestamp เดียวทั้งชุด', () => {
    it('ทุกแถวที่เขียนในครั้งเดียวกันได้ timestamp ค่าเดียวกัน จึงตกอยู่ในชุดเดียวกัน', async () => {
        // UPDATE ต้องรายงานว่ามีแถวถูกแก้จริง ไม่งั้นการ์ดกันพาเลทหายจะปัดทุกใบเป็น failed
        results.select = { data: [{ pallet_id: 'P001' }] as any, error: null };

        await createBulkTransaction(['P001', 'P002', 'P003'], 'check_out', 'staff-1', 'คลังกลาง');

        expect(mocks.inserted).toHaveLength(3);
        expect(new Set(mocks.inserted.map((row) => row.timestamp)).size).toBe(1);
        // ตรวจผ่านฟังก์ชันตัวจริงที่หน้าประวัติใช้ ไม่ใช่แค่เทียบ timestamp เอง
        expect(new Set(mocks.inserted.map((row) => batchKeyOf(row))).size).toBe(1);
    });

    // การ์ดใบนี้เคยอยู่ใน checkOutPallet() ซึ่งถูกลบไปพร้อมการแก้บั๊ก "กดครั้งเดียวแต่แตกหลายชุด"
    // ถ้ามันไม่ตามมาอยู่ที่นี่ พาเลทที่ไม่มีในระบบจะถูกรายงานว่าเบิกออกสำเร็จ
    it('พาเลทที่ UPDATE ไม่ตรงสักแถว ต้องเป็น failed และต้องไม่มีแถวธุรกรรมถูกเขียน', async () => {
        results.select = { data: [], error: null };

        const result = await createBulkTransaction(['P404'], 'check_out', 'staff-1', 'คลังกลาง');

        expect(result.failed).toEqual(['P404']);
        expect(result.success).toEqual([]);
        expect(mocks.inserted).toHaveLength(0);
    });
});
