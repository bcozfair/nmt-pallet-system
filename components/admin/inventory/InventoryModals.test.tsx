import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Pallet } from '../../../types';
import { AppError } from '../../../services/appError';
import { AddPalletModal, EditPalletModal } from './InventoryModals';

// AddPalletModal แตะเครือข่ายผ่าน palletService สองตัว: fetchPallets (คำนวณเลข
// ถัดไปตอนเปิดกล่อง) และ createPallets (ตอนกดยืนยัน) -- mock เฉพาะสองจุดนั้น
// EditPalletModal ไม่แตะ service เอง มันรับ onSave เป็น prop จากผู้เรียก จึงไม่ต้อง
// mock อะไรเพิ่มสำหรับโมดัลนั้น
//
// palletIdSequence ไม่ถูก mock โดยตั้งใจ: มันเป็นฟังก์ชันบริสุทธิ์ที่มีเทสต์ของ
// ตัวเองอยู่แล้ว (services/palletIdSequence.test.ts) และเทสต์ที่นี่ต้องการพิสูจน์ว่า
// โมดัล "ต่อสายถึงมันจริง" ไม่ใช่ว่ามันคำนวณถูก
vi.mock('../../../services/palletService', () => ({
    fetchPallets: vi.fn(),
    createPallets: vi.fn(),
}));

// i18n ไม่มี provider ให้ mount -- useT อ่านจาก module singleton ที่ default เป็นไทย
// ป้ายที่เทสต์อ้างถึงจึงเป็นไทยตรง ๆ (locales/admin/inventory.ts, locales/th.ts)
const PALLET_ID_LABEL = 'รหัสพาเลท';
const QUANTITY_LABEL = 'จำนวน';
const CREATE_BUTTON = 'สร้างพาเลท';
const RECALCULATE_BUTTON = 'คำนวณเลขใหม่';
const SAVE_BUTTON = 'บันทึกการแก้ไข';
// สองข้อความคนละตัว และตั้งใจให้ต่างกัน:
//  - AddPalletModal ได้ AppError('pallet_exists') จาก createPallets ซึ่งระบุรหัส
//    ที่ชนมาด้วย (locales `errors.palletExists`) -- สำคัญตอนเพิ่มทีละ 20 ใบ
//    เพราะบอกได้ว่าใบไหนในชุดที่ชน
//  - EditPalletModal ได้ข้อความจาก useInventoryActions ซึ่งเป็นแบบไม่ระบุรหัส
const ID_EXISTS_NAMED = (id: string) => `รหัสพาเลท ${id} มีอยู่ในระบบแล้ว`;
const ID_EXISTS_MESSAGE = 'รหัสพาเลทนี้มีอยู่ในระบบแล้ว';
const QUANTITY_LOCKED_NOTE = 'ไม่มีตัวเลขท้ายรหัส';

const asPallet = (id: string): Pallet => ({
    pallet_id: id,
    status: 'available',
    current_location: 'Warehouse',
    last_checkout_date: null,
    created_at: '2026-01-01T00:00:00Z',
});

const idField = () => screen.getByLabelText(PALLET_ID_LABEL, { exact: false }) as HTMLInputElement;
const quantityField = () => screen.getByLabelText(QUANTITY_LABEL, { exact: false }) as HTMLInputElement;

beforeEach(async () => {
    const { fetchPallets, createPallets } = await import('../../../services/palletService');
    vi.mocked(fetchPallets).mockResolvedValue([]);
    vi.mocked(createPallets).mockResolvedValue(undefined);
});

describe('AddPalletModal', () => {
    // นี่คือเทสต์ที่กันไม่ให้ refactor ครั้งต่อไปย้าย toast.error กลับเข้ามาแทนที่
    // idError -- ของเดิมสองกล่อง (Add/Edit) เคยพูดไม่ตรงกันตอนรหัสซ้ำ เพราะ
    // createPallet โยน PostgrestError ดิบที่ describeAppError เพียงอย่างเดียวไม่รู้จัก
    // ตอนนี้ createPallets ห่อ 23505 เป็น AppError('pallet_exists') ให้ที่ชั้น service
    it('รหัสซ้ำจาก createPallets ขึ้นข้อความใต้ช่องรหัส และกล่องไม่ปิด', async () => {
        const { createPallets } = await import('../../../services/palletService');
        vi.mocked(createPallets).mockRejectedValue(new AppError('pallet_exists', { palletId: 'P001' }));

        const onClose = vi.fn();
        const user = userEvent.setup();
        render(
            <AddPalletModal isOpen onClose={onClose} onSuccess={() => {}} departments={[]} />,
        );

        await waitFor(() => expect(idField().disabled).toBe(false));
        await user.clear(idField());
        await user.type(idField(), 'P001');
        await user.click(screen.getByRole('button', { name: CREATE_BUTTON }));

        const alert = await screen.findByRole('alert');
        // ระบุรหัสที่ชนด้วย ไม่ใช่ "รหัสนี้มีอยู่แล้ว" ลอย ๆ -- กดเพิ่ม 20 ใบแล้ว
        // ชนใบหนึ่ง ข้อความต้องบอกได้ว่าใบไหน
        expect(alert.textContent).toContain(ID_EXISTS_NAMED('P001'));
        // ผูกจริงด้วย aria-describedby ไม่ใช่แค่ปรากฏอยู่ในเอกสารที่ไหนก็ได้ --
        // ก่อนหน้านี้ตรวจได้แค่ข้อความ ตอนนี้ SelectField/TextInput รับ aria ครบ
        // ก้อนแล้ว ความสัมพันธ์นี้จึงพิสูจน์ได้จริง
        expect(idField().getAttribute('aria-describedby')).toBe(alert.id);

        // กล่องไม่ปิด: ผู้เรียกไม่เคยถูกสั่งให้ปิด และ dialog ยังอยู่ในเอกสาร
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByRole('dialog')).toBeTruthy();
        // ค่าที่พิมพ์ไปยังอยู่ครบ ไม่ถูกล้างทิ้งตอนบันทึกไม่สำเร็จ
        expect(idField().value).toBe('P001');
    });

    // Important #1: initialFocusRef ต้องเอาชนะพฤติกรรมเดิมของ Modal ที่โฟกัส
    // ตัวโฟกัสได้ตัวแรก (ปุ่ม ✕ เพราะหัวมาก่อนเนื้อใน DOM) -- ก่อนหน้านี้ autoFocus
    // บนช่องรหัสตายไปเงียบ ๆ เพราะ effect ของ Modal วิ่งทีหลังเสมอ
    it('เปิดกล่องเพิ่มพาเลท: โฟกัสไปลงที่ช่องรหัสพาเลททันที ไม่ใช่ปุ่มปิด', () => {
        render(<AddPalletModal isOpen onClose={() => {}} onSuccess={() => {}} departments={[]} />);
        expect(document.activeElement).toBe(idField());
    });

    it('เปิดกล่อง: เติมเลขถัดจากรหัสสูงสุดที่มีอยู่ให้เอง', async () => {
        const { fetchPallets } = await import('../../../services/palletService');
        vi.mocked(fetchPallets).mockResolvedValue([asPallet('P001'), asPallet('P023')]);

        render(<AddPalletModal isOpen onClose={() => {}} onSuccess={() => {}} departments={[]} />);

        await waitFor(() => expect(idField().value).toBe('P024'));
    });

    // ระหว่างรอเลข ช่องรหัสถูกปิด ช่องอื่นยังกรอกได้ -- ไม่ใช่ skeleton เต็มโมดัล
    it('ระหว่างรอเลขถัดไป ช่องรหัสถูกปิด แต่ช่องจำนวนยังกรอกได้', async () => {
        const { fetchPallets } = await import('../../../services/palletService');
        let release: (pallets: Pallet[]) => void = () => {};
        vi.mocked(fetchPallets).mockReturnValue(
            new Promise<Pallet[]>((resolve) => {
                release = resolve;
            }),
        );

        render(<AddPalletModal isOpen onClose={() => {}} onSuccess={() => {}} departments={[]} />);

        expect(idField().disabled).toBe(true);
        expect(quantityField().disabled).toBe(false);

        release([asPallet('P001')]);
        await waitFor(() => expect(idField().disabled).toBe(false));
    });

    it('ตัวอย่างช่วงอัปเดตตามจำนวนที่กรอก', async () => {
        const { fetchPallets } = await import('../../../services/palletService');
        vi.mocked(fetchPallets).mockResolvedValue([asPallet('P023')]);

        const user = userEvent.setup();
        render(<AddPalletModal isOpen onClose={() => {}} onSuccess={() => {}} departments={[]} />);
        await waitFor(() => expect(idField().value).toBe('P024'));

        await user.clear(quantityField());
        await user.type(quantityField(), '20');

        // ทั้งรหัสเริ่ม รหัสจบ และจำนวน ต้องอยู่ในบรรทัดเดียวกัน -- รหัสจบคือเลขที่
        // คนเอาไปเทียบกับสติกเกอร์ QR ที่กำลังจะพิมพ์
        expect(await screen.findByText(/จะสร้าง P024 – P043 รวม 20 ใบ/)).toBeTruthy();
    });

    it('จำนวน 20 ส่ง createPallets ครบ 20 รหัสในคำสั่งเดียว', async () => {
        const { fetchPallets, createPallets } = await import('../../../services/palletService');
        vi.mocked(fetchPallets).mockResolvedValue([asPallet('P023')]);

        const user = userEvent.setup();
        render(<AddPalletModal isOpen onClose={() => {}} onSuccess={() => {}} departments={[]} />);
        await waitFor(() => expect(idField().value).toBe('P024'));

        await user.clear(quantityField());
        await user.type(quantityField(), '20');
        await user.click(screen.getByRole('button', { name: CREATE_BUTTON }));

        await waitFor(() => expect(createPallets).toHaveBeenCalledOnce());
        const [ids, location] = vi.mocked(createPallets).mock.calls[0];
        // เรียกครั้งเดียวด้วยรายการเต็ม ไม่ใช่วนเรียก 20 ครั้ง -- นั่นคือสิ่งที่ทำให้
        // "ชนกลางทางแล้วไม่เข้าเลยทั้งชุด" เป็นจริงโดยไม่ต้องเขียน rollback เอง
        expect(ids).toHaveLength(20);
        expect(ids[0]).toBe('P024');
        expect(ids[19]).toBe('P043');
        expect(location).toBe('Warehouse');
    });

    it('รหัสที่ไม่มีเลขท้าย ล็อกจำนวนเป็น 1 พร้อมบอกเหตุผล', async () => {
        const user = userEvent.setup();
        render(<AddPalletModal isOpen onClose={() => {}} onSuccess={() => {}} departments={[]} />);
        await waitFor(() => expect(idField().disabled).toBe(false));

        await user.clear(idField());
        await user.type(idField(), 'TEST');

        expect(quantityField().disabled).toBe(true);
        expect(quantityField().value).toBe('1');
        // ช่องที่ถูกปิดโดยไม่บอกเหตุผลอ่านเหมือนหน้าจอพัง
        expect(await screen.findByText(new RegExp(QUANTITY_LOCKED_NOTE))).toBeTruthy();
    });

    // ปุ่มนี้แก้เคสที่แท็บอื่นแย่งรหัสไปแล้ว โดยไม่ต้องปิดเปิดกล่องใหม่ ซึ่งจะทำให้
    // ช่องสถานที่กับจำนวนที่ตั้งไว้แล้วหายไปด้วย
    it('กด "คำนวณเลขใหม่" หลังรหัสชน ดึงรายการใหม่แล้วเติมเลขที่ว่างให้', async () => {
        const { fetchPallets, createPallets } = await import('../../../services/palletService');
        vi.mocked(fetchPallets).mockResolvedValue([asPallet('P023')]);
        vi.mocked(createPallets).mockRejectedValue(new AppError('pallet_exists', { palletId: 'P024' }));

        const user = userEvent.setup();
        render(<AddPalletModal isOpen onClose={() => {}} onSuccess={() => {}} departments={[]} />);
        await waitFor(() => expect(idField().value).toBe('P024'));

        await user.click(screen.getByRole('button', { name: CREATE_BUTTON }));
        await screen.findByRole('alert');

        // อีกแท็บสร้าง P024 ไปแล้ว การดึงรอบใหม่จึงเห็นมันด้วย
        vi.mocked(fetchPallets).mockResolvedValue([asPallet('P023'), asPallet('P024')]);
        await user.click(screen.getByRole('button', { name: RECALCULATE_BUTTON }));

        await waitFor(() => expect(idField().value).toBe('P025'));
        // ข้อความผิดพลาดหายไปพร้อมกับเลขใหม่ ไม่ค้างอยู่ใต้ช่องที่แก้แล้ว
        expect(screen.queryByRole('alert')).toBeNull();
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
