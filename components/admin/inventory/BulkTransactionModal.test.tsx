import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BulkTransactionModal } from './BulkTransactionModal';

// i18n ไม่มี provider ให้ mount -- useT อ่านจาก module singleton ที่ default เป็นไทย
// ป้ายที่เทสต์อ้างถึงจึงเป็นไทยตรง ๆ (locales/th.ts, locales/admin/inventory.ts)
const DATE_LABEL = 'วันที่';
const INVALID_DATE_TIME_MESSAGE = 'กรุณาระบุวันที่และเวลาให้ถูกต้อง';

describe('BulkTransactionModal', () => {
    // ของเดิมต่อ `new Date(...).toISOString()` ตรง ๆ โดยไม่ตรวจก่อน -- ช่องวันที่
    // ว่างทำให้ Invalid Date แล้ว .toISOString() โยน RangeError ตกไปใน catch ที่มี
    // แค่ console.error กดยืนยันแล้วไม่มีอะไรเกิดขึ้นเลย ไม่มีข้อความ ไม่มีสัญญาณว่าพัง
    // เทสต์นี้กันไม่ให้อาการนั้นย้อนกลับมา
    //
    // ยิง submit event ตรงเข้า <form> แทนการคลิกปุ่มยืนยัน: ปุ่มเป็น
    // type="submit" ที่ผูกด้วย attribute `form` ไปยัง <form> ซึ่งมีช่องวันที่/เวลา
    // เป็น `required` -- คลิกปุ่มจริงจะโดน constraint validation ของเบราว์เซอร์
    // (และ jsdom) ดักไว้ก่อน ไม่ปล่อยให้ submit event ไปถึง React เลย ทั้งที่สิ่งที่
    // ต้องการเทสต์คือ guard ระดับ JS ข้างในเมื่อ submit event มาถึงจริง ๆ
    it('ล้างช่องวันที่แล้ว submit ฟอร์ม: ขึ้นข้อความผิดพลาดใต้ช่องวันที่ และไม่เรียก onConfirm', async () => {
        const onConfirm = vi.fn().mockResolvedValue(undefined);
        const onClose = vi.fn();

        render(
            <BulkTransactionModal
                isOpen
                onClose={onClose}
                onConfirm={onConfirm}
                selectedCount={2}
                selectedIds={['P001', 'P002']}
                departments={[]}
            />,
        );

        const dateInput = screen.getByLabelText(DATE_LABEL, { exact: false }) as HTMLInputElement;
        fireEvent.change(dateInput, { target: { value: '' } });

        // Modal พอร์ทัลออกไปที่ document.body เสมอ (ดู Modal.tsx) -- ไม่ได้อยู่ใต้
        // `container` ที่ render() คืนมา ต้องหา <form> จาก document โดยตรง
        const form = document.querySelector('form') as HTMLFormElement;
        fireEvent.submit(form);

        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toContain(INVALID_DATE_TIME_MESSAGE);
        expect(dateInput.getAttribute('aria-describedby')).toBe(alert.id);
        expect(dateInput.getAttribute('aria-invalid')).toBe('true');

        expect(onConfirm).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });

    // แก้ช่องวันที่ใหม่หลังเจอ error ต้องล้าง error เก่าทิ้งทันที ไม่ใช่ค้างจนกว่าจะ
    // กด submit ซ้ำ -- ผู้ใช้เห็นข้อความผิดพลาดหายไปพร้อมกับที่พิมพ์ ไม่ใช่ยังค้างอยู่
    // ทั้งที่กำลังแก้ให้ถูกอยู่แล้ว
    it('พิมพ์วันที่ใหม่หลังเจอ error: ข้อความผิดพลาดหายไปทันที', async () => {
        const onConfirm = vi.fn().mockResolvedValue(undefined);

        render(
            <BulkTransactionModal
                isOpen
                onClose={() => {}}
                onConfirm={onConfirm}
                selectedCount={1}
                selectedIds={['P001']}
                departments={[]}
            />,
        );

        const dateInput = screen.getByLabelText(DATE_LABEL, { exact: false }) as HTMLInputElement;
        fireEvent.change(dateInput, { target: { value: '' } });

        // Modal พอร์ทัลออกไปที่ document.body เสมอ (ดู Modal.tsx) -- ไม่ได้อยู่ใต้
        // `container` ที่ render() คืนมา ต้องหา <form> จาก document โดยตรง
        const form = document.querySelector('form') as HTMLFormElement;
        fireEvent.submit(form);
        await screen.findByRole('alert');

        fireEvent.change(dateInput, { target: { value: '2026-07-28' } });

        expect(screen.queryByRole('alert')).toBeNull();
    });
});
