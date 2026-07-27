import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToggleChip } from './ToggleChip';

describe('ToggleChip', () => {
    it('สะท้อนสถานะผ่าน aria-pressed', () => {
        const { rerender } = render(
            <ToggleChip pressed={false} onChange={() => {}} label="เฉพาะเกินกำหนด" />,
        );
        const chip = screen.getByRole('button', { name: 'เฉพาะเกินกำหนด' });
        expect(chip.getAttribute('aria-pressed')).toBe('false');
        rerender(<ToggleChip pressed onChange={() => {}} label="เฉพาะเกินกำหนด" />);
        expect(chip.getAttribute('aria-pressed')).toBe('true');
    });

    it('ส่งค่าที่สลับแล้วออกไป ไม่ใช่ค่าเดิม', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(<ToggleChip pressed={false} onChange={onChange} label="เฉพาะเกินกำหนด" />);
        await user.click(screen.getByRole('button', { name: 'เฉพาะเกินกำหนด' }));
        expect(onChange).toHaveBeenCalledWith(true);
    });

    it('กดด้วยคีย์บอร์ดได้ เพราะเป็น <button> จริง', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(<ToggleChip pressed onChange={onChange} label="เฉพาะเกินกำหนด" />);
        await user.tab();
        await user.keyboard('{Enter}');
        expect(onChange).toHaveBeenCalledWith(false);
    });
});
