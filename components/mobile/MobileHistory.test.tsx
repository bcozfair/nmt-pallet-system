import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Transaction } from '../../types';

// mock ชั้น service ทั้งก้อน หน้านี้ไม่มี prop ให้ป้อนข้อมูลเข้าไปตรง ๆ -- มันโหลดเองตอน mount
const mocks = vi.hoisted(() => ({
    fetchUserTransactions: vi.fn(),
    fetchUserTransactionDates: vi.fn(),
}));

vi.mock('../../services/transactionService', () => ({
    fetchUserTransactions: mocks.fetchUserTransactions,
    fetchUserTransactionDates: mocks.fetchUserTransactionDates,
}));

import { MobileHistory } from './MobileHistory';

// i18n ไม่มี provider ให้ mount -- useT อ่านจาก module singleton ที่ default เป็นไทย
// ป้ายที่เทสต์อ้างถึงจึงเป็นไทยตรง ๆ (locales/th.ts)
const CHECK_OUT = 'เบิกออก';
const DAMAGE = 'แจ้งชำรุด';

// timestamp เดียวกันเป๊ะทั้งสามแถว = การกดบันทึกครั้งเดียว นี่คือสิ่งที่ createBulkTransaction
// เขียนลงฐานข้อมูลจริง และเป็นสัญญาณเดียวที่บอกได้ว่าแถวไหนอยู่ชุดเดียวกัน
const BATCH_TIME = '2026-08-15T03:00:00.000Z';
const DAMAGE_TIME = '2026-08-15T02:00:00.000Z';

const tx = (over: Partial<Transaction> & Pick<Transaction, 'id' | 'pallet_id'>): Transaction => ({
    user_id: 'staff-1',
    action_type: 'check_out',
    department_origin: 'Warehouse',
    department_dest: 'คลังกลาง',
    evidence_image_url: null,
    timestamp: BATCH_TIME,
    ...over,
});

const RETURN_TIME = '2026-08-15T01:00:00.000Z';

const ROWS: Transaction[] = [
    tx({ id: '1', pallet_id: 'P001', transaction_remark: 'ด่วน' }),
    tx({ id: '2', pallet_id: 'P002', transaction_remark: 'ด่วน' }),
    tx({ id: '3', pallet_id: 'P003', transaction_remark: 'ด่วน' }),
    tx({
        id: '4',
        pallet_id: 'P010',
        action_type: 'report_damage',
        department_origin: 'ฝ่ายผลิต',
        department_dest: null,
        timestamp: DAMAGE_TIME,
        transaction_remark: 'ขาแตก',
    }),
    // รับคืนครั้งเดียว แต่พาเลทกลับมาจากคนละแผนก -- ที่มาเป็นของพาเลทแต่ละใบ ไม่ใช่ของชุด
    tx({
        id: '5',
        pallet_id: 'P020',
        action_type: 'check_in',
        department_origin: 'ฝ่ายผลิต',
        department_dest: 'Warehouse',
        timestamp: RETURN_TIME,
    }),
    tx({
        id: '6',
        pallet_id: 'P021',
        action_type: 'check_in',
        department_origin: 'ฝ่ายบรรจุ',
        department_dest: 'Warehouse',
        timestamp: RETURN_TIME,
    }),
];

beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchUserTransactionDates.mockResolvedValue([]);
    mocks.fetchUserTransactions.mockResolvedValue(ROWS);
});

const renderHistory = () => render(<MobileHistory userId="staff-1" onBack={() => {}} />);

// การ์ดที่ล้อมข้อความหนึ่ง ๆ อยู่ -- หน้านี้มีหลายการ์ดที่ใช้คำเดียวกันได้ (Warehouse เป็นทั้ง
// ต้นทางของการเบิกออกและปลายทางของการรับคืน) การตรวจจึงต้องระบุว่ากำลังพูดถึงการ์ดใบไหน
const cardOf = (text: string) =>
    screen.getByText(text).closest('div[class*="rounded-3xl"]') as HTMLElement;

describe('MobileHistory -- การจัดกลุ่มเป็นชุด', () => {
    it('การเบิกออกสามพาเลทครั้งเดียวเป็นการ์ดเดียว บอกจำนวน และยังไม่กางรหัสพาเลทออกมา', async () => {
        renderHistory();

        expect(await screen.findByText('3 พาเลท')).toBeTruthy();
        // ยุบอยู่คือค่าตั้งต้น -- หน้านี้ต้องเปิดมาแล้วเห็นว่า "ทำอะไรไปกี่ครั้ง"
        // ไม่ใช่กำแพงรหัสพาเลทที่ต้องเลื่อนผ่าน
        expect(screen.queryByText('P002')).toBeNull();
        expect(screen.queryByText('P003')).toBeNull();
    });

    it('กดที่การ์ดแล้วเห็นรหัสของทุกพาเลทในชุดนั้น', async () => {
        renderHistory();

        const toggle = await screen.findByRole('button', { name: new RegExp(CHECK_OUT) });
        expect(toggle.getAttribute('aria-expanded')).toBe('false');

        await userEvent.click(toggle);

        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        const panel = screen.getByRole('list');
        expect(within(panel).getByText('P001')).toBeTruthy();
        expect(within(panel).getByText('P002')).toBeTruthy();
        expect(within(panel).getByText('P003')).toBeTruthy();
    });

    it('กดซ้ำแล้วยุบกลับ', async () => {
        renderHistory();

        const toggle = await screen.findByRole('button', { name: new RegExp(CHECK_OUT) });
        await userEvent.click(toggle);
        await userEvent.click(toggle);

        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(screen.queryByRole('list')).toBeNull();
    });

    it('ชุดที่มีพาเลทเดียวโชว์รหัสบนหัวการ์ดเลย และไม่ทำตัวเป็นปุ่มที่กดแล้วไม่เกิดอะไร', async () => {
        renderHistory();

        expect(await screen.findByText('P010')).toBeTruthy();
        expect(screen.queryByRole('button', { name: new RegExp(DAMAGE) })).toBeNull();
    });

    it('หมายเหตุกับปลายทางของชุดอยู่บนหัวการ์ด ไม่ถูกซ่อนไว้หลังการกด', async () => {
        renderHistory();

        // หมายเหตุคือเหตุผลที่พาเลทถูกแจ้งชำรุด และฝั่งพนักงานไม่มีหน้ารายละเอียดให้กดดูต่อ
        expect(await screen.findByText('"ขาแตก"')).toBeTruthy();
        expect(screen.getByText('คลังกลาง')).toBeTruthy();
    });

    it('การเบิกออกบอกเส้นทางครบทั้งต้นทางและปลายทาง', async () => {
        renderHistory();
        await screen.findByText('3 พาเลท');

        const card = cardOf('3 พาเลท');
        expect(within(card).getByText('Warehouse')).toBeTruthy();
        expect(within(card).getByText('คลังกลาง')).toBeTruthy();
    });

    it('การแจ้งชำรุดบอกที่มาอย่างเดียว ไม่มีปลายทาง เพราะไม่ได้ย้ายของไปไหน', async () => {
        renderHistory();

        await screen.findByText('"ขาแตก"');
        const damageCard = cardOf('"ขาแตก"');
        expect(within(damageCard).getByText('ฝ่ายผลิต')).toBeTruthy();
        expect(within(damageCard).queryByText('ไปยัง:')).toBeNull();
    });

    it('ชุดที่พาเลทมาจากคนละจุด หัวการ์ดบอกจำนวนจุด ไม่ใช่หยิบจุดใดจุดหนึ่งมาแสดง', async () => {
        renderHistory();

        // ไม่ใช่ "จาก: ฝ่ายผลิต" ซึ่งจะทำให้ P021 ที่มาจากฝ่ายบรรจุถูกกลบหายไปเงียบ ๆ
        expect(await screen.findByText('2 จุด')).toBeTruthy();
    });

    it('กางชุดที่มาจากหลายจุดแล้วต้องบอกได้ว่าพาเลทใบไหนมาจากไหน', async () => {
        renderHistory();

        const toggle = await screen.findByRole('button', { name: /2 จุด/ });
        await userEvent.click(toggle);

        const panel = screen.getByRole('list');
        const rows = within(panel).getAllByRole('listitem');
        expect(rows.map((row) => row.textContent)).toEqual([
            'P020จาก:ฝ่ายผลิต',
            'P021จาก:ฝ่ายบรรจุ',
        ]);
    });

    it('ค้นหารหัสพาเลท: ชุดที่ตรงกางเอง และป้ายบอกว่าเจอกี่พาเลทจากทั้งชุด', async () => {
        renderHistory();

        await screen.findByText('3 พาเลท');
        await userEvent.type(screen.getByLabelText('ค้นหาประวัติของฉัน'), 'P002');

        // ถ้ายังยุบอยู่ ผู้ใช้จะเห็นแค่การ์ดชุด ไม่เห็นพาเลทที่ตัวเองค้นหา
        expect(within(screen.getByRole('list')).getByText('P002')).toBeTruthy();
        // ไม่ใช่ "1 พาเลท" ซึ่งจะอ่านได้ว่าชุดนั้นมีพาเลทเดียว
        expect(screen.getByText('1 จาก 3 พาเลท')).toBeTruthy();
    });

    it('ชุดที่ผู้ใช้กดยุบเองระหว่างค้นหา ต้องยุบอยู่อย่างนั้น ไม่ถูกกางกลับตอนพิมพ์ตัวถัดไป', async () => {
        renderHistory();

        await screen.findByText('3 พาเลท');
        const search = screen.getByLabelText('ค้นหาประวัติของฉัน');
        await userEvent.type(search, 'P0');

        const toggle = screen.getByRole('button', { name: new RegExp(CHECK_OUT) });
        await userEvent.click(toggle);
        expect(toggle.getAttribute('aria-expanded')).toBe('false');

        await userEvent.type(search, '0');

        expect(
            screen.getByRole('button', { name: new RegExp(CHECK_OUT) }).getAttribute('aria-expanded')
        ).toBe('false');
    });
});
