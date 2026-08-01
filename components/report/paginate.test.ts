import { describe, expect, it } from 'vitest';
import { chunkPages } from './paginate';
import { appendixBodyMm, tableCapacity } from './ReportTableDocument';
import { bodyHeightMm, pageBoxMm } from './ReportPage';

// รายงานตารางตัดหน้าเองก่อนเรนเดอร์แถวแรก ไม่ได้ปล่อยให้เอนจินเดา
//
// เลขชุดนี้พังแบบ "เงียบ" ที่สุดในทั้งงาน: บนจอไม่มีอาการอะไรเลย ต้องสั่งพิมพ์
// แล้วนับกระดาษถึงจะรู้ และถ้าใส่แถวเกินไปหนึ่งแถว แถวสุดท้ายของ *ทุกหน้า* จะถูก
// `.report-page { overflow: hidden }` ตัดหายไปโดยไม่มีอะไรบอก
//
// jsdom จัดหน้ากระดาษไม่ได้ จึงพิสูจน์ "พิมพ์แล้วสวยไหม" ไม่ได้ -- เทสต์ชุดนี้ยึด
// สัญญาที่เป็นต้นเหตุแทน คือเลขความจุต้องอยู่ในพื้นที่ที่มีจริง และการแบ่งก้อนต้อง
// ไม่ทำแถวหาย

describe('chunkPages -- แบ่งรายการเป็นหน้า โดยหน้าแรกจุน้อยกว่า', () => {
    it('หน้าแรกใช้ความจุของตัวเอง หน้าถัดไปใช้อีกค่าหนึ่ง', () => {
        const pages = chunkPages([1, 2, 3, 4, 5, 6, 7, 8], 3, 2);

        expect(pages).toEqual([[1, 2, 3], [4, 5], [6, 7], [8]]);
    });

    // ข้อนี้คือเหตุผลทั้งหมดที่ฟังก์ชันนี้รับความจุสองค่า -- ถ้าใช้ค่าเดียว
    // หน้าแรกจะล้น (แถวหาย) หรือหน้าหลัง ๆ จะโล่งไปหนึ่งในสี่ทุกใบ
    it('ไม่ทำแถวหายและไม่ทำแถวซ้ำ ไม่ว่าจำนวนแถวจะลงตัวกับความจุหรือไม่', () => {
        for (const count of [1, 5, 45, 46, 95, 96, 500]) {
            const rows = Array.from({ length: count }, (_, i) => i);
            const flat = chunkPages(rows, 45, 50).flat();

            expect(flat).toEqual(rows);
        }
    });

    // รายงานที่ไม่พิมพ์อะไรเลย แยกไม่ออกจากรายงานที่พังระหว่างสร้าง
    it('รายการว่างยังได้กระดาษหนึ่งแผ่น ไว้บอกว่าไม่พบข้อมูล', () => {
        expect(chunkPages([], 45, 50)).toEqual([[]]);
    });

    // ความจุมาจาก "ความสูงหน้า หารด้วย ความสูงแถว" ถ้าใครคำนวณพลาดจนได้ 0
    // ลูปข้างในจะวนไม่รู้จบ -- แท็บค้างเป็นวิธีรู้ตัวที่แย่กว่ารายงานหน้าละแถวมาก
    it('ความจุ 0 หรือติดลบถูกดันขึ้นเป็น 1 แทนที่จะวนไม่รู้จบ', () => {
        expect(chunkPages([1, 2, 3], 0, -5)).toEqual([[1], [2], [3]]);
    });
});

describe('tableCapacity -- จำนวนแถวต่อหน้าต้องอยู่ในกระดาษจริง', () => {
    // นี่คือเทสต์ที่กันไม่ให้ใครขยาย masthead หรือความสูงแถวจนแถวสุดท้ายโดนตัด
    // โดยไม่รู้ตัว: ความสูงที่แถวทั้งหมดกินรวมกัน บวกหัวตาราง ต้องไม่เกินพื้นที่
    // ที่ ReportPage เหลือให้จริง ๆ
    it.each(['portrait', 'landscape'] as const)('แถวทั้งหมดของหน้าอยู่ในพื้นที่ body ได้จริง (%s)', (orientation) => {
        const { first, rest } = tableCapacity(orientation);
        const ROW_MM = 5;
        const HEAD_ROW_MM = 6;
        const MASTHEAD_MM = 30;

        expect(first).toBeGreaterThan(0);
        expect(first * ROW_MM + HEAD_ROW_MM).toBeLessThanOrEqual(
            bodyHeightMm(orientation, MASTHEAD_MM),
        );
        expect(rest * ROW_MM + HEAD_ROW_MM).toBeLessThanOrEqual(bodyHeightMm(orientation));
    });

    // หน้าแรกต้องจุน้อยกว่าเสมอ เพราะเสีย masthead ไป ถ้าวันไหนเท่ากันหรือมากกว่า
    // แปลว่ามีคนถอด masthead ออกแล้วลืมเลิกแบ่งความจุสองค่า
    it.each(['portrait', 'landscape'] as const)('หน้าแรกจุน้อยกว่าหน้าถัดไป (%s)', (orientation) => {
        const { first, rest } = tableCapacity(orientation);

        expect(first).toBeLessThan(rest);
    });

    // แนวตั้งสูงกว่าแนวนอน จึงต้องจุแถวได้มากกว่า -- ถ้ากลับกันแปลว่ามีที่ไหน
    // สลับด้านกว้าง/ยาวของ A4
    it('แนวตั้งจุแถวได้มากกว่าแนวนอน', () => {
        expect(tableCapacity('portrait').rest).toBeGreaterThan(tableCapacity('landscape').rest);
    });
});

describe('appendixBodyMm -- หน้าภาคผนวกใช้พื้นที่ของหน้าจริง', () => {
    it('ไม่เกินความสูงกระดาษ และเหลือที่ให้หัวกับท้ายหน้า', () => {
        for (const orientation of ['portrait', 'landscape'] as const) {
            const body = appendixBodyMm(orientation);

            expect(body).toBeGreaterThan(0);
            expect(body).toBeLessThan(pageBoxMm(orientation).heightMm);
        }
    });
});
