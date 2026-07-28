import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { StickyHeader, nextStuck } from './StickyHeader';

afterEach(() => {
    vi.restoreAllMocks();
});

// รอให้ callback ที่ component คิวไว้ด้วย requestAnimationFrame ได้รันก่อน -- ของเรา
// ถูกคิวทีหลัง จึงรันทีหลังเสมอ ไม่ใช่การเดาเวลา
const flushFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

// คุมค่า top ที่ component จะวัดได้ jsdom ไม่จัดหน้าจึงคืน 0 ทุกช่องเสมอถ้าไม่คุม
const stubRect = (read: () => number) =>
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
        () => ({ top: read(), height: 200 }) as DOMRect,
    );

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

    // เกณฑ์เข้ากับเกณฑ์ออกต้องไม่ใช่ค่าเดียวกัน ของเดิมใช้ `top <= 0` ทั้งสองทาง
    // ค่าที่วัดได้จึงแกว่งข้ามเส้นกลับไปกลับมาตรงจุดเกาะพอดี แล้วพื้นหลังก็กะพริบ
    describe('nextStuck', () => {
        it('ยังไม่เกาะ: ต้องถึง 0 จริง ๆ ถึงจะเกาะ ใกล้แล้วยังไม่นับ', () => {
            expect(nextStuck(8, false)).toBe(false);
            expect(nextStuck(2, false)).toBe(false);
            expect(nextStuck(0, false)).toBe(true);
            expect(nextStuck(-30, false)).toBe(true);
        });

        it('เกาะอยู่: ค่าแกว่งขึ้นมาเป็นทศนิยมต้องไม่หลุด (จอ scale 125%, แทร็คแพด)', () => {
            expect(nextStuck(0.4, true)).toBe(true);
            expect(nextStuck(3.9, true)).toBe(true);
        });

        it('เกาะอยู่: หลุดเมื่อถอยขึ้นไปพ้นระยะกันแกว่งแล้วเท่านั้น', () => {
            expect(nextStuck(4, true)).toBe(false);
            expect(nextStuck(8, true)).toBe(false);
        });

        // ถ้าเกณฑ์ปล่อยไปอยู่ที่ 8 ขึ้นไป มันจะไปไม่ถึง เพราะ 8px คือระยะทั้งหมดที่
        // แถบนี้เลื่อนได้ก่อนเกาะ (main lg:p-8 = 32px ลบ -mt-6 = 24px) แถบก็จะติด
        // พื้นหลังค้างไว้ตลอดกาลตั้งแต่เกาะครั้งแรก
        it('เกณฑ์ปล่อยต้องยังอยู่ในระยะ 8px ที่แถบเลื่อนได้จริงก่อนเกาะ', () => {
            expect(nextStuck(8, true)).toBe(false);
        });
    });

    // อาการที่เทสต์นี้กัน: ของเดิมเก็บ "เกาะอยู่หรือยัง" ไว้ใน useState คลาสใหม่จึง
    // ถึงจอช้ากว่าตอนที่ element เกาะจริงอย่างน้อยหนึ่งเฟรม -- ซึ่งเป็นเฟรมที่พื้นหลัง
    // ยังใสอยู่พอดีตอนแถวข้อมูลวิ่งขึ้นมาข้างหลัง ตอนนี้เขียนลง DOM ในเฟรมเดียวกับ
    // ที่วัดเลย เทสต์จึงอ่าน attribute ได้ทันทีโดยไม่ต้องผ่าน act()
    it('สลับ data-stuck ในเฟรมเดียวกับที่วัด และกันการแกว่งตรงจุดเกาะ', async () => {
        let top = 8;
        stubRect(() => top);

        const { container } = render(<StickyHeader>เนื้อหา</StickyHeader>);
        const el = container.firstElementChild as HTMLElement;

        // ยังไม่เลื่อน: ต้องมี attribute อยู่แล้ว ไม่ใช่ไม่มีเลย -- ชุดคลาสฝั่ง false
        // เลือกด้วย [data-stuck="false"] ถ้าไม่มี attribute ก็ไม่มีชุดไหนถูกเลือก
        expect(el.dataset.stuck).toBe('false');

        top = 0;
        window.dispatchEvent(new Event('scroll'));
        await flushFrame();
        expect(el.dataset.stuck).toBe('true');

        top = 0.4;
        window.dispatchEvent(new Event('scroll'));
        await flushFrame();
        expect(el.dataset.stuck).toBe('true');

        top = 8;
        window.dispatchEvent(new Event('scroll'));
        await flushFrame();
        expect(el.dataset.stuck).toBe('false');
    });

    // พื้นหลังกับเงาต้องมาถึงพร้อมกัน ของเดิมมี transition-shadow 200ms อยู่กับเงา
    // อย่างเดียว พื้นหลังสลับทันที เห็นเป็นรอยต่อ และจะแก้ด้วยการใส่ transition ให้
    // พื้นหลังด้วยไม่ได้ เพราะระหว่างเฟดมันยังโปร่ง = อาการเดิมที่ยืดออกไป 200ms
    it('ไม่มี transition บนพื้นหลังหรือเงา ทั้งสองอย่างต้องมาถึงพร้อมกัน', () => {
        const { container } = render(<StickyHeader>x</StickyHeader>);
        const el = container.firstElementChild!;
        expect(el.className).not.toContain('transition');
    });

    it('ถือชุดคลาสเต็มทั้งสองฝั่งไว้พร้อมกัน แล้วให้ selector เป็นตัวเลือก', () => {
        const { container } = render(<StickyHeader>x</StickyHeader>);
        const el = container.firstElementChild!;
        expect(el.className).toContain('xl:data-[stuck=true]:before:bg-slate-50');
        expect(el.className).toContain('xl:data-[stuck=false]:before:bg-transparent');
    });

    // อาการที่เทสต์นี้กัน: พื้นหลังเคยอยู่บนตัว element จึงกว้างเท่าคอลัมน์เนื้อหาพอดี
    // เหลือช่องว่าง 32px จาก main's lg:p-8 เปิดไว้สองข้างให้เห็นไล่สีของ .app-canvas
    // ซึ่งอมฟ้ากว่า -- แถบเลยดูเป็นสี่เหลี่ยมเทาแปะอยู่ มีรอยต่อแนวตั้งวิ่งลงมา
    it('พื้นหลังและเงาอยู่บน ::before ที่กินเต็มความกว้าง ไม่ใช่บนตัว element', () => {
        const { container } = render(<StickyHeader>x</StickyHeader>);
        const el = container.firstElementChild!;

        expect(el.className).toContain('xl:before:-left-[100vw]');
        expect(el.className).toContain('xl:before:-right-[100vw]');

        // เงาต้องย้ายตามพื้นหลังไปด้วย ไม่งั้นขอบล่างจะจบตรงขอบคอลัมน์ทั้งที่พื้นหลัง
        // กินเต็มจอ -- เส้นขอบล่างขาดหายไปสองข้าง
        expect(el.className).toContain('xl:data-[stuck=true]:before:shadow-[');

        // และต้องไม่เหลือคู่เดิมที่ทาลงบนตัว element ค้างอยู่ ไม่งั้นจะได้พื้นสองชั้น
        // ชั้นในกว้างเท่าคอลัมน์ ซึ่งคือรอยต่อเดิมกลับมาอีกครั้ง
        expect(el.className).not.toContain('xl:data-[stuck=true]:bg-slate-50');
    });

    it('ส่ง className ที่รับมาลงไปพร้อมกับคลาสของตัวเอง', () => {
        const { container } = render(<StickyHeader className="flex flex-col gap-4">x</StickyHeader>);
        const el = container.firstElementChild!;
        expect(el.className).toContain('flex flex-col gap-4');
        expect(el.className).toContain('xl:sticky');
    });
});
