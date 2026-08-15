import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Transaction } from '../../../types';
import { TransactionTable } from './TransactionTable';

// useT อ่านจาก module singleton ที่ default เป็นไทย ป้ายที่อ้างถึงจึงเป็นไทยตรง ๆ
// (locales/admin/transactions.ts)
const COL_ORIGIN = 'จาก';
const COL_DEST = 'ไปยัง';
const VIEW_EVIDENCE = 'ดูรูปหลักฐาน';
const VIEW_DAMAGE_EVIDENCE = 'ดูรูปหลักฐานจากรายงานความเสียหายที่เป็นเหตุให้ตัดออก';

const tx = (over: Partial<Transaction>): Transaction => ({
    id: 'tx-1',
    pallet_id: 'P001',
    user_id: 'staff-1',
    action_type: 'check_out',
    department_origin: 'คลังกลาง',
    department_dest: 'ฝ่ายผลิต',
    evidence_image_url: null,
    timestamp: '2026-08-15T03:00:00.000Z',
    ...over,
});

const setup = (rows: Transaction[], inheritedEvidence: Record<string, string> = {}) => {
    const onViewImage = vi.fn();
    render(
        <TransactionTable
            paginatedTransactions={rows}
            totalProcessedCount={rows.length}
            sortConfig={null}
            onSort={() => {}}
            currentPage={1}
            itemsPerPage={20}
            totalPages={1}
            setCurrentPage={() => {}}
            userMap={{ 'staff-1': 'สมชาย ใจดี' }}
            onClearFilters={() => {}}
            onViewImage={onViewImage}
            inheritedEvidence={inheritedEvidence}
            onEdit={() => {}}
            onDelete={() => {}}
            isLoading={false}
        />,
    );
    return { onViewImage };
};

// แถวข้อมูลแถวแรก -- แถวที่ 0 คือหัวตาราง
const dataRow = () => screen.getAllByRole('row')[1];

describe('TransactionTable -- คอลัมน์ต้นทาง/ปลายทาง', () => {
    it('มีหัวคอลัมน์ทั้ง "จาก" และ "ไปยัง"', () => {
        setup([tx({})]);
        expect(screen.getByRole('columnheader', { name: COL_ORIGIN })).toBeTruthy();
        expect(screen.getByRole('columnheader', { name: COL_DEST })).toBeTruthy();
    });

    it('แถวเบิกออกแสดงทั้งต้นทางและปลายทาง', () => {
        setup([tx({})]);
        const row = within(dataRow());
        expect(row.getByText('คลังกลาง')).toBeTruthy();
        expect(row.getByText('ฝ่ายผลิต')).toBeTruthy();
    });

    // นี่คือกรณีที่คอลัมน์ "สถานที่" เดิมตอบไม่ได้เลย: ปลายทางเป็น null ทั้งคอลัมน์
    it('แถวแจ้งชำรุดบอกได้ว่าพาเลทอยู่ที่ไหนตอนถูกแจ้ง แม้ไม่มีปลายทาง', () => {
        setup([tx({ action_type: 'report_damage', department_origin: 'ฝ่ายบรรจุ', department_dest: null })]);
        expect(within(dataRow()).getByText('ฝ่ายบรรจุ')).toBeTruthy();
    });

    it('แถวก่อน migration 01 ที่ไม่มีต้นทาง แสดงขีดคั่น ไม่ใช่ช่องว่างเปล่า', () => {
        setup([tx({ department_origin: null })]);
        // ทั้งคอลัมน์ต้นทางและคอลัมน์หลักฐานเป็นขีด แถวนี้จึงมีขีดมากกว่าหนึ่งจุด
        expect(within(dataRow()).getAllByText('-').length).toBeGreaterThan(0);
    });
});

describe('TransactionTable -- รูปหลักฐานของแถวตัดออกจากระบบ', () => {
    const scrapRow = tx({
        id: 'scrap-1',
        action_type: 'scrap',
        department_dest: null,
        evidence_image_url: null,
    });

    it('แสดงปุ่มดูรูป และส่งชื่อไฟล์ที่ยืมมาให้ผู้เรียกเมื่อกด', async () => {
        const user = userEvent.setup();
        const { onViewImage } = setup([scrapRow], { 'scrap-1': 'dmg.jpg' });

        const button = screen.getByRole('button', { name: VIEW_DAMAGE_EVIDENCE });
        await user.click(button);

        expect(onViewImage).toHaveBeenCalledWith('dmg.jpg');
    });

    it('ไม่มีรายงานความเสียหายให้ยืม ก็ไม่แสดงปุ่ม ไม่ใช่ปุ่มที่กดแล้วเปิดอะไรไม่ได้', () => {
        setup([scrapRow]);
        expect(screen.queryByRole('button', { name: VIEW_DAMAGE_EVIDENCE })).toBeNull();
        expect(screen.queryByRole('button', { name: VIEW_EVIDENCE })).toBeNull();
    });

    it('รูปของแถวเองมาก่อนรูปที่ยืมมาเสมอ', async () => {
        const user = userEvent.setup();
        const { onViewImage } = setup(
            [tx({ id: 'd1', action_type: 'report_damage', evidence_image_url: 'own.jpg' })],
            { d1: 'borrowed.jpg' },
        );

        await user.click(screen.getByRole('button', { name: VIEW_EVIDENCE }));
        expect(onViewImage).toHaveBeenCalledWith('own.jpg');
    });

    it('รูปที่ถูกลบไปแล้วไม่กลายเป็นปุ่ม', () => {
        setup([tx({ id: 'd1', action_type: 'report_damage', evidence_image_url: 'image_deleted' })]);
        expect(screen.queryByRole('button', { name: VIEW_EVIDENCE })).toBeNull();
    });
});
