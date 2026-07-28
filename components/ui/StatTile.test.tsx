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

    // อาการที่เทสต์คู่นี้กัน: ไทล์ถูกออกแบบมาสำหรับ "ตัวเลขแสดงผลหนึ่งตัว" ค่าจึงเป็น
    // text-3xl + shrink-0 อยู่แถวเดียวกับป้าย พอ PalletDetailModal ส่งค่าที่เป็น
    // ข้อความยาว ("Warehouse", "ไม่เคยใช้งาน") ค่ากินความกว้างทั้งแถว คอลัมน์ป้าย
    // (min-w-0) ยุบเหลือเกือบศูนย์ แล้วป้ายไทยซึ่งตัดกลางคำไม่ได้ก็ล้นออกมาทับตัวค่า
    it('ค่าที่เป็นข้อความ (size="text") วางใต้ป้าย ไม่แย่งแถวเดียวกัน และห่อบรรทัดได้', () => {
        render(<StatTile label="สถานที่ปัจจุบัน" value="Warehouse" size="text" />);
        const value = screen.getByText('Warehouse');

        // ไม่ shrink-0 อีก และห่อบรรทัดได้ -- ค่ายาวจึงไม่ดันอะไรออกนอกไทล์
        expect(value.className).not.toContain('shrink-0');
        expect(value.className).toContain('break-words');
        // ขนาดอ่านข้อความ ไม่ใช่ขนาดตัวเลขแสดงผล
        expect(value.className).not.toContain('text-3xl');

        // และต้องไม่อยู่ในแถว justify-between เดียวกับป้ายอีก
        const row = value.parentElement!;
        expect(row.className).toContain('flex-col');
        expect(row.className).not.toContain('justify-between');
    });

    it('ค่าที่เป็นตัวเลขยังอยู่แถวเดียวกับป้าย ตัวโต และไม่ยอมหด', () => {
        render(<StatTile label="ทั้งหมด" value={12} />);
        const value = screen.getByText('12');
        expect(value.className).toContain('shrink-0');
        expect(value.className).toContain('text-3xl');
        expect(value.parentElement!.className).toContain('justify-between');
    });

    it('เรียก onClick เมื่อกด', async () => {
        const onClick = vi.fn();
        const user = userEvent.setup();
        render(<StatTile label="เกินกำหนด" value={3} onClick={onClick} />);
        await user.click(screen.getByRole('button'));
        expect(onClick).toHaveBeenCalledTimes(1);
    });
});
