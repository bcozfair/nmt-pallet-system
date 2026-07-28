import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { StickyHeader } from './StickyHeader';

// jsdom ไม่จัดหน้า getBoundingClientRect จึงคืน 0 เสมอ และไม่มี ResizeObserver
// ให้ observe -- ตัวเลขที่ได้จึงไม่มีความหมาย ที่ทดสอบได้จริงคือ "สัญญา" ของ
// component: ประกาศตัวแปรไว้ที่ <html> ตอน mount และถอดออกตอน unmount
// ความสูงจริงวัดในเบราว์เซอร์จริงต่างหาก
describe('StickyHeader', () => {
    it('ประกาศ --sticky-head-h ไว้ที่ <html> ตอน mount', () => {
        render(<StickyHeader>เนื้อหา</StickyHeader>);
        expect(document.documentElement.style.getPropertyValue('--sticky-head-h')).toMatch(/px$/);
    });

    // ถ้าไม่ถอดออก หน้าอื่นที่ไม่มีหัวเกาะจะได้ค่าค้างจากหน้านี้ไป แล้วหัวตาราง
    // ของหน้านั้นจะไปเกาะต่ำกว่ายอดจอเท่าความสูงของหัวเพจหน้าคลังพาเลท
    it('ถอด --sticky-head-h ออกตอน unmount', () => {
        const { unmount } = render(<StickyHeader>เนื้อหา</StickyHeader>);
        unmount();
        expect(document.documentElement.style.getPropertyValue('--sticky-head-h')).toBe('');
    });

    it('ส่ง className ที่รับมาลงไปพร้อมกับคลาสของตัวเอง', () => {
        const { container } = render(<StickyHeader className="flex flex-col gap-4">x</StickyHeader>);
        const el = container.firstElementChild!;
        expect(el.className).toContain('flex flex-col gap-4');
        expect(el.className).toContain('xl:sticky');
    });
});
