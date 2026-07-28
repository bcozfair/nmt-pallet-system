import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

// ป้ายจาก locales/admin/modals.ts (t.modals) -- useT อ่านค่า default เป็นไทยเสมอ
const EVIDENCE_ALT = 'หลักฐาน';
const PREVIEW_ALT = 'ตัวอย่างรูป';

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
    // อาการที่เทสต์นี้กัน: ไทล์ "ทำรายการล่าสุด" เคยอ่าน `last_checkout_date` ซึ่ง
    // transactionService ล้างเป็น null ทุกครั้งที่รับคืน/ซ่อม/ตัดออกจากระบบ
    // (transactionService.ts:229, 344, 410, 517) พาเลทที่ถูกรับคืนแล้วจึงขึ้นว่า
    // "ไม่เคยใช้งาน" ทั้งที่ไทม์ไลน์ใต้ไทล์นั้นแสดงรายการมาแล้วหลายแถว
    //
    // ฟิลด์ที่ตรงกับป้ายคือ `last_transaction_date` -- ทุกทางเขียนอัปเดตค่านี้
    // (types.ts:31, dashboardAnalytics.ts:687-691)
    it('ไทล์ "ทำรายการล่าสุด" อ่าน last_transaction_date ไม่ใช่ last_checkout_date', async () => {
        const { fetchPalletHistory } = await import('../../../services/transactionService');
        const { fetchUsers } = await import('../../../services/userService');
        vi.mocked(fetchPalletHistory).mockResolvedValue(makeHistory());
        vi.mocked(fetchUsers).mockResolvedValue([]);

        // พาเลทที่ "ถูกรับคืนแล้ว": เคยเบิกออกจริง แต่ last_checkout_date ถูกล้าง
        const returned: Pallet = {
            ...pallet,
            last_checkout_date: null,
            last_transaction_date: '2026-01-05T00:00:00.000Z',
        };

        render(<PalletDetailModal pallet={returned} onClose={() => {}} />);

        expect(await screen.findByText('05-Jan-2026')).toBeTruthy();
        expect(screen.queryByText('ไม่เคยใช้งาน')).toBeNull();
    });

    // ไม่มีร่องรอยการทำรายการเลยจริง ๆ จึงค่อยขึ้น "ไม่เคยใช้งาน"
    it('พาเลทที่ยังไม่เคยมีรายการเลย ยังขึ้นว่า "ไม่เคยใช้งาน"', async () => {
        const { fetchPalletHistory } = await import('../../../services/transactionService');
        const { fetchUsers } = await import('../../../services/userService');
        vi.mocked(fetchPalletHistory).mockResolvedValue([]);
        vi.mocked(fetchUsers).mockResolvedValue([]);

        render(<PalletDetailModal pallet={pallet} onClose={() => {}} />);

        expect(await screen.findByText('ไม่เคยใช้งาน')).toBeTruthy();
    });

    it('ทุก ActionType บนไทม์ไลน์มีสี dot ของตัวเอง ไม่มีสองเคสใช้สีร่วมกัน', async () => {
        const { fetchPalletHistory } = await import('../../../services/transactionService');
        const { fetchUsers } = await import('../../../services/userService');
        vi.mocked(fetchPalletHistory).mockResolvedValue(makeHistory());
        vi.mocked(fetchUsers).mockResolvedValue([]);

        render(<PalletDetailModal pallet={pallet} onClose={() => {}} />);

        // รอให้แถวประวัติของ action สุดท้าย (scrap อยู่ก่อน report_damage ในลำดับ
        // ที่ประกอบไว้ข้างบน) ขึ้นจริง แปลว่าโหลดเสร็จและ dot เรนเดอร์ครบแล้ว
        await screen.findByText(ACTION_LABEL_TH.report_damage);

        // screen.getAllByTestId ค้นทั้งเอกสาร (ไม่ใช่แค่ container ที่ render() คืนมา)
        // ซึ่งจำเป็นจริง: <Modal> เรนเดอร์ผ่าน createPortal ไป document.body ตรง ๆ
        // ต้นไม้ของมันจึงไม่อยู่ใต้ container wrapper ของ RTL เลย
        //
        // เลือกด้วย data-testid="timeline-dot" ไม่ใช่ CSS class เพราะประเด็นของ
        // เทสต์นี้คือ "สีแม็ปกับ action type ถูกไหม" ไม่ใช่ "dot ทรงกลมมีขอบขาวไหม"
        // -- การ restyle dot ในอนาคตไม่ควรทำให้เทสต์นี้พังไปด้วย
        const dots = screen.getAllByTestId('timeline-dot');

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

    // อาการที่เทสต์นี้กัน: รูปหลักฐานเคยเป็น <img onClick> ล้วน ๆ กดได้ด้วยเมาส์
    // อย่างเดียว คีย์บอร์ดเข้าไม่ถึงเลย ตอนนี้เป็น <button> จริง (ดูคอมเมนต์ใน
    // PalletDetailModal.tsx ที่ตำแหน่งปุ่มรูปหลักฐาน) -- เทสต์นี้ยืนยันว่าโฟกัส
    // ด้วยคีย์บอร์ดได้ และ Enter เปิดตัวดูรูปได้เหมือนคลิกด้วยเมาส์
    it('รูปหลักฐานเป็นปุ่มจริง โฟกัสด้วยคีย์บอร์ดได้ และ Enter เปิดตัวดูรูป', async () => {
        const { fetchPalletHistory } = await import('../../../services/transactionService');
        const { fetchUsers } = await import('../../../services/userService');
        const { getEvidenceSignedUrlMap } = await import('../../../services/storageService');

        const historyWithEvidence: Transaction[] = [
            {
                id: 'tx-evidence',
                pallet_id: 'P001',
                user_id: 'u1',
                action_type: 'report_damage',
                department_dest: null,
                evidence_image_url: 'damage-reports/P001-1.jpg',
                timestamp: '2026-01-01T00:00:00.000Z',
            },
        ];

        vi.mocked(fetchPalletHistory).mockResolvedValue(historyWithEvidence);
        vi.mocked(fetchUsers).mockResolvedValue([]);
        vi.mocked(getEvidenceSignedUrlMap).mockResolvedValue({
            'damage-reports/P001-1.jpg': 'https://example.com/signed-evidence.jpg',
        });

        const user = userEvent.setup();
        render(<PalletDetailModal pallet={pallet} onClose={() => {}} />);

        const evidenceButton = await screen.findByRole('button', { name: EVIDENCE_ALT });

        // โฟกัสด้วยคีย์บอร์ดได้จริง ไม่ใช่แค่เมาส์คลิกได้
        evidenceButton.focus();
        expect(document.activeElement).toBe(evidenceButton);

        await user.keyboard('{Enter}');

        expect(await screen.findByRole('heading', { name: PREVIEW_ALT })).toBeTruthy();
    });
});
