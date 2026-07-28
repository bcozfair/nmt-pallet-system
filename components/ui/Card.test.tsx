import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Card } from './Card';

// jsdom ไม่จัดหน้า จึงพิสูจน์ "ถูกตัดจริงไหม" ด้วย DOM ไม่ได้ -- เทสต์ชุดนี้จึงยึด
// สัญญาที่เป็นต้นเหตุแทน: overflow-hidden มีอยู่เพื่อกันเส้น hairline สูง 3px ไม่ให้
// โผล่พ้นมุมมน (Card.tsx) ถ้าการ์ดไม่มี hairline ก็ไม่มีอะไรให้ตัด
//
// นี่เป็นเทสต์กันการถอยหลัง ไม่ใช่เทสต์ของการจัดหน้า: ตอนที่คลิปตัวนี้ถูกทาไว้กับ
// การ์ดทุกใบโดยไม่มีเงื่อนไข เมนูที่กางลงจากแถวล่างสุดของการ์ดตั้งค่าถูกตัดหายไป
// ครึ่งพาเนล และข้อจำกัดนั้นถูกบันทึกไว้ที่ RangeMenu.tsx:41-49 ว่าเป็นกฎของทั้งแอป
// ทั้งที่จริงมันเป็นกฎของการ์ดที่มี accent เท่านั้น
describe('Card -- ขอบเขตของ overflow-hidden', () => {
    it('การ์ดธรรมดาไม่ตัดสิ่งที่ล้นออกนอกกล่อง', () => {
        const { container } = render(<Card>เนื้อหา</Card>);
        expect(container.firstElementChild?.className).not.toContain('overflow-hidden');
    });

    it('การ์ดที่มี accent ตัด เพราะมีเส้น hairline ให้ตัด', () => {
        const { container } = render(<Card accent>เนื้อหา</Card>);
        expect(container.firstElementChild?.className).toContain('overflow-hidden');
    });

    it('tone="danger" สลับสีพื้นผิวทั้งก้อน ไม่ได้ต่อท้ายสีเดิม', () => {
        const { container } = render(<Card tone="danger">เนื้อหา</Card>);
        const className = container.firstElementChild?.className ?? '';
        expect(className).toContain('border-red-200');
        // สองคลาสที่ตั้งค่าเดียวกันบน element เดียวตัดสินผู้ชนะที่ลำดับใน CSS ที่
        // build ออกมา ไม่ใช่ลำดับในสตริง การมีสีขอบเดิมค้างอยู่ด้วยจึงไม่ใช่แค่
        // รกตา แต่แปลว่าผลลัพธ์ขึ้นกับสิ่งที่ไฟล์นี้มองไม่เห็น
        expect(className).not.toContain('border-slate-200/80');
    });
});
