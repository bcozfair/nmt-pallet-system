import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArrowRightCircle } from 'lucide-react';
import { ActionTile } from './ActionTile';

const base = {
    icon: ArrowRightCircle,
    title: 'เบิกออก',
    subtitle: 'ไปยังแผนก',
    onClick: () => {},
};

describe('ActionTile', () => {
    it('เป็น <button> จริง จึงกดด้วยคีย์บอร์ดได้', async () => {
        const onClick = vi.fn();
        const user = userEvent.setup();
        render(<ActionTile {...base} onClick={onClick} />);

        await user.tab();
        await user.keyboard('{Enter}');
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('ชื่อที่ screen reader ได้ยินมีทั้งหัวเรื่องและคำบรรยาย', () => {
        render(<ActionTile {...base} />);
        const tile = screen.getByRole('button', { name: /เบิกออก/ });
        expect(tile.textContent).toContain('ไปยังแผนก');
    });

    it('ทั้งสอง layout ใช้กล่องใบเดียวกับการ์ดของแอดมิน ต่างแค่การจัดวาง', () => {
        const { container, rerender } = render(<ActionTile {...base} layout="stack" />);
        const tile = () => container.firstElementChild as HTMLElement;

        // rounded-3xl มาจาก CARD_SHELL_SHAPE -- ถ้าหายไปแปลว่ามีคนลอกคลาสมาเขียนเอง
        expect(tile().className).toContain('rounded-3xl');
        expect(tile().className).toContain('flex-col');
        expect(tile().className).toContain('text-center');
        expect(tile().className).not.toContain('text-left');

        rerender(<ActionTile {...base} layout="row" />);
        expect(tile().className).toContain('rounded-3xl');
        expect(tile().className).not.toContain('flex-col');
        expect(tile().className).toContain('text-left');
        expect(tile().className).not.toContain('text-center');
    });

    it('ไอคอนเป็นของตกแต่ง จึงไม่ถูกอ่านออกเสียง', () => {
        const { container } = render(<ActionTile {...base} />);
        const svg = container.querySelector('svg');
        expect(svg?.getAttribute('aria-hidden')).toBe('true');
    });
});
