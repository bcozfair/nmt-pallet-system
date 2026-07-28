import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Field } from './Field';
import { TextInput } from './TextInput';

describe('Field', () => {
    it('ผูกป้ายกับช่องจริง คลิกป้ายแล้วโฟกัสเข้าช่อง', async () => {
        const user = userEvent.setup();
        render(
            <Field label="รหัสพาเลท" htmlFor="pallet-id">
                {(aria) => <TextInput {...aria} defaultValue="" />}
            </Field>,
        );
        const input = screen.getByLabelText('รหัสพาเลท');
        expect(input.tagName).toBe('INPUT');
        await user.click(screen.getByText('รหัสพาเลท'));
        expect(document.activeElement).toBe(input);
    });

    it('ไม่ประกาศ aria-describedby เมื่อไม่มีคำอธิบายใด ๆ', () => {
        render(
            <Field label="รหัสพาเลท" htmlFor="pallet-id">
                {(aria) => <TextInput {...aria} />}
            </Field>,
        );
        expect(screen.getByLabelText('รหัสพาเลท').getAttribute('aria-describedby')).toBeNull();
    });

    it('ผูก hint เข้ากับช่องผ่าน aria-describedby', () => {
        render(
            <Field label="รหัสพาเลท" htmlFor="pallet-id" hint="เช่น P105">
                {(aria) => <TextInput {...aria} />}
            </Field>,
        );
        const input = screen.getByLabelText('รหัสพาเลท');
        const describedBy = input.getAttribute('aria-describedby');
        expect(describedBy).toBeTruthy();
        expect(document.getElementById(describedBy as string)?.textContent).toContain('เช่น P105');
    });

    it('error ทับ hint และตั้ง aria-invalid', () => {
        render(
            <Field label="รหัสพาเลท" htmlFor="pallet-id" hint="เช่น P105" error="รหัสนี้มีอยู่แล้ว">
                {(aria) => <TextInput {...aria} />}
            </Field>,
        );
        const input = screen.getByLabelText('รหัสพาเลท');
        expect(input.getAttribute('aria-invalid')).toBe('true');
        const describedBy = input.getAttribute('aria-describedby');
        const note = document.getElementById(describedBy as string);
        expect(note?.textContent).toContain('รหัสนี้มีอยู่แล้ว');
        expect(note?.textContent).not.toContain('เช่น P105');
    });

    it('error ประกาศตัวเป็น alert เพื่อให้ถูกอ่านทันทีที่โผล่', () => {
        render(
            <Field label="รหัสพาเลท" htmlFor="pallet-id" error="รหัสนี้มีอยู่แล้ว">
                {(aria) => <TextInput {...aria} />}
            </Field>,
        );
        expect(screen.getByRole('alert').textContent).toContain('รหัสนี้มีอยู่แล้ว');
    });

    it('warning แสดงเมื่อไม่มี error และไม่ตั้ง aria-invalid', () => {
        render(
            <Field label="รหัสพาเลท" htmlFor="pallet-id" warning="เปลี่ยนรหัสแล้วประวัติจะย้ายตาม">
                {(aria) => <TextInput {...aria} />}
            </Field>,
        );
        const input = screen.getByLabelText('รหัสพาเลท');
        expect(input.getAttribute('aria-invalid')).toBeNull();
        expect(screen.queryByRole('alert')).toBeNull();
        const describedBy = input.getAttribute('aria-describedby');
        expect(document.getElementById(describedBy as string)?.textContent).toContain(
            'เปลี่ยนรหัสแล้วประวัติจะย้ายตาม',
        );
    });

    it('required ทำให้ช่องประกาศ aria-required', () => {
        render(
            <Field label="ปลายทาง" htmlFor="dest" required>
                {(aria) => <TextInput {...aria} />}
            </Field>,
        );
        expect(screen.getByLabelText(/ปลายทาง/).getAttribute('aria-required')).toBe('true');
    });

    // orientation ย้ายแค่ตำแหน่งบนกริด สายที่ประกอบขึ้นจาก htmlFor ต้องไม่รู้สึกอะไร
    // เลย -- เคสพวกนี้คือสิ่งที่กันไม่ให้การจัดหน้าไปตัดสายนั้นขาดโดยไม่มีใครเห็น
    describe('orientation="horizontal"', () => {
        it('ยังผูกป้ายกับช่องจริง คลิกป้ายแล้วโฟกัสเข้าช่อง', async () => {
            const user = userEvent.setup();
            render(
                <Field label="อีเมลหลัก" htmlFor="admin-email" orientation="horizontal">
                    {(aria) => <TextInput {...aria} type="email" defaultValue="" />}
                </Field>,
            );
            const input = screen.getByLabelText('อีเมลหลัก');
            expect(input.tagName).toBe('INPUT');
            await user.click(screen.getByText('อีเมลหลัก'));
            expect(document.activeElement).toBe(input);
        });

        it('ยังเดิน aria-describedby ไปยังคำเตือน แม้คำเตือนจะอยู่คนละแถวกับช่อง', () => {
            render(
                <Field
                    label="อีเมลหลัก"
                    htmlFor="admin-email"
                    orientation="horizontal"
                    warning="คำเตือน: ผู้ใช้ทุกคนต้องเข้าสู่ระบบด้วยโดเมนใหม่"
                >
                    {(aria) => <TextInput {...aria} type="email" />}
                </Field>,
            );
            const input = screen.getByLabelText('อีเมลหลัก');
            expect(input.getAttribute('aria-invalid')).toBeNull();
            const describedBy = input.getAttribute('aria-describedby');
            expect(describedBy).toBeTruthy();
            expect(document.getElementById(describedBy as string)?.textContent).toContain(
                'โดเมนใหม่',
            );
        });

        it('error ยังทับ warning และยังประกาศตัวเป็น alert', () => {
            render(
                <Field
                    label="อีเมลหลัก"
                    htmlFor="admin-email"
                    orientation="horizontal"
                    warning="ระวัง"
                    error="อีเมลไม่ถูกต้อง"
                >
                    {(aria) => <TextInput {...aria} type="email" />}
                </Field>,
            );
            const input = screen.getByLabelText('อีเมลหลัก');
            expect(input.getAttribute('aria-invalid')).toBe('true');
            const note = screen.getByRole('alert');
            expect(note.textContent).toContain('อีเมลไม่ถูกต้อง');
            expect(note.textContent).not.toContain('ระวัง');
            expect(input.getAttribute('aria-describedby')).toBe(note.id);
        });
    });
});
