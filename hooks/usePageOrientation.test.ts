import { beforeEach, describe, expect, it } from 'vitest';
import {
    PAGE_MARGIN_MM,
    getPageOrientation,
    printableWidthPx,
    setPageOrientation,
} from './usePageOrientation';

// jsdom ไม่จัดหน้ากระดาษ จึงพิสูจน์ "พิมพ์ออกมาแล้วสวยไหม" ด้วย DOM ไม่ได้ --
// เทสต์ชุดนี้จึงยึดสัญญาที่เป็นต้นเหตุแทน
//
// การพิมพ์รายงานหนึ่งครั้งต้องมีสามอย่างพูดตรงกันว่ากระดาษวางแนวไหน:
//
//   1. กฎ `@page`            -- ตัดสินว่ากระดาษใบจริงกว้างเท่าไหร่
//   2. printableWidthPx()    -- ตัดสินว่า Recharts จะ lay out กราฟที่กี่พิกเซล
//                               (hooks/dashboard/usePrintLayout.ts)
//   3. data-print-orientation -- ตัดสินว่ากริดจะแตกเป็นกี่คอลัมน์บนกระดาษ
//                               (กฎ .print-paper-grid ใน index.css)
//
// สองในสามตรงกันแล้วอีกอันไม่ตรง คือบั๊กที่ไม่มีอาการบนหน้าจอเลย: preview จะโชว์
// กราฟล้นขอบขวาหรือการ์ดบีบจนอ่านไม่ออก โดยไม่มีอะไรเตือน ทั้งสามจึงถูกเขียนจาก
// setPageOrientation() ตัวเดียว และนี่คือเทสต์ที่กันไม่ให้แยกกันได้อีก
describe('setPageOrientation -- @page กับ data-print-orientation ต้องพูดตรงกัน', () => {
    beforeEach(() => {
        // ตั้งกลับเป็นค่าเริ่มต้นที่ index.css ship ไป โมดูลเก็บ orientation ไว้ที่
        // ระดับโมดูล (มีกระดาษได้ใบเดียวต่อเอกสาร) จึงข้ามเทสต์กันได้ถ้าไม่รีเซ็ต
        setPageOrientation('landscape');
    });

    it('เขียนทั้งกฎ @page และ attribute บน <html> ด้วยค่าเดียวกัน', () => {
        setPageOrientation('portrait');

        const style = document.getElementById('nmt-page-orientation');
        expect(style?.textContent).toContain('size: A4 portrait');
        expect(document.documentElement.dataset.printOrientation).toBe('portrait');
        expect(getPageOrientation()).toBe('portrait');
    });

    it('สลับกลับมาแนวนอนแล้วทั้งสองอย่างตามมาด้วย ไม่ค้างค่าเดิม', () => {
        setPageOrientation('portrait');
        setPageOrientation('landscape');

        const style = document.getElementById('nmt-page-orientation');
        expect(style?.textContent).toContain('size: A4 landscape');
        expect(style?.textContent).not.toContain('portrait');
        expect(document.documentElement.dataset.printOrientation).toBe('landscape');
    });

    it('ใช้ <style> ตัวเดิมซ้ำ ไม่งอกใบใหม่ทุกครั้งที่สั่งพิมพ์', () => {
        // ถ้างอกใบใหม่ จะมี `size:` ที่ขัดกันหลายอันโดยใบท้ายสุดชนะเงียบ ๆ
        setPageOrientation('portrait');
        setPageOrientation('landscape');
        setPageOrientation('portrait');

        expect(document.querySelectorAll('#nmt-page-orientation')).toHaveLength(1);
    });

    it('ระยะขอบใน @page คือค่าเดียวกับที่ printableWidthPx คำนวณจาก', () => {
        setPageOrientation('portrait');

        const style = document.getElementById('nmt-page-orientation');
        expect(style?.textContent).toContain(`margin: ${PAGE_MARGIN_MM}mm`);

        // A4 แนวตั้งกว้าง 210mm หักขอบสองข้าง แล้วแปลงเป็น CSS pixel (96 ต่อนิ้ว)
        // เขียนสูตรซ้ำที่นี่โดยตั้งใจ: ถ้าใครไปแก้ค่าคงที่ในไฟล์ต้นทางให้กราฟ
        // "พอดีขึ้น" โดยไม่แก้ `@page` ตามด้วย เทสต์นี้จะดัง
        expect(printableWidthPx('portrait')).toBe(
            Math.round(((210 - PAGE_MARGIN_MM * 2) / 25.4) * 96),
        );
        expect(printableWidthPx('landscape')).toBe(
            Math.round(((297 - PAGE_MARGIN_MM * 2) / 25.4) * 96),
        );
        // แนวตั้งต้องแคบกว่าแนวนอนเสมอ -- นี่คือทั้งหมดที่กฎ .print-paper-grid
        // ใน index.css ตั้งอยู่บน: กระดาษแคบกว่าจึงรับได้น้อยคอลัมน์กว่า
        expect(printableWidthPx('portrait')).toBeLessThan(printableWidthPx('landscape'));
    });
});
