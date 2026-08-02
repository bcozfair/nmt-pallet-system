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

    // ด่านพิมพ์คำ -- ใช้กับคำสั่งที่ลบหลายแถวรวดเดียว เช่นล้างประวัติเก่าในหน้า
    // จัดการประวัติ ปุ่มยืนยันต้องกดไม่ได้จนกว่าคำจะตรง
    describe('confirmPhrase', () => {
        const gated = {
            ...base,
            confirmPhrase: 'ลบถาวร',
            confirmPhraseLabel: 'พิมพ์คำว่า "ลบถาวร" เพื่อยืนยัน',
        };

        it('ปุ่มยืนยันกดไม่ได้ตอนยังไม่พิมพ์', () => {
            render(<ConfirmDialog {...gated} isOpen />);
            expect(screen.getByLabelText('พิมพ์คำว่า "ลบถาวร" เพื่อยืนยัน')).toBeTruthy();
            expect((screen.getByRole('button', { name: 'ลบ' }) as HTMLButtonElement).disabled).toBe(
                true,
            );
        });

        it('พิมพ์ผิดก็ยังกดไม่ได้ และกดแล้วไม่เรียก onConfirm', async () => {
            const onConfirm = vi.fn();
            const user = userEvent.setup();
            render(<ConfirmDialog {...gated} isOpen onConfirm={onConfirm} />);
            await user.type(screen.getByLabelText(gated.confirmPhraseLabel), 'ลบ');
            const confirm = screen.getByRole('button', { name: 'ลบ' }) as HTMLButtonElement;
            expect(confirm.disabled).toBe(true);
            await user.click(confirm);
            expect(onConfirm).not.toHaveBeenCalled();
        });

        it('พิมพ์ตรงแล้วกดยืนยันได้', async () => {
            const onConfirm = vi.fn().mockResolvedValue(undefined);
            const user = userEvent.setup();
            render(<ConfirmDialog {...gated} isOpen onConfirm={onConfirm} />);
            await user.type(screen.getByLabelText(gated.confirmPhraseLabel), 'ลบถาวร');
            await user.click(screen.getByRole('button', { name: 'ลบ' }));
            expect(onConfirm).toHaveBeenCalledTimes(1);
        });

        // ช่องว่างหัวท้ายกับตัวพิมพ์ใหญ่ไม่ใช่สิ่งที่ด่านนี้ตั้งใจกัน -- คนที่อ่านแล้ว
        // พิมพ์ตามผ่านได้ ส่วนคนที่กดรัวยังติดอยู่ดี
        it('ตัดช่องว่างหัวท้ายและไม่สนตัวพิมพ์เล็กใหญ่', async () => {
            const onConfirm = vi.fn().mockResolvedValue(undefined);
            const user = userEvent.setup();
            render(
                <ConfirmDialog
                    {...base}
                    isOpen
                    confirmPhrase="DELETE"
                    confirmPhraseLabel="Type DELETE to confirm"
                    onConfirm={onConfirm}
                />,
            );
            await user.type(screen.getByLabelText('Type DELETE to confirm'), '  delete  ');
            await user.click(screen.getByRole('button', { name: 'ลบ' }));
            expect(onConfirm).toHaveBeenCalledTimes(1);
        });

        // อาการที่กัน: กล่องที่ถูกเรนเดอร์ค้างไว้แล้วสลับด้วย isOpen จะพกคำที่พิมพ์
        // ค้างจากรอบก่อนมาให้รอบใหม่ ปุ่มยืนยันของรอบใหม่จึงกดได้ทันทีตั้งแต่เปิด
        it('ปิดแล้วเปิดใหม่ต้องพิมพ์ใหม่', async () => {
            const user = userEvent.setup();
            const { rerender } = render(<ConfirmDialog {...gated} isOpen />);
            await user.type(screen.getByLabelText(gated.confirmPhraseLabel), 'ลบถาวร');
            expect((screen.getByRole('button', { name: 'ลบ' }) as HTMLButtonElement).disabled).toBe(
                false,
            );

            rerender(<ConfirmDialog {...gated} isOpen={false} />);
            rerender(<ConfirmDialog {...gated} isOpen />);

            expect((screen.getByLabelText(gated.confirmPhraseLabel) as HTMLInputElement).value).toBe(
                '',
            );
            expect((screen.getByRole('button', { name: 'ลบ' }) as HTMLButtonElement).disabled).toBe(
                true,
            );
        });

        // กล่องยืนยันที่ไม่ได้ตั้ง confirmPhrase ต้องไม่มีช่องกรอกโผล่มา -- อีกสี่หน้า
        // ของแอดมินใช้ตัวเดียวกันนี้อยู่
        it('ไม่ตั้ง confirmPhrase = ไม่มีช่องกรอก', () => {
            render(<ConfirmDialog {...base} isOpen />);
            expect(screen.queryByRole('textbox')).toBeNull();
        });
    });

    it('คลิกพื้นหลังไม่ปิด -- กล่องยืนยันต้องถูกตอบ ไม่ใช่ถูกปัดทิ้ง', async () => {
        const onCancel = vi.fn();
        const user = userEvent.setup();
        render(<ConfirmDialog {...base} isOpen onCancel={onCancel} />);
        await user.click(screen.getByTestId('modal-overlay'));
        expect(onCancel).not.toHaveBeenCalled();
    });
});
