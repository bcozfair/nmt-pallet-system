import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Pallet, Transaction } from '../types';

// Everything this module touches is a network call or a toast. Mocking at the
// service boundary rather than at `supabase` keeps the test about what lands in
// the FILE, which is the thing the committee actually looked at.
vi.mock('../services/palletService', () => ({ fetchPallets: vi.fn() }));
vi.mock('../services/userService', () => ({ fetchUsers: vi.fn() }));
vi.mock('../services/transactionService', () => ({ fetchTransactions: vi.fn() }));
vi.mock('../services/storageService', () => ({
    CSV_EVIDENCE_URL_TTL_SECONDS: 60 * 60 * 24 * 7,
    getEvidenceSignedUrlMap: vi.fn(),
}));
vi.mock('../services/toast', () => ({
    toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import { exportHistoryCSV, exportInventoryCSV, generateCSV } from './exportHelpers';
import { fetchPallets } from '../services/palletService';
import { fetchUsers } from '../services/userService';
import { fetchTransactions } from '../services/transactionService';
import { getEvidenceSignedUrlMap } from '../services/storageService';

/**
 * Captures the text generateCSV writes into its Blob.
 *
 * generateCSV builds a Blob, mints an object URL and clicks a link. jsdom has
 * neither URL.createObjectURL nor a real download, so both are stubbed and the
 * Blob's contents are read back through its own text(). That is deliberately not
 * a mock of generateCSV itself: the BOM and the escaping are what is being
 * tested, and they live inside it.
 */
const captureCsv = (): { text: () => Promise<string>; bytes: () => Promise<Uint8Array> } => {
    let captured: Blob | null = null;

    // Assigned, not vi.spyOn'd: jsdom does not implement URL.createObjectURL at
    // all, and spyOn refuses to replace a property that is not there
    // ("createObjectURL does not exist"). vitest.config.ts restores globals
    // between files, and each test calls this afresh.
    URL.createObjectURL = (blob: Blob | MediaSource) => {
        captured = blob as Blob;
        return 'blob:mock';
    };
    URL.revokeObjectURL = () => {};
    // The anchor's click() would try to navigate jsdom.
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    return {
        text: async () => {
            if (!captured) throw new Error('generateCSV never produced a Blob');
            return (captured as Blob).text();
        },
        // The BOM has to be checked on the BYTES, not on the string.
        //
        // Blob.text() decodes as UTF-8, and a UTF-8 decode removes a leading
        // BOM by specification -- so a file that carries one and a file that
        // does not produce the identical string, and a test written against
        // text() would pass whether or not the fix is present. Which is the
        // exact bug being guarded: the committee's mojibake came from a file
        // Excel decoded without one.
        bytes: async () => {
            if (!captured) throw new Error('generateCSV never produced a Blob');
            return new Uint8Array(await (captured as Blob).arrayBuffer());
        },
    };
};

const UTF8_BOM_BYTES = [0xef, 0xbb, 0xbf];

const pallet = (over: Partial<Pallet> = {}): Pallet => ({
    pallet_id: 'P001',
    status: 'in_use',
    current_location: 'ฝ่ายผลิต',
    // 14:30 and 09:05 local, so the split columns have something to be wrong
    // about -- a UTC-vs-local slip would show up as a different hour.
    last_checkout_date: new Date(2026, 6, 21, 14, 30).toISOString(),
    last_transaction_date: new Date(2026, 6, 22, 9, 5).toISOString(),
    created_at: new Date(2026, 0, 15, 8, 0).toISOString(),
    ...over,
});

const transaction = (over: Partial<Transaction> = {}): Transaction => ({
    id: 'tx-1',
    pallet_id: 'P001',
    user_id: 'user-1',
    action_type: 'check_out',
    department_origin: 'Warehouse',
    department_dest: 'ฝ่ายผลิต',
    evidence_image_url: null,
    timestamp: new Date(2026, 6, 22, 9, 5).toISOString(),
    ...over,
});

/** Splits one CSV line into its cells, unwrapping generateCSV's quoting. */
const cells = (line: string): string[] =>
    (line.match(/"(?:[^"]|"")*"/g) ?? []).map((c) => c.slice(1, -1).replace(/""/g, '"'));

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchUsers).mockResolvedValue([]);
    vi.mocked(fetchTransactions).mockResolvedValue([]);
    vi.mocked(getEvidenceSignedUrlMap).mockResolvedValue({});
});

describe('generateCSV', () => {
    // The bug the committee reported, at its root. Excel on Windows decodes a
    // file with no BOM using the system ANSI codepage, and every Thai character
    // in it arrives as mojibake.
    it('ไฟล์ขึ้นต้นด้วยไบต์ UTF-8 BOM (EF BB BF) เสมอ', async () => {
        const csv = captureCsv();
        generateCSV(['รหัส'], [['P001']], 'test.csv');
        expect(Array.from((await csv.bytes()).slice(0, 3))).toEqual(UTF8_BOM_BYTES);
    });

    it('เครื่องหมายคำพูดในเซลล์ถูก escape ไม่ทำให้จำนวนคอลัมน์เพี้ยน', async () => {
        const csv = captureCsv();
        generateCSV(['a', 'b'], [['เขา"พูด"ว่า', 'x']], 'test.csv');
        const row = (await csv.text()).split('\n')[1];
        expect(cells(row)).toEqual(['เขา"พูด"ว่า', 'x']);
    });

    // ตัวกัน formula injection: ค่าที่ขึ้นต้นด้วย = + - @ ถูกเติม apostrophe นำหน้า
    // เพราะ Excel/Sheets รันมันเป็นสูตร ไม่ใช่แสดงเป็นข้อความ
    it('ค่าที่ขึ้นต้นด้วย = ถูกเติม apostrophe นำหน้า', async () => {
        const csv = captureCsv();
        generateCSV(['a'], [['=cmd|calc']], 'test.csv');
        expect(cells((await csv.text()).split('\n')[1])).toEqual(["'=cmd|calc"]);
    });
});

describe('exportInventoryCSV', () => {
    it('ส่ง pallets เข้ามา = ใช้ชุดนั้น ไม่ดึงใหม่ทั้งตาราง', async () => {
        const csv = captureCsv();
        await exportInventoryCSV([pallet({ pallet_id: 'P007' })]);

        // นี่คือสิ่งที่ทำให้ไฟล์จากหน้าคลังพาเลทตรงกับสิ่งที่เห็นบนจอ: ถ้าดึงใหม่เอง
        // ไฟล์จะกว้างกลับไปเป็นทั้งคลังโดยไม่มีอะไรบอก
        expect(fetchPallets).not.toHaveBeenCalled();
        expect(cells((await csv.text()).split('\n')[1])[0]).toBe('P007');
    });

    it('ไม่ส่ง pallets = ดึงทั้งตารางเอง (พฤติกรรมของหน้าแดชบอร์ด)', async () => {
        vi.mocked(fetchPallets).mockResolvedValue([pallet()]);
        captureCsv();
        await exportInventoryCSV();
        expect(fetchPallets).toHaveBeenCalledOnce();
    });

    it('มี 13 คอลัมน์ และวันที่ถูกแยกออกจากเวลา', async () => {
        const csv = captureCsv();
        await exportInventoryCSV([pallet()]);

        const [headerLine, rowLine] = (await csv.text()).split('\n');
        expect(cells(headerLine)).toHaveLength(13);

        const row = cells(rowLine);
        expect(row).toHaveLength(13);

        // dd/mm/yyyy ไม่ใช่ 15-Jan-2026 ของหน้าจอ -- Excel อ่าน dd/mm/yyyy เป็น
        // "วันที่" จริง คอลัมน์จึงเรียงและกรองตามเดือนได้ ส่วน 15-Jan-2026 เป็น
        // ข้อความ เรียงแล้วได้ Apr มาก่อน Jan
        //
        // วันที่เพิ่ม / เวลาที่เพิ่ม -- 15 ม.ค. 2026 08:00 ตามเวลาเครื่อง
        expect(row[3]).toBe('15/01/2026');
        expect(row[4]).toBe('08:00');
        // เคลื่อนไหวล่าสุด 22 ก.ค. 2026 09:05
        expect(row[5]).toBe('22/07/2026');
        expect(row[6]).toBe('09:05');
        // เบิกล่าสุด 21 ก.ค. 2026 14:30
        expect(row[9]).toBe('21/07/2026');
        expect(row[10]).toBe('14:30');
    });

    // ต้องเป็น "เซลล์ว่างจริง" ไม่ใช่ '-' และไม่ใช่ 01-Jan-1970 00:00
    //
    // สองอย่างที่เทสต์นี้กันคนละเรื่องกัน:
    //  1. `new Date(null)` คือ epoch -- ถ้าไม่กัน พาเลทที่ไม่เคยถูกเบิกออกเลยจะขึ้น
    //     ในรายงานว่าเบิกไปเมื่อ 01-Jan-1970
    //  2. '-' เป็นตัวแทน "ว่าง" ของหน้าจอ ไม่ใช่ของสเปรดชีต และมันตรงกับ
    //     FORMULA_TRIGGER escapeCell จึงเติม apostrophe นำหน้าให้ -- Excel ซ่อน
    //     apostrophe ให้เฉพาะค่าที่พิมพ์ลงเซลล์เอง ไม่ใช่ค่าที่ import มาจาก CSV
    //     เซลล์เหล่านี้จึงขึ้นเป็น '- ให้เห็นจริง ๆ บนหน้าจอ Excel
    it('พาเลทที่ไม่เคยเบิก คอลัมน์วันที่และเวลาเป็นเซลล์ว่าง ไม่ใช่ - และไม่ใช่ปี 1970', async () => {
        const csv = captureCsv();
        await exportInventoryCSV([pallet({ last_checkout_date: null, status: 'available' })]);

        const row = cells((await csv.text()).split('\n')[1]);
        expect(row[9]).toBe('');
        expect(row[10]).toBe('');
    });

    it('พาเลทที่ยังไม่เคยมีรายการเลย ช่องผู้รับผิดชอบและรายการล่าสุดเป็นเซลล์ว่าง', async () => {
        const csv = captureCsv();
        // ไม่มี transaction สักรายการ (fetchTransactions ถูก mock เป็น [] ใน beforeEach)
        await exportInventoryCSV([pallet({ status: 'available', last_transaction_date: null })]);

        const row = cells((await csv.text()).split('\n')[1]);
        // รายการล่าสุด, ผู้รับผิดชอบ
        expect(row[7]).toBe('');
        expect(row[8]).toBe('');
        // และไม่มีเซลล์ไหนในแถวนี้ที่ขึ้นต้นด้วย apostrophe -- ถ้ามี แปลว่ามีค่าไหน
        // สักค่าที่ยังเขียน '-' หรืออักขระ formula-trigger อื่นลงไฟล์อยู่
        expect(row.filter((c) => c.startsWith("'"))).toEqual([]);
    });

    // URL หลักฐานต้องไม่ถูกเติม apostrophe นำหน้า: 'h' ไม่ตรงกับ FORMULA_TRIGGER
    // (/^[=+\-@\t\r]/) จึงผ่าน escapeCell ไปตรง ๆ -- นี่คือเหตุผลที่คอลัมน์นี้ใส่ URL
    // ดิบแทน =HYPERLINK() ซึ่งจะต้องเจาะรูตัวกัน formula injection
    it('URL หลักฐานลงไฟล์เป็น URL เปิดได้จริง ไม่ถูกเติม apostrophe', async () => {
        vi.mocked(fetchTransactions).mockResolvedValue([
            transaction({ action_type: 'report_damage', evidence_image_url: 'damage-1.jpg' }),
        ]);
        vi.mocked(getEvidenceSignedUrlMap).mockResolvedValue({
            'damage-1.jpg': 'https://example.supabase.co/storage/v1/object/sign/damage-1.jpg?token=abc',
        });

        const csv = captureCsv();
        await exportInventoryCSV([pallet()]);

        const row = cells((await csv.text()).split('\n')[1]);
        expect(row[12]).toBe('https://example.supabase.co/storage/v1/object/sign/damage-1.jpg?token=abc');
        expect(row[12].startsWith("'")).toBe(false);
    });

    it('เซ็นลิงก์ด้วยอายุ 7 วัน ไม่ใช่ 1 ชั่วโมงที่หน้าจอใช้', async () => {
        captureCsv();
        await exportInventoryCSV([pallet()]);

        expect(getEvidenceSignedUrlMap).toHaveBeenCalledWith(expect.anything(), 60 * 60 * 24 * 7);
    });

    it('พาเลทที่ไม่มีหลักฐาน คอลัมน์ลิงก์เป็นเซลล์ว่าง ไม่ใช่ -', async () => {
        const csv = captureCsv();
        await exportInventoryCSV([pallet()]);

        expect(cells((await csv.text()).split('\n')[1])[12]).toBe('');
    });

    // สองไฟล์ต้องเขียนวันที่รูปแบบเดียวกัน มิฉะนั้นการเอาไฟล์คลังพาเลทไป VLOOKUP
    // กับไฟล์ประวัติต้องมานั่งแปลงรูปแบบก่อน
    it('รูปแบบวันที่ตรงกับไฟล์ประวัติรายการ', async () => {
        vi.mocked(fetchTransactions).mockResolvedValue([transaction()]);

        const inventoryCsv = captureCsv();
        await exportInventoryCSV([pallet()]);
        const inventoryDate = cells((await inventoryCsv.text()).split('\n')[1])[5];

        const historyCsv = captureCsv();
        await exportHistoryCSV([transaction()]);
        const historyDate = cells((await historyCsv.text()).split('\n')[1])[0];

        // ทั้งคู่มาจาก transaction ดวงเดียวกัน (22 ก.ค. 2026 09:05)
        expect(inventoryDate).toBe('22/07/2026');
        expect(historyDate).toBe('22/07/2026');
    });

    // บั๊กที่กรรมการเห็น: ไฟล์จากหน้าคลังพาเลทเปิดใน Excel แล้วภาษาไทยเพี้ยน
    // ต้นเหตุคือโค้ดชุดเก่าประกอบ data: URI เอง ซึ่งไม่มี BOM ตอนนี้ทุกทางเดินผ่าน
    // generateCSV ทางเดียว จึงได้ BOM มาด้วยเสมอ
    it('ไฟล์จากหน้าคลังพาเลทมี BOM และภาษาไทยลงไฟล์ครบ', async () => {
        const csv = captureCsv();
        await exportInventoryCSV([pallet()]);

        expect(Array.from((await csv.bytes()).slice(0, 3))).toEqual(UTF8_BOM_BYTES);
        // ชื่อสถานที่ภาษาไทยลงไฟล์ครบ ไม่ถูกแปลงเป็นอย่างอื่นระหว่างทาง
        expect(await csv.text()).toContain('ฝ่ายผลิต');
    });
});

describe('exportHistoryCSV', () => {
    it('ส่ง transactions เข้ามา = ใช้ชุดนั้น ไม่ดึงประวัติทั้งหมดใหม่', async () => {
        const csv = captureCsv();
        await exportHistoryCSV([transaction({ pallet_id: 'P077' })]);

        expect(fetchTransactions).not.toHaveBeenCalled();
        expect(cells((await csv.text()).split('\n')[1])[2]).toBe('P077');
    });

    it('ไม่ส่ง transactions = ดึงประวัติทั้งหมดเอง (พฤติกรรมของหน้าแดชบอร์ด)', async () => {
        vi.mocked(fetchTransactions).mockResolvedValue([transaction()]);
        captureCsv();
        await exportHistoryCSV();
        expect(fetchTransactions).toHaveBeenCalledOnce();
    });

    // อาการที่รายงานมา: คอลัมน์ไฟล์หลักฐานเป็นชื่อรูป ซึ่ง bucket เป็น private
    // สตริงนั้นจึงเปิดอะไรไม่ได้เลย -- ดูเหมือนข้อมูลแต่เป็นทางตัน
    it('คอลัมน์หลักฐานเป็น URL เปิดได้จริง ไม่ใช่ชื่อไฟล์', async () => {
        vi.mocked(getEvidenceSignedUrlMap).mockResolvedValue({
            'damage-1.jpg': 'https://example.supabase.co/storage/v1/object/sign/damage-1.jpg?token=abc',
        });

        const csv = captureCsv();
        await exportHistoryCSV([
            transaction({ action_type: 'report_damage', evidence_image_url: 'damage-1.jpg' }),
        ]);

        const row = cells((await csv.text()).split('\n')[1]);
        expect(row[7]).toBe('https://example.supabase.co/storage/v1/object/sign/damage-1.jpg?token=abc');
        expect(getEvidenceSignedUrlMap).toHaveBeenCalledWith(expect.anything(), 60 * 60 * 24 * 7);
    });

    // คอลัมน์นี้เคยมีอยู่เฉพาะในตัวส่งออกของหน้าประวัติรายการ ตอนรวมสองตัวเข้าด้วยกัน
    // มันต้องไม่หายไปเงียบ ๆ
    it('คอลัมน์หมายเหตุยังอยู่ครบหลังรวมสองตัวส่งออกเข้าด้วยกัน', async () => {
        const csv = captureCsv();
        await exportHistoryCSV([transaction({ transaction_remark: 'ล้อแตกหนึ่งข้าง' })]);

        const [headerLine, rowLine] = (await csv.text()).split('\n');
        expect(cells(headerLine)).toHaveLength(8);
        expect(cells(rowLine)[6]).toBe('ล้อแตกหนึ่งข้าง');
    });

    it('แยกคอลัมน์วันที่กับเวลาออกจากกัน ไม่ใช่เซลล์รวม', async () => {
        const csv = captureCsv();
        await exportHistoryCSV([transaction()]);

        const row = cells((await csv.text()).split('\n')[1]);
        expect(row[0]).toBe('22/07/2026');
        expect(row[1]).toBe('09:05');
    });
});
