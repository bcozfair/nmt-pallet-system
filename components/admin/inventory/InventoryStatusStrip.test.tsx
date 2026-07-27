import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InventoryStatusStrip } from './InventoryStatusStrip';

// i18n ไม่มี provider ให้ mount -- useT อ่านจาก module singleton ที่ default เป็นไทย
// ป้ายที่เทสต์อ้างถึงจึงเป็นไทยตรง ๆ (locales/admin/inventory.ts)
const VIEW_SCRAPPED = 'ดูรายการ';

const counts = (scrapped: number) => ({
    all: 10,
    available: 6,
    in_use: 3,
    damaged: 1,
    scrapped,
});

describe('InventoryStatusStrip -- แถวเชิงอรรถของ "ตัดออกจากระบบแล้ว"', () => {
    it('ไม่แสดงแถวเลยเมื่อไม่มีพาเลทที่ถูกตัดออก และไม่ได้กรองด้วย scrapped', () => {
        render(
            <InventoryStatusStrip counts={counts(0)} statusFilter="all" onSelect={() => {}} />,
        );
        expect(screen.queryByRole('button', { name: VIEW_SCRAPPED })).toBeNull();
    });

    it('แสดงแถวแบบยังไม่ถูกเลือก แล้วกดแล้วกรองเป็น scrapped', async () => {
        const onSelect = vi.fn();
        const user = userEvent.setup();
        render(
            <InventoryStatusStrip counts={counts(4)} statusFilter="all" onSelect={onSelect} />,
        );

        const link = screen.getByRole('button', { name: VIEW_SCRAPPED });
        expect(link.getAttribute('aria-pressed')).toBe('false');

        await user.click(link);
        expect(onSelect).toHaveBeenCalledWith('scrapped');
    });

    // นี่คือ m5 ตัวจริง: ผู้ใช้กรอง scrapped อยู่ แล้วพิมพ์คำค้นที่ไม่ตรงพาเลทที่ถูกตัดออก
    // ตัวไหนเลย counts.scrapped จึงเป็น 0 -- ของเดิม gate แถวนี้ด้วย counts.scrapped > 0
    // แถวจึงหายไปทั้งแถว เหลือตารางว่างที่ไม่มีอะไรบนจอบอกว่ากำลังกรองอะไรอยู่
    it('ยังแสดงแถวเมื่อกรองด้วย scrapped อยู่ แม้จำนวนจะเป็น 0', () => {
        render(
            <InventoryStatusStrip counts={counts(0)} statusFilter="scrapped" onSelect={() => {}} />,
        );
        expect(screen.getByRole('button', { name: VIEW_SCRAPPED })).toBeTruthy();
    });

    it('บอกสถานะ "กำลังดูอยู่" ผ่าน aria-pressed และกดแล้วกลับไปที่ all', async () => {
        const onSelect = vi.fn();
        const user = userEvent.setup();
        render(
            <InventoryStatusStrip counts={counts(4)} statusFilter="scrapped" onSelect={onSelect} />,
        );

        const link = screen.getByRole('button', { name: VIEW_SCRAPPED });
        expect(link.getAttribute('aria-pressed')).toBe('true');

        await user.click(link);
        expect(onSelect).toHaveBeenCalledWith('all');
    });

    it('ไทล์ทั้งสี่ไม่มีตัวไหนถูกเลือกตอนกรองด้วย scrapped แถวเชิงอรรถจึงต้องรับหน้าที่นั้นแทน', () => {
        render(
            <InventoryStatusStrip counts={counts(4)} statusFilter="scrapped" onSelect={() => {}} />,
        );
        const pressed = screen
            .getAllByRole('button')
            .filter((el) => el.getAttribute('aria-pressed') === 'true');
        expect(pressed).toHaveLength(1);
        expect(pressed[0].textContent).toContain(VIEW_SCRAPPED);
    });
});
