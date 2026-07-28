import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkTransactionModal } from './BulkTransactionModal';
import type { Department } from '../../../types';

// i18n ไม่มี provider ให้ mount -- useT อ่านจาก module singleton ที่ default เป็นไทย
// ป้ายที่เทสต์อ้างถึงจึงเป็นไทยตรง ๆ (locales/th.ts, locales/admin/inventory.ts)
const DATE_LABEL = 'วันที่';
const TIME_LABEL = 'เวลา';
const DESTINATION_LABEL = 'ปลายทาง';
const CONFIRM_BUTTON = 'ยืนยัน';
const CHECK_IN_RADIO = 'รับคืน';
const INVALID_DATE_TIME_MESSAGE = 'กรุณาระบุวันที่และเวลาให้ถูกต้อง';
const SELECT_DESTINATION_MESSAGE = 'เลือกสถานที่';

const departments: Department[] = [{ id: 'd1', name: 'คลัง A', is_active: true }];

describe('BulkTransactionModal', () => {
    // ของเดิมต่อ `new Date(...).toISOString()` ตรง ๆ โดยไม่ตรวจก่อน -- ช่องวันที่
    // ว่างทำให้ Invalid Date แล้ว .toISOString() โยน RangeError ตกไปใน catch ที่มี
    // แค่ console.error กดยืนยันแล้วไม่มีอะไรเกิดขึ้นเลย ไม่มีข้อความ ไม่มีสัญญาณว่าพัง
    // เทสต์นี้กันไม่ให้อาการนั้นย้อนกลับมา
    //
    // คลิกปุ่มยืนยันจริง ไม่ใช่ยิง submit event ตรง ๆ: <form> ปิด native
    // constraint validation ไว้แล้วด้วย `noValidate` (ดูคอมเมนต์ที่ <form> ใน
    // BulkTransactionModal.tsx) ทำให้คลิกจริงไปถึง handleSubmit ได้โดยไม่โดน
    // เบราว์เซอร์ดักด้วย tooltip ที่ไม่มีสไตล์และไม่แปลไทยก่อน -- ถ้าเทสต์นี้กลับมา
    // ใช้ synthetic submit event เหมือนเดิม จะไม่มีทางจับได้เลยว่า noValidate หายไป
    it('ล้างช่องวันที่แล้วกดยืนยัน: ขึ้นข้อความผิดพลาดใต้ช่องวันที่ และไม่เรียก onConfirm', async () => {
        const onConfirm = vi.fn().mockResolvedValue(undefined);
        const onClose = vi.fn();
        const user = userEvent.setup();

        render(
            <BulkTransactionModal
                isOpen
                onClose={onClose}
                onConfirm={onConfirm}
                selectedCount={2}
                selectedIds={['P001', 'P002']}
                departments={departments}
            />,
        );

        // เลี่ยงไม่ให้ปลายทางว่างมาปนเป็นอีก error: เลือก "รับคืน" ซึ่งไม่ต้องมี
        // ปลายทาง เพื่อให้เทสต์นี้โฟกัสที่ช่องวันที่ล้วน ๆ
        await user.click(screen.getByRole('radio', { name: CHECK_IN_RADIO }));

        const dateInput = screen.getByLabelText(DATE_LABEL, { exact: false }) as HTMLInputElement;
        await user.clear(dateInput);

        await user.click(screen.getByRole('button', { name: CONFIRM_BUTTON }));

        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toContain(INVALID_DATE_TIME_MESSAGE);
        expect(dateInput.getAttribute('aria-describedby')).toBe(alert.id);
        expect(dateInput.getAttribute('aria-invalid')).toBe('true');

        expect(onConfirm).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });

    // ช่องเวลาว่างต้องขึ้นข้อความใต้ช่องเวลา ไม่ใช่ช่องวันที่ -- ก่อนหน้านี้ dateError
    // เป็นสถานะเดียวที่ผูกกับ Field ของช่องวันที่เท่านั้น เคลียร์แค่ช่องเวลาแล้วกด
    // ยืนยันจะเห็นข้อความไปโผล่ใต้ช่องวันที่ที่กรอกถูกอยู่แล้ว ผู้ใช้จึงไม่รู้ว่าช่อง
    // ไหนกันแน่ที่ต้องแก้
    it('ล้างช่องเวลาแล้วกดยืนยัน: ขึ้นข้อความผิดพลาดใต้ช่องเวลา ไม่ใช่ช่องวันที่ และไม่เรียก onConfirm', async () => {
        const onConfirm = vi.fn().mockResolvedValue(undefined);
        const onClose = vi.fn();
        const user = userEvent.setup();

        render(
            <BulkTransactionModal
                isOpen
                onClose={onClose}
                onConfirm={onConfirm}
                selectedCount={2}
                selectedIds={['P001', 'P002']}
                departments={departments}
            />,
        );

        await user.click(screen.getByRole('radio', { name: CHECK_IN_RADIO }));

        const timeInput = screen.getByLabelText(TIME_LABEL, { exact: false }) as HTMLInputElement;
        await user.clear(timeInput);

        await user.click(screen.getByRole('button', { name: CONFIRM_BUTTON }));

        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toContain(INVALID_DATE_TIME_MESSAGE);
        expect(timeInput.getAttribute('aria-describedby')).toBe(alert.id);
        expect(timeInput.getAttribute('aria-invalid')).toBe('true');

        // ช่องวันที่ยังถูกอยู่ ต้องไม่มี error ติดมาด้วย
        const dateInput = screen.getByLabelText(DATE_LABEL, { exact: false }) as HTMLInputElement;
        expect(dateInput.getAttribute('aria-invalid')).toBeNull();

        expect(onConfirm).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });

    // เบิกออกโดยไม่เลือกปลายทาง: ของเดิมพึ่ง HTML `required` บน <select> ล้วน ๆ
    // ตอนนี้ไม่มีให้พึ่งแล้วเพราะฟอร์มปิด native validation (`noValidate`) จึงต้อง
    // มี guard ฝั่ง JS เอง ไม่งั้นส่งปลายทางว่างเปล่าไป onConfirm (แล้วต่อไปยัง
    // createBulkTransaction) ได้เงียบ ๆ
    it('เบิกออกโดยไม่เลือกปลายทาง: ขึ้นข้อความผิดพลาดใต้ช่องปลายทาง และไม่เรียก onConfirm', async () => {
        const onConfirm = vi.fn().mockResolvedValue(undefined);
        const onClose = vi.fn();
        const user = userEvent.setup();

        render(
            <BulkTransactionModal
                isOpen
                onClose={onClose}
                onConfirm={onConfirm}
                selectedCount={1}
                selectedIds={['P001']}
                departments={departments}
            />,
        );

        // action ตั้งต้นเป็น "เบิกออก" อยู่แล้ว และวันที่/เวลาตั้งต้นถูกทั้งคู่ --
        // ไม่ต้องแตะอะไรนอกจากกดยืนยันตรง ๆ เพื่อให้เหลือปลายทางเป็นตัวปัญหาเดียว
        await user.click(screen.getByRole('button', { name: CONFIRM_BUTTON }));

        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toContain(SELECT_DESTINATION_MESSAGE);

        // Important #2: SelectField ต้องประกาศตัวเองว่าผิดพลาดจริง ไม่ใช่แค่มี
        // ข้อความสีแดงอยู่ข้างล่างเฉย ๆ -- ก่อนหน้านี้ call site คัดมาแค่ aria.id
        // ตัว <select> จึงไม่มี aria-invalid และไม่ประกาศอะไรตอนคีย์บอร์ดแท็บกลับมา
        const destinationSelect = screen.getByLabelText(DESTINATION_LABEL, {
            exact: false,
        }) as HTMLSelectElement;
        expect(destinationSelect.getAttribute('aria-invalid')).toBe('true');
        expect(destinationSelect.getAttribute('aria-describedby')).toBe(alert.id);

        expect(onConfirm).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });

    // เพื่อไม่ให้ guard ทั้งหมดข้างบนกลายเป็นการปิดกั้นทุกการ submit ไปเลย:
    // กรอกครบ ถูกทุกช่อง ต้องเรียก onConfirm จริง พร้อม timestamp UTC ที่ประกอบ
    // จากวันที่/เวลาท้องถิ่นถูกต้อง -- ตรรกะแปลงเวลาต้องไม่เปลี่ยนไปจากของเดิม
    it('กรอกครบทุกช่องแล้วกดยืนยัน: เรียก onConfirm พร้อม timestamp UTC ที่ประกอบถูกต้อง', async () => {
        const onConfirm = vi.fn().mockResolvedValue(undefined);
        const onClose = vi.fn();
        const user = userEvent.setup();

        render(
            <BulkTransactionModal
                isOpen
                onClose={onClose}
                onConfirm={onConfirm}
                selectedCount={1}
                selectedIds={['P001']}
                departments={departments}
            />,
        );

        const dateInput = screen.getByLabelText(DATE_LABEL, { exact: false }) as HTMLInputElement;
        const timeInput = screen.getByLabelText(TIME_LABEL, { exact: false }) as HTMLInputElement;
        await user.clear(dateInput);
        await user.type(dateInput, '2026-07-28');
        await user.clear(timeInput);
        await user.type(timeInput, '14:30');

        const destinationSelect = screen.getByLabelText(DESTINATION_LABEL, {
            exact: false,
        }) as HTMLSelectElement;
        await user.selectOptions(destinationSelect, 'คลัง A');

        await user.click(screen.getByRole('button', { name: CONFIRM_BUTTON }));

        // คำนวณด้วยวิธีเดียวกับที่คอมโพเนนต์ทำ (ตีความเป็นเวลาท้องถิ่นแล้วแปลงเป็น
        // UTC) เพื่อไม่ต้องพึ่ง timezone ของเครื่องที่รันเทสต์
        const expectedIso = new Date('2026-07-28T14:30').toISOString();

        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(onConfirm).toHaveBeenCalledWith('check_out', 'คลัง A', '', expectedIso);
        expect(screen.queryByRole('alert')).toBeNull();
    });

    // แก้ช่องวันที่ใหม่หลังเจอ error ต้องล้าง error เก่าทิ้งทันที ไม่ใช่ค้างจนกว่าจะ
    // กดยืนยันซ้ำ -- ผู้ใช้เห็นข้อความผิดพลาดหายไปพร้อมกับที่พิมพ์ ไม่ใช่ยังค้างอยู่
    // ทั้งที่กำลังแก้ให้ถูกอยู่แล้ว
    it('พิมพ์วันที่ใหม่หลังเจอ error: ข้อความผิดพลาดหายไปทันที', async () => {
        const onConfirm = vi.fn().mockResolvedValue(undefined);
        const user = userEvent.setup();

        render(
            <BulkTransactionModal
                isOpen
                onClose={() => {}}
                onConfirm={onConfirm}
                selectedCount={1}
                selectedIds={['P001']}
                departments={departments}
            />,
        );

        await user.click(screen.getByRole('radio', { name: CHECK_IN_RADIO }));

        const dateInput = screen.getByLabelText(DATE_LABEL, { exact: false }) as HTMLInputElement;
        await user.clear(dateInput);
        await user.click(screen.getByRole('button', { name: CONFIRM_BUTTON }));
        await screen.findByRole('alert');

        await user.type(dateInput, '2026-07-28');

        expect(screen.queryByRole('alert')).toBeNull();
    });
});
