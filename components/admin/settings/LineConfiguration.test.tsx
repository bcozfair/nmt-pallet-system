import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LineConfiguration } from './LineConfiguration';
import type { SystemSettings } from '../../../services/settingsService';

// i18n ไม่มี provider ให้ mount -- useT อ่านจาก module singleton ที่ default เป็นไทย
// ป้ายที่เทสต์อ้างถึงจึงเป็นไทยตรง ๆ (locales/admin/settings.ts)
const CONFIGURED = 'ตั้งค่าแล้ว';
const NOT_CONFIGURED = 'ยังไม่ได้ตั้งค่า';
const UNKNOWN = 'ตรวจสอบสถานะไม่ได้';

// หัวใจของบั๊กนี้: RLS ("Allow public read access ... using (is_secret = false)")
// กรองสองแถวนี้ทิ้งก่อนถึงเบราว์เซอร์เสมอ ค่าที่ component ได้รับจึงเป็น '' ทั้งที่
// ฐานข้อมูลมีค่าอยู่จริง สถานะบนป้ายจึงห้ามอ่านจากตรงนี้
const hiddenSecrets: SystemSettings = {
    admin_email_base: 'bcozfair@gmail.com',
    overdue_days: 7,
    line_channel_token: '',
    line_target_id: '',
    report_scheduled_days: ['Mon'],
    report_time_morning: '08:00',
    report_time_evening: '16:00',
};

describe('LineConfiguration -- ป้ายสถานะการตั้งค่า', () => {
    it('ขึ้น "ตั้งค่าแล้ว" เมื่อฐานข้อมูลมีค่าครบ แม้ค่าที่ส่งมาให้จะถูก RLS ซ่อนจนว่าง', () => {
        render(
            <LineConfiguration
                settings={hiddenSecrets}
                lineStatus="configured"
                onChange={() => {}}
            />,
        );
        expect(screen.getByText(CONFIGURED)).toBeTruthy();
        expect(screen.queryByText(NOT_CONFIGURED)).toBeNull();
    });

    it('ขึ้น "ยังไม่ได้ตั้งค่า" เมื่อฐานข้อมูลยังไม่มีค่าจริง', () => {
        render(
            <LineConfiguration
                settings={hiddenSecrets}
                lineStatus="not_configured"
                onChange={() => {}}
            />,
        );
        expect(screen.getByText(NOT_CONFIGURED)).toBeTruthy();
    });

    // ถ้า RPC ยังไม่ถูกติดตั้ง หรือคนที่เปิดหน้านี้ไม่ใช่แอดมิน เราไม่รู้สถานะจริง
    // การเดาว่า "ยังไม่ได้ตั้งค่า" คือการกลับไปโกหกแบบเดิม แค่คนละทิศ
    it('บอกตรง ๆ ว่าตรวจสอบไม่ได้ แทนที่จะเดาว่ายังไม่ได้ตั้งค่า', () => {
        render(
            <LineConfiguration
                settings={hiddenSecrets}
                lineStatus="unknown"
                onChange={() => {}}
            />,
        );
        expect(screen.getByText(UNKNOWN)).toBeTruthy();
        expect(screen.queryByText(CONFIGURED)).toBeNull();
        expect(screen.queryByText(NOT_CONFIGURED)).toBeNull();
    });

    // ป้ายรายงานสิ่งที่ "บันทึกไว้แล้ว" ไม่ใช่สิ่งที่พิมพ์ค้างอยู่ในช่อง มิฉะนั้น
    // มันจะเขียวตั้งแต่ยังไม่กดบันทึก แล้วเด้งกลับเป็นเทาเมื่อรีเฟรชหน้า
    it('ไม่เปลี่ยนเป็นเขียวเพราะแค่พิมพ์ค่าลงช่องแต่ยังไม่บันทึก', async () => {
        const user = userEvent.setup();
        render(
            <LineConfiguration
                settings={hiddenSecrets}
                lineStatus="not_configured"
                onChange={() => {}}
            />,
        );
        await user.type(screen.getByLabelText(/Channel Access Token/), 'abc');
        expect(screen.getByText(NOT_CONFIGURED)).toBeTruthy();
    });
});
