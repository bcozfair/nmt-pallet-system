import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StaffHeader } from './StaffHeader';
import { setLanguage } from '../../services/i18n';
import type { User } from '../../types';

const staff: User = {
    id: 'u1',
    employee_id: 'EMP001',
    full_name: 'สมชาย ใจดี',
    role: 'staff',
    department: 'คลังกลาง',
};

beforeEach(() => {
    setLanguage('th');
});

describe('StaffHeader', () => {
    it('โหมดผู้ใช้: ชื่อเป็นหัวเรื่องระดับหน้า และมีแผนกกับบทบาทกำกับ', () => {
        render(<StaffHeader user={staff} onLogout={() => {}} />);

        expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('สมชาย ใจดี');
        expect(screen.getByText(/คลังกลาง/).textContent).toContain('พนักงาน');
    });

    it('ปุ่มออกจากระบบมีชื่อเรียก ทั้งที่เป็นปุ่มไอคอนล้วน', async () => {
        const onLogout = vi.fn();
        const user = userEvent.setup();
        render(<StaffHeader user={staff} onLogout={onLogout} />);

        await user.click(screen.getByRole('button', { name: 'ออกจากระบบ' }));
        expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it('โหมดชื่อหน้า: ไม่มีบล็อกผู้ใช้ และปุ่มย้อนกลับมีชื่อเรียก', async () => {
        const onBack = vi.fn();
        const user = userEvent.setup();
        render(<StaffHeader title="ประวัติของฉัน" onBack={onBack} />);

        expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('ประวัติของฉัน');
        expect(screen.queryByText('สมชาย ใจดี')).toBeNull();

        await user.click(screen.getByRole('button', { name: 'ย้อนกลับ' }));
        expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('มีปุ่มสลับภาษาทุกโหมด -- ก่อนหน้านี้ฝั่งพนักงานไม่มีเลย', () => {
        const { rerender } = render(<StaffHeader user={staff} onLogout={() => {}} />);
        expect(screen.getByRole('button', { name: 'EN' })).toBeTruthy();

        rerender(<StaffHeader title="ประวัติของฉัน" onBack={() => {}} />);
        expect(screen.getByRole('button', { name: 'EN' })).toBeTruthy();
    });
});
