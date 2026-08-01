import { beforeEach, describe, expect, it } from 'vitest';
import {
    A4_LONG_MM,
    A4_SHORT_MM,
    PAGE_MARGIN_MM,
    getPageOrientation,
    printableAreaMm,
    setPageOrientation,
} from './usePageOrientation';
import { PAGE_HEIGHT_MM, PAGE_WIDTH_MM, pageBoxMm } from '../components/report/ReportPage';

// jsdom ไม่จัดหน้ากระดาษ จึงพิสูจน์ "พิมพ์ออกมาแล้วสวยไหม" ด้วย DOM ไม่ได้ --
// เทสต์ชุดนี้จึงยึดสัญญาที่เป็นต้นเหตุแทน
//
// การพิมพ์รายงานหนึ่งครั้งต้องมีสองอย่างพูดตรงกันเรื่องขนาดกระดาษ:
//
//   1. กฎ `@page`         -- ตัดสินว่ากระดาษใบจริงใหญ่แค่ไหน
//   2. printableAreaMm()  -- ตัดสินว่ากล่องหน้ารายงานสูง/กว้างเท่าไหร่
//                            (components/report/ReportPage.tsx)
//
// สองอันนี้ไม่ตรงกันคือบั๊กที่ไม่มีอาการบนหน้าจอเลย: กล่องหน้าที่สูงเกินพื้นที่พิมพ์
// แม้แต่นิดเดียวจะดันกระดาษเปล่าออกมาต่อท้ายทุกแผ่น (4 หน้ากลายเป็น 8) ส่วนที่เตี้ย
// เกินไปมากก็เสียเนื้อที่ทุกแผ่น ทั้งคู่คำนวณจาก PAGE_MARGIN_MM ตัวเดียว และนี่คือ
// เทสต์ที่กันไม่ให้แยกกันได้อีก
//
// `data-print-orientation` บน <html> เคยเป็นอันที่สาม -- มันบอกกฎ .print-paper-grid
// ว่ากริดควรแตกกี่คอลัมน์บนกระดาษ ทั้งกฎนั้นและ hooks/dashboard/usePrintLayout.ts
// ถูกถอดออกไปพร้อมกับความพยายามพิมพ์หน้า dashboard ตรง ๆ แล้ว
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

    it('ระยะขอบใน @page คือค่าเดียวกับที่พื้นที่พิมพ์คำนวณจาก', () => {
        setPageOrientation('portrait');

        const style = document.getElementById('nmt-page-orientation');
        expect(style?.textContent).toContain(`margin: ${PAGE_MARGIN_MM}mm`);

        // เขียนสูตรซ้ำที่นี่โดยตั้งใจ: ถ้าใครไปแก้ค่าคงที่ในไฟล์ต้นทางให้รายงาน
        // "พอดีขึ้น" โดยไม่แก้ `@page` ตามด้วย เทสต์นี้จะดัง
        expect(printableAreaMm('portrait')).toEqual({
            widthMm: A4_SHORT_MM - PAGE_MARGIN_MM * 2,
            heightMm: A4_LONG_MM - PAGE_MARGIN_MM * 2,
        });
        expect(printableAreaMm('landscape')).toEqual({
            widthMm: A4_LONG_MM - PAGE_MARGIN_MM * 2,
            heightMm: A4_SHORT_MM - PAGE_MARGIN_MM * 2,
        });
    });

    // หน้ารายงานคือกล่องขนาดคงที่ที่ต้องพอดีกับพื้นที่พิมพ์ของ @page เป๊ะ ๆ
    // สูงเกินไปแม้แต่นิดเดียว = กระดาษเปล่าต่อท้ายทุกแผ่น (4 หน้ากลายเป็น 8)
    // ส่วนเตี้ยเกินไปมาก = เสียเนื้อที่ทุกแผ่น เทสต์นี้ล็อกทั้งสองฝั่ง
    it('หน้ารายงานพอดีกับพื้นที่พิมพ์ ไม่ล้นและไม่เหลือเกินหนึ่งมิลลิเมตร', () => {
        const area = printableAreaMm('portrait');

        expect(PAGE_WIDTH_MM).toBe(area.widthMm);
        // เตี้ยกว่าพื้นที่พิมพ์ 1mm พอดี -- เผื่อไว้ให้การปัดเศษ mm -> px
        expect(PAGE_HEIGHT_MM).toBe(area.heightMm - 1);
        expect(PAGE_HEIGHT_MM).toBeLessThan(area.heightMm);
    });

    // รายงานทุกฉบับเป็นแนวตั้ง แต่ `@page` ที่ index.css ship ไปยังเป็นแนวนอน
    // (ไว้ให้ Ctrl+P เปล่า ๆ) ดังนั้นเลขของ *ทั้งสองแนว* ยังต้องถูกต้องอยู่ --
    // กฎเดียวกันนี้คือสิ่งที่ useReportPrint คืนค่ากลับหลังพิมพ์เสร็จ
    it('กล่องหน้าพอดีกับพื้นที่พิมพ์ทั้งสองแนว', () => {
        for (const orientation of ['portrait', 'landscape'] as const) {
            const area = printableAreaMm(orientation);
            const box = pageBoxMm(orientation);

            expect(box.widthMm).toBe(area.widthMm);
            expect(box.heightMm).toBe(area.heightMm - 1);
        }
    });
});
