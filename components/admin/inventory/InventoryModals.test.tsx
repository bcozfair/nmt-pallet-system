import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddPalletModal, EditPalletModal } from './InventoryModals';

// AddPalletModal แตะเครือข่ายจริงผ่าน createPallet เท่านั้น -- mock เฉพาะจุดนั้น
// EditPalletModal ไม่แตะ service เอง มันรับ onSave เป็น prop จากผู้เรียก จึงไม่ต้อง
// mock อะไรเพิ่มสำหรับโมดัลนั้น
vi.mock('../../../services/palletService', () => ({
    createPallet: vi.fn(),
}));

// i18n ไม่มี provider ให้ mount -- useT อ่านจาก module singleton ที่ default เป็นไทย
// ป้ายที่เทสต์อ้างถึงจึงเป็นไทยตรง ๆ (locales/admin/inventory.ts, locales/th.ts)
const PALLET_ID_LABEL = 'รหัสพาเลท';
const CREATE_BUTTON = 'สร้างพาเลท';
const SAVE_BUTTON = 'บันทึกการแก้ไข';
const ID_EXISTS_MESSAGE = 'รหัสพาเลทนี้มีอยู่ในระบบแล้ว';

describe('AddPalletModal', () => {
    // นี่คือเทสต์ที่กันไม่ให้ refactor ครั้งต่อไปย้าย toast.error กลับเข้ามาแทนที่
    // idError -- ของเดิมสองกล่อง (Add/Edit) เคยพูดไม่ตรงกันตอนรหัสซ้ำ เพราะ
    // createPallet โยน PostgrestError ดิบที่ describeAppError เพียงอย่างเดียวไม่รู้จัก
    it('รหัสซ้ำ (23505) จาก createPallet ขึ้นข้อความใต้ช่องรหัส และกล่องไม่ปิด', async () => {
        const { createPallet } = await import('../../../services/palletService');
        vi.mocked(createPallet).mockRejectedValue({
            code: '23505',
            message: 'duplicate key value violates unique constraint',
        });

        const onClose = vi.fn();
        const user = userEvent.setup();
        render(
            <AddPalletModal isOpen onClose={onClose} onSuccess={() => {}} departments={[]} />,
        );

        const idInput = screen.getByLabelText(PALLET_ID_LABEL, { exact: false }) as HTMLInputElement;
        await user.type(idInput, 'P001');
        await user.click(screen.getByRole('button', { name: CREATE_BUTTON }));

        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toContain(ID_EXISTS_MESSAGE);

        // กล่องไม่ปิด: ผู้เรียกไม่เคยถูกสั่งให้ปิด และ dialog ยังอยู่ในเอกสาร
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByRole('dialog')).toBeTruthy();
        // ค่าที่พิมพ์ไปยังอยู่ครบ ไม่ถูกล้างทิ้งตอนบันทึกไม่สำเร็จ
        expect(idInput.value).toBe('P001');
    });
});

describe('EditPalletModal', () => {
    const pallet = { id: 'P001', remark: 'หมายเหตุเดิม' };

    // ปิดหน้าต่างของ unhandled rejection ที่ Task 7 เปิดไว้: onSave ปฏิเสธแล้ว
    // handleSubmit ต้องไม่เรียก onClose ข้อความที่ throw มาต้องขึ้นใต้ช่องรหัส
    // (ผูกด้วย aria-describedby จริง ไม่ใช่แค่ปรากฏอยู่ในเอกสารที่ไหนก็ได้) และค่า
    // ที่พิมพ์ไปแล้วต้องไม่หาย
    it('onSave ถูกปฏิเสธ: กล่องไม่ปิด ข้อความขึ้นใต้ช่องรหัส และค่าที่พิมพ์ยังอยู่', async () => {
        const onSave = vi.fn().mockRejectedValue(new Error(ID_EXISTS_MESSAGE));
        const onClose = vi.fn();
        const user = userEvent.setup();
        render(<EditPalletModal isOpen pallet={pallet} onClose={onClose} onSave={onSave} />);

        const idInput = screen.getByLabelText(PALLET_ID_LABEL, { exact: false }) as HTMLInputElement;
        await user.clear(idInput);
        await user.type(idInput, 'P002');
        await user.click(screen.getByRole('button', { name: SAVE_BUTTON }));

        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toContain(ID_EXISTS_MESSAGE);
        expect(idInput.getAttribute('aria-describedby')).toBe(alert.id);

        expect(onClose).not.toHaveBeenCalled();
        expect(idInput.value).toBe('P002');
    });

    // อาการที่เทสต์นี้กัน: แก้ P001 พลาดครั้งหนึ่ง เห็นข้อความผิดพลาดค้างอยู่ แล้วไป
    // แก้แถวอื่น (ปิดกล่องนี้แล้วเปิดใหม่ isOpen false -> true) -- ถ้า error ไม่ถูกล้าง
    // ผู้ใช้จะเห็น "รหัสซ้ำ" ค้างอยู่ใต้ช่องของพาเลทตัวใหม่ที่ไม่เกี่ยวข้องเลย
    it('เปิดใหม่หลังบันทึกไม่สำเร็จ ล้าง error เก่าทิ้ง', async () => {
        const onSave = vi.fn().mockRejectedValue(new Error(ID_EXISTS_MESSAGE));
        const user = userEvent.setup();
        const { rerender } = render(
            <EditPalletModal isOpen pallet={pallet} onClose={() => {}} onSave={onSave} />,
        );

        await user.click(screen.getByRole('button', { name: SAVE_BUTTON }));
        await screen.findByRole('alert');

        rerender(
            <EditPalletModal isOpen={false} pallet={pallet} onClose={() => {}} onSave={onSave} />,
        );
        rerender(
            <EditPalletModal isOpen pallet={pallet} onClose={() => {}} onSave={onSave} />,
        );

        expect(screen.queryByRole('alert')).toBeNull();
        expect((screen.getByLabelText(PALLET_ID_LABEL, { exact: false }) as HTMLInputElement).value).toBe(
            pallet.id,
        );
    });
});
