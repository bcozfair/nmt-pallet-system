import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PalletDetailModal } from './PalletDetailModal';
import type { ActionType, Pallet, Transaction } from '../../../types';

// เทสต์นี้ pin บั๊กที่ Task 10 แก้: ของเดิมทาสี dot ด้วยโซ่ ternary ที่ else
// สุดท้ายแปลว่า "แจ้งชำรุด" ทำให้ 'scrap' ถูกทาสีเดียวกับ 'report_damage' --
// ไทม์ไลน์จึงแสดงรายงานความเสียหายสองครั้งโดยไม่มีร่องรอยว่าพาเลทถูกตัดออกจาก
// ระบบไปแล้ว ตอนนี้ dot มาจาก DOT_COLOR ที่ `satisfies Record<ActionType, string>`
// จึงพลาดเคสไม่ได้ตั้งแต่คอมไพล์
vi.mock('../../../services/transactionService', () => ({
    fetchPalletHistory: vi.fn(),
}));
vi.mock('../../../services/userService', () => ({
    fetchUsers: vi.fn(),
}));
vi.mock('../../../services/storageService', async () => {
    const actual = await vi.importActual<typeof import('../../../services/storageService')>(
        '../../../services/storageService',
    );
    return {
        ...actual,
        getEvidenceSignedUrlMap: vi.fn().mockResolvedValue({}),
    };
});

const pallet: Pallet = {
    pallet_id: 'P001',
    status: 'available',
    current_location: 'คลัง A',
    last_checkout_date: null,
    created_at: '2026-01-01T00:00:00.000Z',
};

const ACTION_TYPES: ActionType[] = ['check_out', 'check_in', 'repair', 'scrap', 'report_damage'];

const makeHistory = (): Transaction[] =>
    ACTION_TYPES.map((action_type, i) => ({
        id: `tx-${i}`,
        pallet_id: 'P001',
        user_id: 'u1',
        action_type,
        department_dest: null,
        evidence_image_url: null,
        timestamp: `2026-01-0${i + 1}T00:00:00.000Z`,
    }));

// ป้ายข้อความจาก locales/th.ts (t.action) -- useT อ่านค่า default เป็นไทยเสมอ
// เพราะไม่มี provider ให้ mount ในเทสต์นี้
const ACTION_LABEL_TH: Record<ActionType, string> = {
    check_out: 'เบิกออก',
    check_in: 'รับคืน',
    report_damage: 'แจ้งชำรุด',
    repair: 'ซ่อมแล้ว',
    scrap: 'ตัดออกจากระบบ',
};

describe('PalletDetailModal', () => {
    it('ทุก ActionType บนไทม์ไลน์มีสี dot ของตัวเอง ไม่มีสองเคสใช้สีร่วมกัน', async () => {
        const { fetchPalletHistory } = await import('../../../services/transactionService');
        const { fetchUsers } = await import('../../../services/userService');
        vi.mocked(fetchPalletHistory).mockResolvedValue(makeHistory());
        vi.mocked(fetchUsers).mockResolvedValue([]);

        render(<PalletDetailModal pallet={pallet} onClose={() => {}} />);

        // รอให้แถวประวัติของ action สุดท้าย (scrap อยู่ก่อน report_damage ในลำดับ
        // ที่ประกอบไว้ข้างบน) ขึ้นจริง แปลว่าโหลดเสร็จและ dot เรนเดอร์ครบแล้ว
        await screen.findByText(ACTION_LABEL_TH.report_damage);

        // ค้นด้วย document.body ไม่ใช่ container ที่ render() คืนมา: <Modal>
        // เรนเดอร์ผ่าน createPortal ไป document.body ตรง ๆ ต้นไม้ของมันจึงไม่อยู่
        // ใต้ container wrapper ของ RTL เลย -- screen.findByText ข้างบนหาเจอเพราะ
        // มันค้นทั้งเอกสาร แต่ container.querySelectorAll จะไม่เห็นอะไรเลย
        //
        // แถวประวัติแต่ละแถวมี dot เป็น div เดียวที่ผสม rounded-full กับ
        // border-2 border-white -- StatusBadge ก็ใช้ rounded-full เหมือนกันแต่ไม่มี
        // border-2 border-white ผสม จึงไม่ปนกัน
        const dots = Array.from(
            document.body.querySelectorAll('.rounded-full.border-2.border-white'),
        ) as HTMLElement[];

        expect(dots).toHaveLength(ACTION_TYPES.length);

        const dotClasses = dots.map((dot) => dot.className);
        const uniqueClasses = new Set(dotClasses);

        // ประเด็นหลักของเทสต์: 5 action type ต้องได้ 5 สีที่ไม่ซ้ำกัน
        // (ของเดิม: scrap กับ report_damage ตกไปอยู่คลาสเดียวกัน)
        expect(uniqueClasses.size).toBe(ACTION_TYPES.length);

        // ตรวจตรง ๆ ว่า scrap ไม่ได้ใช้ token เดียวกับ report_damage
        const scrapDot = dots[ACTION_TYPES.indexOf('scrap')];
        const damageDot = dots[ACTION_TYPES.indexOf('report_damage')];
        expect(scrapDot.className).toContain('--color-series-scrap');
        expect(damageDot.className).toContain('--color-series-damage');
        expect(scrapDot.className).not.toBe(damageDot.className);
    });
});
