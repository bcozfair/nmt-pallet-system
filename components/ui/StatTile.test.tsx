import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatTile } from './StatTile';

describe('StatTile', () => {
    it('เป็น <div> ไม่ใช่ปุ่ม เมื่อไม่มี onClick', () => {
        render(<StatTile label="ทั้งหมด" value={12} />);
        expect(screen.queryByRole('button')).toBeNull();
        expect(screen.getByText('12')).toBeTruthy();
    });

    // หัวใจของ I1: ไทล์ที่กดแล้วพาไปหน้าอื่น (KpiRow ส่งแต่ onClick ไม่ส่ง selected)
    // ต้องไม่มี aria-pressed ติดมาเลย ไม่ใช่มีเป็น "false" -- เพราะ aria-pressed
    // ประกาศว่าตัวมันเป็นสวิตช์ที่มีสองสถานะ ซึ่งไทล์นำทางไม่ใช่ (WCAG 4.1.2)
    // เทียบ getAttribute กับ null ตรง ๆ แทน toBeFalsy(): "false" ก็ truthy ในเทสต์นี้
    // ถ้าเขียนหลวมกว่านี้เทสต์จะผ่านทั้งที่บั๊กยังอยู่
    it('ไทล์ที่กดได้แต่ไม่ได้ส่ง selected มา ต้องไม่มี aria-pressed เลย', () => {
        render(<StatTile label="เกินกำหนด" value={3} onClick={() => {}} />);
        const tile = screen.getByRole('button');
        expect(tile.getAttribute('aria-pressed')).toBeNull();
        expect(tile.hasAttribute('aria-pressed')).toBe(false);
    });

    it('ไทล์ที่ส่ง selected มาจริง ยังได้ aria-pressed ตามค่าที่ส่ง', () => {
        const { rerender } = render(
            <StatTile label="พร้อมใช้งาน" value={8} onClick={() => {}} selected={false} />,
        );
        expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('false');

        rerender(<StatTile label="พร้อมใช้งาน" value={8} onClick={() => {}} selected />);
        expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true');
    });

    // m1: สถานะ "ถูกเลือก" ต้องไม่ใช้ ring อีก เพราะ ring-2/ring-offset-2 วาดทับระยะ
    // เดียวกับวง focus พอดี ไทล์ที่เลือกอยู่แล้วโฟกัสมาถึงจึงไม่มีอะไรเปลี่ยนบนจอ
    // สถานะที่เลือกย้ายไปอยู่บนพื้นผิวของการ์ดแทน (ขอบแบรนด์ + พื้นแบรนด์จาง)
    it('สถานะที่เลือกอยู่บนพื้นผิวการ์ด ไม่ใช่วงแหวนที่ทับกับวงโฟกัส', () => {
        const { rerender } = render(<StatTile label="เสียหาย" value={2} onClick={() => {}} selected />);
        const selected = screen.getByRole('button').className;
        expect(selected).toContain('border-brand-500');
        expect(selected).toContain('bg-brand-50');
        expect(selected).not.toContain('ring-');
        // วง focus ยังเป็นสตริงมาตรฐานของแอปและเป็นวงเดียวบนไทล์
        expect(selected).toContain('focus-visible:outline-brand-500');

        // และสองสถานะต้องไม่ส่งคลาสสีขอบ/สีพื้นของอีกฝั่งมาด้วย ไม่งั้นจะมีคลาสของ
        // property เดียวกันสองตัวบน element เดียว แล้วผู้ชนะไปตัดสินที่ลำดับใน CSS
        rerender(<StatTile label="เสียหาย" value={2} onClick={() => {}} selected={false} />);
        const idle = screen.getByRole('button').className;
        expect(idle).toContain('border-slate-200/80');
        expect(idle).toContain('bg-white');
        expect(idle).not.toContain('border-brand-500');
        expect(idle).not.toContain('bg-brand-50');
    });

    it('เรียก onClick เมื่อกด', async () => {
        const onClick = vi.fn();
        const user = userEvent.setup();
        render(<StatTile label="เกินกำหนด" value={3} onClick={onClick} />);
        await user.click(screen.getByRole('button'));
        expect(onClick).toHaveBeenCalledTimes(1);
    });
});
