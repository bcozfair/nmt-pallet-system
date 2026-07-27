import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Menu } from './Menu';

const items = [
    { label: 'อย่างแรก', onClick: vi.fn() },
    { label: 'อย่างที่สอง', onClick: vi.fn() },
    { label: 'อย่างที่สาม', onClick: vi.fn() },
];

describe('Menu', () => {
    it('ปุ่มประกาศสถานะเปิด/ปิดผ่าน aria-expanded', async () => {
        const user = userEvent.setup();
        render(<Menu label="ส่งออก" items={items} />);
        const trigger = screen.getByRole('button', { name: /ส่งออก/ });
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        await user.click(trigger);
        expect(trigger.getAttribute('aria-expanded')).toBe('true');
    });

    it('โฟกัสตกที่รายการแรกตอนเปิด', async () => {
        const user = userEvent.setup();
        render(<Menu label="ส่งออก" items={items} />);
        await user.click(screen.getByRole('button', { name: /ส่งออก/ }));
        expect(document.activeElement?.textContent).toContain('อย่างแรก');
    });

    it('ลูกศรลงเดินลง และวนกลับไปรายการแรกจากรายการสุดท้าย', async () => {
        const user = userEvent.setup();
        render(<Menu label="ส่งออก" items={items} />);
        await user.click(screen.getByRole('button', { name: /ส่งออก/ }));
        await user.keyboard('{ArrowDown}');
        expect(document.activeElement?.textContent).toContain('อย่างที่สอง');
        await user.keyboard('{ArrowDown}{ArrowDown}');
        expect(document.activeElement?.textContent).toContain('อย่างแรก');
    });

    it('End ไปรายการสุดท้าย Home กลับรายการแรก', async () => {
        const user = userEvent.setup();
        render(<Menu label="ส่งออก" items={items} />);
        await user.click(screen.getByRole('button', { name: /ส่งออก/ }));
        await user.keyboard('{End}');
        expect(document.activeElement?.textContent).toContain('อย่างที่สาม');
        await user.keyboard('{Home}');
        expect(document.activeElement?.textContent).toContain('อย่างแรก');
    });

    it('Escape ปิดเมนูแล้วคืนโฟกัสให้ปุ่ม', async () => {
        const user = userEvent.setup();
        render(<Menu label="ส่งออก" items={items} />);
        const trigger = screen.getByRole('button', { name: /ส่งออก/ });
        await user.click(trigger);
        await user.keyboard('{Escape}');
        expect(screen.queryByRole('menu')).toBeNull();
        expect(document.activeElement).toBe(trigger);
    });

    it('เลือกรายการแล้วเรียก onClick และปิดเมนู', async () => {
        const onClick = vi.fn();
        const user = userEvent.setup();
        render(<Menu label="ส่งออก" items={[{ label: 'อย่างแรก', onClick }]} />);
        await user.click(screen.getByRole('button', { name: /ส่งออก/ }));
        await user.click(screen.getByRole('menuitem', { name: 'อย่างแรก' }));
        expect(onClick).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('menu')).toBeNull();
    });

    it('คลิกนอกเมนูแล้วปิด', async () => {
        const user = userEvent.setup();
        render(
            <div>
                <button type="button">ข้างนอก</button>
                <Menu label="ส่งออก" items={items} />
            </div>,
        );
        await user.click(screen.getByRole('button', { name: /ส่งออก/ }));
        expect(screen.getByRole('menu')).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'ข้างนอก' }));
        expect(screen.queryByRole('menu')).toBeNull();
    });

    it('ลูกศรลงที่ปุ่มตอนเมนูปิดอยู่ = เปิดเมนู', async () => {
        const user = userEvent.setup();
        render(<Menu label="ส่งออก" items={items} />);
        const trigger = screen.getByRole('button', { name: /ส่งออก/ });
        trigger.focus();
        await user.keyboard('{ArrowDown}');
        expect(screen.getByRole('menu')).toBeTruthy();
    });

    it('iconOnly ใช้ label เป็นชื่อที่อ่านออกเสียงแทนข้อความในปุ่ม', () => {
        render(<Menu label="การทำงานอื่น" iconOnly items={items} />);
        const trigger = screen.getByRole('button', { name: 'การทำงานอื่น' });
        expect(trigger.textContent).toBe('');
    });
});
