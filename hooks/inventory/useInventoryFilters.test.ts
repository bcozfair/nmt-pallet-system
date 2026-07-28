import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { Pallet } from '../../types';
import { useInventoryFilters } from './useInventoryFilters';

// ตัดสองอย่างที่ hook ไปคุยกับข้างนอกออก: การดึงรายชื่อแผนกและค่า threshold
// จาก system_settings ทั้งคู่ไม่เกี่ยวกับกฎการนับที่กำลังทดสอบ
vi.mock('../../services/departmentService', () => ({
    fetchDepartments: () => Promise.resolve([]),
}));
vi.mock('../useOverdueThreshold', () => ({
    useOverdueThreshold: () => ({ days: 7 }),
}));

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 3600 * 1000).toISOString();

const pallet = (over: Partial<Pallet> & Pick<Pallet, 'pallet_id' | 'status'>): Pallet =>
    ({
        current_location: 'Warehouse',
        last_transaction_date: daysAgo(1),
        last_checkout_date: null,
        pallet_remark: null,
        ...over,
    }) as Pallet;

const FLEET: Pallet[] = [
    pallet({ pallet_id: 'P-01', status: 'available' }),
    pallet({ pallet_id: 'P-02', status: 'available', current_location: 'Line A' }),
    pallet({ pallet_id: 'P-03', status: 'in_use', last_checkout_date: daysAgo(2) }),
    pallet({ pallet_id: 'P-04', status: 'in_use', last_checkout_date: daysAgo(30) }),
    pallet({ pallet_id: 'P-05', status: 'damaged' }),
    pallet({ pallet_id: 'P-06', status: 'scrapped' }),
];

describe('useInventoryFilters — statusCounts', () => {
    it('all ไม่รวม scrapped และ scrapped นับแยก', () => {
        const { result } = renderHook(() => useInventoryFilters(FLEET));
        expect(result.current.statusCounts.all).toBe(5);
        expect(result.current.statusCounts.scrapped).toBe(1);
    });

    it('นับแยกตามสถานะได้ถูก', () => {
        const { result } = renderHook(() => useInventoryFilters(FLEET));
        expect(result.current.statusCounts.available).toBe(2);
        expect(result.current.statusCounts.in_use).toBe(2);
        expect(result.current.statusCounts.damaged).toBe(1);
    });

    it('ตัวกรองสถานะไม่กระทบตัวเลขในช่องอื่น', async () => {
        const { result } = renderHook(() => useInventoryFilters(FLEET));
        result.current.setStatusFilter('damaged');
        await waitFor(() => expect(result.current.processedPallets).toHaveLength(1));
        // ตัวเลขต้องยังบอกว่า "ถ้ากดช่องนั้นจะได้เท่าไหร่" ไม่ใช่กลายเป็น 0 ทั้งแถว
        expect(result.current.statusCounts.available).toBe(2);
        expect(result.current.statusCounts.in_use).toBe(2);
        expect(result.current.statusCounts.all).toBe(5);
    });

    it('ตัวกรองสถานที่กระทบตัวเลขทุกช่อง', async () => {
        const { result } = renderHook(() => useInventoryFilters(FLEET));
        result.current.setLocationFilter('Line A');
        await waitFor(() => expect(result.current.statusCounts.all).toBe(1));
        expect(result.current.statusCounts.available).toBe(1);
        expect(result.current.statusCounts.in_use).toBe(0);
    });

    it('นับเกินกำหนดถูก และเป็นสับเซ็ตของถูกเบิกออก ไม่ใช่สถานะที่หก', () => {
        const { result } = renderHook(() => useInventoryFilters(FLEET));
        // เกินกำหนดต้องเป็น in_use เท่านั้น P-04 เบิกไป 30 วัน (เกิน 7)
        // ส่วน P-03 เพิ่งเบิก 2 วัน จึงยังไม่เกิน
        expect(result.current.statusCounts.overdue).toBe(1);
        expect(result.current.statusCounts.in_use).toBe(2);
        // ห้าตัวเลขนี้จงใจบวกกันไม่เท่ากับ all เพราะเกินกำหนดซ้อนอยู่ในถูกเบิกออก
        expect(result.current.statusCounts.all).toBe(5);
    });

    // เดิมเกินกำหนดเป็น toggle แยกที่กรองก่อนชั้นนับ พอเปิดแล้วช่องอื่นเหลือ 0
    // หมดทั้งแถว -- ตอนนั้นล็อกไว้ว่า "ตั้งใจ" เพราะแก้ไม่ได้ในโครงนั้น
    // พอย้ายมาเป็นไทล์ที่ห้าในชั้นเดียวกับสถานะอื่น อาการนั้นหายไปเอง
    // เทสต์นี้แทนที่ตัวเดิม และยืนยันสิ่งที่ตรงกันข้ามกับที่ตัวเดิมล็อกไว้
    it('เลือกไทล์เกินกำหนดแล้ว ตัวเลขช่องอื่นต้องไม่กลายเป็น 0', async () => {
        const { result } = renderHook(() => useInventoryFilters(FLEET));
        result.current.setStatusFilter('overdue');
        await waitFor(() => expect(result.current.processedPallets).toHaveLength(1));
        expect(result.current.processedPallets[0].pallet_id).toBe('P-04');
        expect(result.current.statusCounts.available).toBe(2);
        expect(result.current.statusCounts.damaged).toBe(1);
        expect(result.current.statusCounts.all).toBe(5);
    });

    // เส้นทางที่ KPI "เกินกำหนด" บนแดชบอร์ดกดแล้วเด้งมาหน้านี้
    it('initialFilter=overdue เลือกไทล์เกินกำหนดให้ตั้งแต่เข้าหน้า', async () => {
        const { result } = renderHook(() => useInventoryFilters(FLEET, 'overdue'));
        await waitFor(() => expect(result.current.statusFilter).toBe('overdue'));
        expect(result.current.processedPallets).toHaveLength(1);
        expect(result.current.activeFilterCount).toBe(1);
    });

    it('ค้นหาแล้วตัวเลขขยับตาม', async () => {
        const { result } = renderHook(() => useInventoryFilters(FLEET));
        result.current.setSearchTerm('P-05');
        await waitFor(() => expect(result.current.statusCounts.all).toBe(1));
        expect(result.current.statusCounts.damaged).toBe(1);
        expect(result.current.statusCounts.available).toBe(0);
    });
});

describe('useInventoryFilters — activeFilterCount', () => {
    it('เป็น 0 ตอนเริ่มต้น', () => {
        const { result } = renderHook(() => useInventoryFilters(FLEET));
        expect(result.current.activeFilterCount).toBe(0);
    });

    it('นับตัวกรองแต่ละชนิดที่ติดอยู่', async () => {
        const { result } = renderHook(() => useInventoryFilters(FLEET));
        result.current.setSearchTerm('P-0');
        await waitFor(() => expect(result.current.activeFilterCount).toBe(1));
        result.current.setLocationFilter('Line A');
        await waitFor(() => expect(result.current.activeFilterCount).toBe(2));
        // เกินกำหนดนับผ่าน statusFilter ไม่ใช่พจน์แยก -- ถ้ามีสองที่จะนับซ้ำเป็น 4
        result.current.setStatusFilter('overdue');
        await waitFor(() => expect(result.current.activeFilterCount).toBe(3));
    });

    it('ช่วงวันที่นับเป็นหนึ่งตัวกรองไม่ว่าจะกรอกข้างเดียวหรือสองข้าง', async () => {
        const { result } = renderHook(() => useInventoryFilters(FLEET));
        result.current.setDateRange({ start: '2026-01-01', end: '' });
        await waitFor(() => expect(result.current.activeFilterCount).toBe(1));
        result.current.setDateRange({ start: '2026-01-01', end: '2026-02-01' });
        await waitFor(() => expect(result.current.activeFilterCount).toBe(1));
    });

    it('handleClearFilters ล้างกลับเป็น 0', async () => {
        const { result } = renderHook(() => useInventoryFilters(FLEET));
        result.current.setSearchTerm('P-0');
        result.current.setStatusFilter('overdue');
        await waitFor(() => expect(result.current.activeFilterCount).toBe(2));
        result.current.handleClearFilters();
        await waitFor(() => expect(result.current.activeFilterCount).toBe(0));
    });
});
