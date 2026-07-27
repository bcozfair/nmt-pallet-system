import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
});
