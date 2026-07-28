import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

const base = {
    title: 'หัวเรื่อง',
    closeLabel: 'ปิดหน้าต่าง',
    onClose: () => {},
};

describe('Modal', () => {
    it('ไม่เรนเดอร์อะไรเลยเมื่อ isOpen เป็น false', () => {
        render(<Modal {...base} isOpen={false}>เนื้อ</Modal>);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    // role/aria-modal ต้องอยู่บน panel ไม่ใช่ overlay: overlay ครอบทั้งจอ
    // การตั้งชื่อมันว่า dialog เท่ากับบอก screen reader ว่าทุกอย่างข้างหลังเป็น
    // ส่วนหนึ่งของ dialog -- และ Escape guard ของ SelectionBar มองหา selector นี้
    it('วาง role=dialog ไว้บน panel ที่มีหัวเรื่อง ไม่ใช่บน overlay ที่ครอบทั้งจอ', () => {
        render(<Modal {...base} isOpen>เนื้อ</Modal>);
        const dialog = screen.getByRole('dialog');
        expect(dialog.getAttribute('aria-modal')).toBe('true');
        // panel ต้องเป็นตัวที่ "มี" หัวเรื่องอยู่ข้างใน ไม่ใช่ตัวที่เป็นพื้นเต็มจอ
        expect(dialog.contains(screen.getByText('หัวเรื่อง'))).toBe(true);
        expect(dialog.className.includes('fixed')).toBe(false);
    });

    it('หัวเรื่องถูกผูกเป็นชื่อของ dialog ผ่าน aria-labelledby', () => {
        render(<Modal {...base} isOpen>เนื้อ</Modal>);
        const dialog = screen.getByRole('dialog');
        const labelId = dialog.getAttribute('aria-labelledby');
        expect(labelId).toBeTruthy();
        expect(document.getElementById(labelId as string)?.textContent).toBe('หัวเรื่อง');
    });

    it('Escape ปิดโมดัล', async () => {
        const onClose = vi.fn();
        const user = userEvent.setup();
        render(<Modal {...base} isOpen onClose={onClose}>เนื้อ</Modal>);
        await user.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    // อาการที่เทสต์นี้กัน: เปิดรูปหลักฐานใน PalletDetail แล้วกด Escape หนึ่งครั้ง
    // ปิดทั้งรูปและโมดัลข้างล่างพร้อมกัน
    it('Escape ปิดเฉพาะโมดัลที่อยู่ในสุด ไม่พาโมดัลข้างล่างไปด้วย', async () => {
        const onCloseOuter = vi.fn();
        const onCloseInner = vi.fn();
        const user = userEvent.setup();
        render(
            <>
                <Modal {...base} isOpen onClose={onCloseOuter} title="ชั้นนอก">เนื้อนอก</Modal>
                <Modal {...base} isOpen onClose={onCloseInner} title="ชั้นใน" level={2}>เนื้อใน</Modal>
            </>,
        );
        await user.keyboard('{Escape}');
        expect(onCloseInner).toHaveBeenCalledTimes(1);
        expect(onCloseOuter).not.toHaveBeenCalled();
    });

    it('คลิกพื้นหลังไม่ปิดโดยค่าเริ่มต้น', async () => {
        const onClose = vi.fn();
        const user = userEvent.setup();
        const { container } = render(<Modal {...base} isOpen onClose={onClose}>เนื้อ</Modal>);
        void container;
        const overlay = screen.getByTestId('modal-overlay');
        await user.click(overlay);
        expect(onClose).not.toHaveBeenCalled();
    });

    it('คลิกพื้นหลังปิดเมื่อส่ง dismissOnBackdrop', async () => {
        const onClose = vi.fn();
        const user = userEvent.setup();
        render(<Modal {...base} isOpen onClose={onClose} dismissOnBackdrop>เนื้อ</Modal>);
        await user.click(screen.getByTestId('modal-overlay'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('คลิกในกล่องไม่ปิด แม้เปิด dismissOnBackdrop ไว้', async () => {
        const onClose = vi.fn();
        const user = userEvent.setup();
        render(
            <Modal {...base} isOpen onClose={onClose} dismissOnBackdrop>
                <p>เนื้อ</p>
            </Modal>,
        );
        await user.click(screen.getByText('เนื้อ'));
        expect(onClose).not.toHaveBeenCalled();
    });

    it('ล็อกสกรอลล์พื้นหลังตอนเปิด และคลายตอนปิด', () => {
        const root = document.documentElement;
        const { rerender } = render(<Modal {...base} isOpen>เนื้อ</Modal>);
        expect(root.style.overflow).toBe('hidden');
        rerender(<Modal {...base} isOpen={false}>เนื้อ</Modal>);
        expect(root.style.overflow).toBe('');
    });

    // ครึ่งที่พังได้จริง: โมดัลซ้อนปิดไปแล้วแต่ตัวข้างล่างยังเปิดอยู่
    // ถ้าคลายสกรอลล์ตอนนั้นหน้าจะเลื่อนได้ทั้งที่ยังมีโมดัลค้างอยู่
    it('คลายสกรอลล์เมื่อโมดัลชั้นสุดท้ายปิดเท่านั้น', () => {
        const root = document.documentElement;
        const { rerender } = render(
            <>
                <Modal {...base} isOpen title="ชั้นนอก">นอก</Modal>
                <Modal {...base} isOpen title="ชั้นใน" level={2}>ใน</Modal>
            </>,
        );
        expect(root.style.overflow).toBe('hidden');

        rerender(
            <>
                <Modal {...base} isOpen title="ชั้นนอก">นอก</Modal>
                <Modal {...base} isOpen={false} title="ชั้นใน" level={2}>ใน</Modal>
            </>,
        );
        expect(root.style.overflow).toBe('hidden');

        rerender(
            <>
                <Modal {...base} isOpen={false} title="ชั้นนอก">นอก</Modal>
                <Modal {...base} isOpen={false} title="ชั้นใน" level={2}>ใน</Modal>
            </>,
        );
        expect(root.style.overflow).toBe('');
    });

    it('คืนโฟกัสกลับที่ปุ่มที่เปิดโมดัลเมื่อปิด', async () => {
        const user = userEvent.setup();

        const Harness = () => {
            const [open, setOpen] = useState(false);
            return (
                <>
                    <button type="button" onClick={() => setOpen(true)}>เปิด</button>
                    <Modal {...base} isOpen={open} onClose={() => setOpen(false)}>
                        <p>เนื้อ</p>
                    </Modal>
                </>
            );
        };

        render(<Harness />);
        const opener = screen.getByRole('button', { name: 'เปิด' });
        await user.click(opener);
        expect(screen.getByRole('dialog')).toBeTruthy();

        await user.keyboard('{Escape}');
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(document.activeElement).toBe(opener);
    });

    it('Tab วนอยู่ในกล่อง ไม่หลุดไปหาปุ่มที่อยู่ข้างหลังโมดัล', async () => {
        const user = userEvent.setup();
        render(
            <>
                <button type="button">ปุ่มข้างหลัง</button>
                <Modal {...base} isOpen>
                    <button type="button">ในกล่อง ก</button>
                    <button type="button">ในกล่อง ข</button>
                </Modal>
            </>,
        );

        // ปุ่ม ✕ บนหัวเป็นตัวแรกในกล่อง จึงเป็นตัวที่ได้โฟกัสตอนเปิด
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'ปิดหน้าต่าง' }));

        await user.tab();
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'ในกล่อง ก' }));
        await user.tab();
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'ในกล่อง ข' }));
        // ตัวสุดท้ายแล้ว Tab ต่อต้องวนกลับหัวกล่อง ไม่ใช่ออกไปหา "ปุ่มข้างหลัง"
        await user.tab();
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'ปิดหน้าต่าง' }));
    });

    it('ปุ่มปิดเรียก onClose และใช้ closeLabel เป็นชื่อ', async () => {
        const onClose = vi.fn();
        const user = userEvent.setup();
        render(<Modal {...base} isOpen onClose={onClose}>เนื้อ</Modal>);
        await user.click(screen.getByRole('button', { name: 'ปิดหน้าต่าง' }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    // มีคำขอค้างอยู่ (busy) ต้องปิดไม่ได้เลยไม่ว่าทางไหน -- ไม่งั้น error ที่กำลัง
    // จะโยนกลับมาทีหลังตกลงบนต้นไม้ที่ unmount ไปแล้ว กลายเป็นความเงียบสมบูรณ์
    it('Escape ไม่ปิดโมดัลระหว่าง busy', async () => {
        const onClose = vi.fn();
        const user = userEvent.setup();
        render(<Modal {...base} isOpen busy onClose={onClose}>เนื้อ</Modal>);
        await user.keyboard('{Escape}');
        expect(onClose).not.toHaveBeenCalled();
    });

    it('Escape กลับมาปิดโมดัลได้เมื่อ busy กลายเป็น false', async () => {
        const onClose = vi.fn();
        const user = userEvent.setup();
        const { rerender } = render(<Modal {...base} isOpen busy onClose={onClose}>เนื้อ</Modal>);
        rerender(<Modal {...base} isOpen busy={false} onClose={onClose}>เนื้อ</Modal>);
        await user.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('คลิกพื้นหลังไม่ปิดระหว่าง busy แม้เปิด dismissOnBackdrop ไว้', async () => {
        const onClose = vi.fn();
        const user = userEvent.setup();
        render(<Modal {...base} isOpen busy dismissOnBackdrop onClose={onClose}>เนื้อ</Modal>);
        await user.click(screen.getByTestId('modal-overlay'));
        expect(onClose).not.toHaveBeenCalled();
    });

    it('ปุ่ม ✕ ถูก disabled ระหว่าง busy', () => {
        render(<Modal {...base} isOpen busy>เนื้อ</Modal>);
        const closeButton = screen.getByRole('button', { name: 'ปิดหน้าต่าง' });
        expect(closeButton.hasAttribute('disabled')).toBe(true);
    });

    it('เรนเดอร์ footer และ headerActions ที่ส่งมา', () => {
        render(
            <Modal
                {...base}
                isOpen
                headerActions={<button type="button">พิมพ์</button>}
                footer={<button type="button">ยืนยัน</button>}
            >
                เนื้อ
            </Modal>,
        );
        expect(screen.getByRole('button', { name: 'พิมพ์' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'ยืนยัน' })).toBeTruthy();
    });
});
