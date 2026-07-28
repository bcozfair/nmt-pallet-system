import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

const base = {
    title: 'ลบพาเลท',
    message: 'ประวัติทั้งหมดจะหายถาวร',
    confirmLabel: 'ลบ',
    cancelLabel: 'ยกเลิก',
    closeLabel: 'ปิดหน้าต่าง',
    workingLabel: 'กำลังทำงาน...',
    onConfirm: () => {},
    onCancel: () => {},
};

describe('ConfirmDialog', () => {
    it('แสดงหัวเรื่องกับข้อความ และปุ่มทั้งสอง', () => {
        render(<ConfirmDialog {...base} isOpen />);
        expect(screen.getByRole('heading', { name: 'ลบพาเลท' })).toBeTruthy();
        expect(screen.getByText('ประวัติทั้งหมดจะหายถาวร')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'ลบ' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'ยกเลิก' })).toBeTruthy();
    });

    it('กดยกเลิกเรียก onCancel', async () => {
        const onCancel = vi.fn();
        const user = userEvent.setup();
        render(<ConfirmDialog {...base} isOpen onCancel={onCancel} />);
        await user.click(screen.getByRole('button', { name: 'ยกเลิก' }));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('ยืนยันสำเร็จแล้วปิดกล่องเอง', async () => {
        const onConfirm = vi.fn().mockResolvedValue(undefined);
        const onCancel = vi.fn();
        const user = userEvent.setup();
        render(<ConfirmDialog {...base} isOpen onConfirm={onConfirm} onCancel={onCancel} />);
        await user.click(screen.getByRole('button', { name: 'ลบ' }));
        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    // อาการที่เทสต์นี้กัน: scrapPallet() ปฏิเสธพาเลทที่ไม่ได้เสียหาย หรือ RLS
    // ปฏิเสธคำขอ -- ของเดิมใน common/ConfirmationModal ไม่ดัก rejection เลย
    // กล่องจึงค้างอยู่เฉย ๆ โดยปุ่มดูเหมือนตาย
    it('ยืนยันแล้วพังต้องไม่ปิดกล่อง และคืนปุ่มให้กดใหม่ได้', async () => {
        const onConfirm = vi.fn().mockRejectedValue(new Error('RLS'));
        const onCancel = vi.fn();
        const onError = vi.fn();
        const user = userEvent.setup();
        render(
            <ConfirmDialog
                {...base}
                isOpen
                onConfirm={onConfirm}
                onCancel={onCancel}
                onError={onError}
            />,
        );
        await user.click(screen.getByRole('button', { name: 'ลบ' }));
        expect(onError).toHaveBeenCalledTimes(1);
        expect(onCancel).not.toHaveBeenCalled();
        expect((screen.getByRole('button', { name: 'ลบ' }) as HTMLButtonElement).disabled).toBe(
            false,
        );
    });

    it('Escape ปิดกล่องผ่าน onCancel', async () => {
        const onCancel = vi.fn();
        const user = userEvent.setup();
        render(<ConfirmDialog {...base} isOpen onCancel={onCancel} />);
        await user.keyboard('{Escape}');
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('คลิกพื้นหลังไม่ปิด -- กล่องยืนยันต้องถูกตอบ ไม่ใช่ถูกปัดทิ้ง', async () => {
        const onCancel = vi.fn();
        const user = userEvent.setup();
        render(<ConfirmDialog {...base} isOpen onCancel={onCancel} />);
        await user.click(screen.getByTestId('modal-overlay'));
        expect(onCancel).not.toHaveBeenCalled();
    });
});
