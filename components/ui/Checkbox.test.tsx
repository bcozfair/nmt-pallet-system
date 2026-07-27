import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
    it('ตั้ง indeterminate ลงบน DOM node ได้ (ตั้งจาก HTML ไม่ได้ ต้องผ่าน ref)', () => {
        render(<Checkbox checked={false} indeterminate onChange={() => {}} ariaLabel="เลือกทั้งหมด" />);
        const box = screen.getByRole('checkbox', { name: 'เลือกทั้งหมด' }) as HTMLInputElement;
        expect(box.indeterminate).toBe(true);
        expect(box.checked).toBe(false);
    });

    it('checked ชนะ indeterminate เมื่อส่งมาพร้อมกัน', () => {
        render(<Checkbox checked indeterminate onChange={() => {}} ariaLabel="เลือกทั้งหมด" />);
        const box = screen.getByRole('checkbox', { name: 'เลือกทั้งหมด' }) as HTMLInputElement;
        expect(box.checked).toBe(true);
        expect(box.indeterminate).toBe(false);
    });

    it('ล้าง indeterminate เมื่อ prop เปลี่ยนเป็น false', () => {
        const { rerender } = render(
            <Checkbox checked={false} indeterminate onChange={() => {}} ariaLabel="เลือกทั้งหมด" />,
        );
        const box = screen.getByRole('checkbox', { name: 'เลือกทั้งหมด' }) as HTMLInputElement;
        expect(box.indeterminate).toBe(true);
        rerender(<Checkbox checked={false} indeterminate={false} onChange={() => {}} ariaLabel="เลือกทั้งหมด" />);
        expect(box.indeterminate).toBe(false);
    });

    it('เรียก onChange เมื่อคลิก', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(<Checkbox checked={false} onChange={onChange} ariaLabel="เลือกแถว" />);
        await user.click(screen.getByRole('checkbox', { name: 'เลือกแถว' }));
        expect(onChange).toHaveBeenCalledTimes(1);
    });
});
