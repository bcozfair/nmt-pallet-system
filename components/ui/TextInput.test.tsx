import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextInput } from './TextInput';

// ช่องกรอกแบบ controlled ตัวจริง -- ไม่ใช่ spy ที่รับ onChange เฉย ๆ
// สิ่งที่กำลังทดสอบคือ "ค่าที่ state ปลายทางเก็บได้" ซึ่งเป็นค่าที่ถูกส่งไปค้น
// ฐานข้อมูลจริง การจับแค่ event จึงตอบไม่ได้ว่าปลายทางเก็บอะไรไว้
const Controlled = ({ uppercase = false, initial = '' }: { uppercase?: boolean; initial?: string }) => {
    const [value, setValue] = useState(initial);
    return (
        <>
            <TextInput
                aria-label="รหัส"
                uppercase={uppercase}
                value={value}
                onChange={(e) => setValue(e.target.value)}
            />
            <output>{value}</output>
        </>
    );
};

describe('TextInput', () => {
    // บักที่ทำให้ "แจ้งชำรุดด้วยการพิมพ์รหัสพาเลท" ใช้ไม่ได้: คลาส uppercase ของ
    // Tailwind แปลงแค่ภาพ ค่าที่ส่งออกไปยังเป็นตัวเล็ก แล้ว pallet_id ที่เป็น
    // text primary key ก็ค้นไม่เจอ
    it('uppercase แปลงค่าที่ส่งออก ไม่ใช่แค่ที่แสดง', async () => {
        const user = userEvent.setup();
        render(<Controlled uppercase />);

        await user.type(screen.getByLabelText('รหัส'), 'p024');

        expect((screen.getByLabelText('รหัส') as HTMLInputElement).value).toBe('P024');
        expect(screen.getByRole('status').textContent).toBe('P024');
    });

    it('ไม่ใส่ uppercase แล้วค่าต้องผ่านไปตามที่พิมพ์ทุกตัวอักษร', async () => {
        const user = userEvent.setup();
        render(<Controlled />);

        // โทเคน LINE กับอีเมลผ่านช่องเดียวกันนี้ และแยกตัวพิมพ์
        await user.type(screen.getByLabelText('รหัส'), 'Ab1cD');

        expect(screen.getByRole('status').textContent).toBe('Ab1cD');
    });

    it('เคอร์เซอร์อยู่ที่เดิมเมื่อแก้ตัวอักษรกลางรหัส', async () => {
        const user = userEvent.setup();
        render(<Controlled uppercase initial="P01" />);
        const input = screen.getByLabelText('รหัส') as HTMLInputElement;

        input.setSelectionRange(1, 1);
        await user.type(input, 'x', { initialSelectionStart: 1, initialSelectionEnd: 1 });

        expect(input.value).toBe('PX01');
        expect(input.selectionStart).toBe(2);
    });

    it('mono ให้ฟอนต์โมโนโดยไม่ลากคลาส uppercase ตามมาด้วย', () => {
        render(<TextInput aria-label="โทเคน" mono readOnly value="" />);
        const className = screen.getByLabelText('โทเคน').className;

        expect(className).toContain('font-mono');
        expect(className.split(/\s+/)).not.toContain('uppercase');
    });

    it('uppercase สั่งคีย์บอร์ดมือถือให้ขึ้นแป้นตัวใหญ่ด้วย', () => {
        render(<TextInput aria-label="รหัส" uppercase readOnly value="" />);

        expect(screen.getByLabelText('รหัส').getAttribute('autocapitalize')).toBe('characters');
    });
});
