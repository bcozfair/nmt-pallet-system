import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageViewerModal } from './ImageViewerModal';
import { Modal } from '../../ui';

// อาการที่เทสต์นี้กัน: ก่อนหน้านี้ ImageViewerModal ไม่ได้เข้า stack ของ Modal เลย
// (portal เอง, ไม่มี Escape handler) เปิดรูปทับ PalletDetailModal แล้วกด Escape
// หนึ่งครั้งจะไปปิดกล่องรายละเอียดข้างล่างแทนที่จะปิดรูป -- สลับด้านกับที่ควรเกิด
// level={2} ทำให้รูปเข้า stack เป็นตัวในสุด จึงเป็นตัวเดียวที่กิน Escape ก่อน
describe('ImageViewerModal', () => {
    it('Escape ปิดเฉพาะตัวดูรูป ไม่พา PalletDetailModal (จำลองด้วย Modal ชั้นนอก) ไปด้วย', async () => {
        const onCloseOuter = vi.fn();
        const onCloseViewer = vi.fn();
        const user = userEvent.setup();

        render(
            <>
                <Modal
                    isOpen
                    onClose={onCloseOuter}
                    title="รายละเอียดพาเลท"
                    closeLabel="ปิดหน้าต่าง"
                >
                    เนื้อกล่องรายละเอียด
                </Modal>
                <ImageViewerModal src="https://example.com/evidence.jpg" onClose={onCloseViewer} />
            </>,
        );

        // ต้องมีสอง dialog ซ้อนกันอยู่จริงก่อนกด Escape ไม่งั้นเทสต์นี้ไม่ได้ทดสอบ
        // เคสซ้อนกันเลย
        expect(screen.getAllByRole('dialog')).toHaveLength(2);

        await user.keyboard('{Escape}');

        expect(onCloseViewer).toHaveBeenCalledTimes(1);
        expect(onCloseOuter).not.toHaveBeenCalled();
    });

    it('src เป็น null ไม่เรนเดอร์ dialog ของตัวดูรูปเลย', () => {
        render(<ImageViewerModal src={null} onClose={() => {}} />);
        expect(screen.queryByRole('dialog')).toBeNull();
    });
});
