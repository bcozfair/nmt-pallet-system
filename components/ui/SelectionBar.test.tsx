import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Menu } from './Menu';
import { SelectionBar } from './SelectionBar';

describe('SelectionBar', () => {
    it('ไม่เรนเดอร์อะไรเลยเมื่อยังไม่ได้เลือกอะไร', () => {
        const { container } = render(
            <SelectionBar count={0} countLabel="เลือกไว้ 0" onClear={() => {}} clearLabel="ยกเลิก" />,
        );
        expect(container.firstChild).toBeNull();
    });

    it('แสดงจำนวนที่เลือกและปุ่มยกเลิก', () => {
        render(
            <SelectionBar count={3} countLabel="เลือกไว้ 3 รายการ" onClear={() => {}} clearLabel="ยกเลิก" />,
        );
        expect(screen.getByText('เลือกไว้ 3 รายการ')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'ยกเลิก' })).toBeTruthy();
    });

    it('Escape ล้างการเลือก', async () => {
        const onClear = vi.fn();
        const user = userEvent.setup();
        render(
            <SelectionBar count={2} countLabel="เลือกไว้ 2 รายการ" onClear={onClear} clearLabel="ยกเลิก" />,
        );
        await user.keyboard('{Escape}');
        expect(onClear).toHaveBeenCalledTimes(1);
    });

    it('ไม่ผูก Escape ไว้เมื่อยังไม่ได้เลือกอะไร', async () => {
        const onClear = vi.fn();
        const user = userEvent.setup();
        render(
            <SelectionBar count={0} countLabel="เลือกไว้ 0" onClear={onClear} clearLabel="ยกเลิก" />,
        );
        await user.keyboard('{Escape}');
        expect(onClear).not.toHaveBeenCalled();
    });

    // สองเทสต์ข้างล่างนี้คือช่องว่างที่เทสต์เดิมมองไม่เห็น: เทสต์ "Escape ล้างการเลือก"
    // ข้างบนกับ Menu.test.tsx ที่ว่า "Escape ปิดเมนู" ผ่านทั้งคู่ ทั้งคู่ถูก แต่พอเอาสอง
    // คอมโพเนนต์มาประกอบกันแล้วพัง -- Escape ปิดเมนูและล้างการเลือกไปพร้อมกัน
    it.each([
        ['เมนู', 'menu'],
        ['ไดอะล็อก', 'dialog'],
        ['ลิสต์บ็อกซ์', 'listbox'],
    ])('Escape ไม่ล้างการเลือกเมื่อมี%sเปิดอยู่', async (_label, role) => {
        const onClear = vi.fn();
        const user = userEvent.setup();
        render(
            <>
                <div role={role} aria-label="เปิดอยู่" />
                <SelectionBar count={2} countLabel="เลือกไว้ 2 รายการ" onClear={onClear} clearLabel="ยกเลิก" />
            </>,
        );
        await user.keyboard('{Escape}');
        expect(onClear).not.toHaveBeenCalled();
    });

    it('Escape ปิดเมนูบนแถบโดยไม่พาการเลือกไปด้วย แล้วกดซ้ำจึงล้างการเลือก', async () => {
        const onClear = vi.fn();
        const user = userEvent.setup();
        render(
            <SelectionBar
                count={40}
                countLabel="เลือกไว้ 40 รายการ"
                onClear={onClear}
                clearLabel="ยกเลิก"
                menu={<Menu label="การทำงานอื่น" items={[{ label: 'แสดงรหัส', onClick: () => {} }]} />}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'การทำงานอื่น' }));
        expect(screen.getByRole('menu')).toBeTruthy();

        await user.keyboard('{Escape}');
        expect(screen.queryByRole('menu')).toBeNull();
        expect(onClear).not.toHaveBeenCalled();

        // เมนูปิดแล้ว แถบกลับมาเป็นสิ่งที่อยู่ในสุด Escape จึงกลับมาเป็นของมัน
        await user.keyboard('{Escape}');
        expect(onClear).toHaveBeenCalledTimes(1);
    });

    it('ประกาศความสูงของกองลอยไว้ที่ --selection-bar-h แล้วถอดออกเมื่อไม่มีอะไรถูกเลือก', () => {
        const root = document.documentElement;
        const { rerender } = render(
            <SelectionBar count={2} countLabel="เลือกไว้ 2 รายการ" onClear={() => {}} clearLabel="ยกเลิก" />,
        );
        // jsdom ไม่ทำ layout ค่าจึงเป็น 0px -- ที่เทสต์คือ "มีการประกาศและถูกถอดออก"
        // ไม่ใช่ตัวเลข ซึ่งเป็นครึ่งที่พังได้จริง (property ค้างอยู่ = ช่องว่างค้างท้ายหน้า)
        expect(root.style.getPropertyValue('--selection-bar-h')).toBe('0px');

        rerender(
            <SelectionBar count={0} countLabel="เลือกไว้ 0" onClear={() => {}} clearLabel="ยกเลิก" />,
        );
        expect(root.style.getPropertyValue('--selection-bar-h')).toBe('');
    });
});
