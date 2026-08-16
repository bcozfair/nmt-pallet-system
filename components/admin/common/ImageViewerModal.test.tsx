import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageViewerModal } from './ImageViewerModal';
import { Modal } from '../../ui';

// ป้ายจาก locales/th.ts (t.modals) -- useT อ่านค่า default เป็นไทยเสมอเพราะไม่มี
// provider ให้ mount ในเทสต์นี้
const EVIDENCE_ALT = 'หลักฐาน';
const ZOOM_IN_LABEL = 'ขยาย';
const ZOOM_OUT_LABEL = 'ย่อ';

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

    // อาการที่เทสต์นี้กัน: handleWheel เคยถูกผูกไว้กับ container ของรูปแต่หลุดไป
    // ตอนย้ายมาใช้ Modal (ไม่มี onWheel อยู่ที่ไหนเลย) scroll-to-zoom จึงตายไปเงียบ ๆ
    // โดยไม่มี error ให้เห็น เทสต์นี้ต้อง fail ถ้า onWheel หลุดไปอีกครั้ง
    it('scroll ล้อเมาส์เหนือรูปทำให้ซูมเข้า และตัวเลขเปอร์เซ็นต์ที่แสดงเปลี่ยนตาม', () => {
        render(<ImageViewerModal src="https://example.com/evidence.jpg" onClose={() => {}} />);

        expect(screen.getByText('100%')).toBeTruthy();

        const img = screen.getByAltText(EVIDENCE_ALT);
        const container = img.parentElement as HTMLElement;

        // deltaY ติดลบ = เลื่อนขึ้น = ซูมเข้า ตาม handleWheel (+0.1 ต่อครั้ง)
        fireEvent.wheel(container, { deltaY: -100 });

        expect(screen.getByText('110%')).toBeTruthy();
        expect(img.style.transform).toContain('scale(1.1)');
    });

    // กรอบรูปเป็นจัตุรัส 1:1 -- สองคลาสนี้ต้องมาคู่กันเสมอ ถ้ามีแค่ aspect-square
    // แต่กล่องกลับไปกว้างตาม max-w-4xl ของ size="xl" จัตุรัสจะสูง 896px ซึ่งเกิน
    // max-h-[90vh] ของ panel บนจอเตี้ย แล้วรูปจะถูกดันเข้า overflow-y-auto ของเนื้อ
    // กล่อง กลายเป็นจัตุรัสที่ถูกตัดท้ายพร้อมแถบเลื่อน -- เทสต์นี้จึงเช็กทั้งคู่
    it('กรอบรูปเป็นจัตุรัส 1:1 และความกว้างกล่องผูกกับความสูงจอ ไม่ให้จัตุรัสล้นออกนอกจอ', () => {
        render(<ImageViewerModal src="https://example.com/evidence.jpg" onClose={() => {}} />);

        const stage = screen.getByAltText(EVIDENCE_ALT).parentElement as HTMLElement;
        expect(stage.className).toContain('aspect-square');

        const panel = screen.getByRole('dialog');
        expect(panel.className).toContain('max-w-[min(56rem,calc(90vh-5rem))]');
    });

    // ค่า 0.5 / 3 มาจากตัว clamp จริงใน handleZoomOut/handleZoomIn
    // (Math.max(prev - 0.25, 0.5) และ Math.min(prev + 0.25, 3)) ไม่ใช่ตัวเลขที่คิดเอง
    it('ปุ่มขยายถูก disable ที่ขีดจำกัดบน (300%) และปุ่มย่อถูก disable ที่ขีดจำกัดล่าง (50%)', async () => {
        const user = userEvent.setup();
        render(<ImageViewerModal src="https://example.com/evidence.jpg" onClose={() => {}} />);

        const zoomInButton = screen.getByLabelText(ZOOM_IN_LABEL) as HTMLButtonElement;
        const zoomOutButton = screen.getByLabelText(ZOOM_OUT_LABEL) as HTMLButtonElement;

        // เริ่มที่ 100% ทั้งสองปุ่มต้องกดได้
        expect(zoomInButton.disabled).toBe(false);
        expect(zoomOutButton.disabled).toBe(false);

        // 1.0 -> 3.0 ทีละ 0.25: ต้องกด 8 ครั้งพอดีถึงจะชนเพดาน
        for (let i = 0; i < 8; i++) {
            await user.click(zoomInButton);
        }
        expect(screen.getByText('300%')).toBeTruthy();
        expect(zoomInButton.disabled).toBe(true);

        // กดรีเซ็ตกลับมา 100% แล้วไล่ย่อลงไปชนพื้น 0.5 (ทีละ 0.25 -- 2 ครั้งพอดี)
        const resetButton = screen.getByLabelText('รีเซ็ตขนาด') as HTMLButtonElement;
        await user.click(resetButton);
        expect(screen.getByText('100%')).toBeTruthy();

        await user.click(zoomOutButton);
        await user.click(zoomOutButton);
        expect(screen.getByText('50%')).toBeTruthy();
        expect(zoomOutButton.disabled).toBe(true);
    });
});
