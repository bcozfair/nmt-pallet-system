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

    it('เปิดเฉพาะเกินกำหนดแล้ว พร้อมใช้ กับ เสียหาย เป็น 0 -- ตั้งใจ ไม่ใช่บั๊ก', async () => {
        const { result } = renderHook(() => useInventoryFilters(FLEET));
        result.current.setShowOverdueOnly(true);
        // เกินกำหนดได้ต้องเป็น in_use เท่านั้น P-04 ตัวเดียวที่เกิน 7 วัน
        await waitFor(() => expect(result.current.statusCounts.in_use).toBe(1));
        expect(result.current.statusCounts.available).toBe(0);
        expect(result.current.statusCounts.damaged).toBe(0);
        expect(result.current.statusCounts.all).toBe(1);
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
        result.current.setShowOverdueOnly(true);
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
        result.current.setShowOverdueOnly(true);
        await waitFor(() => expect(result.current.activeFilterCount).toBe(2));
        result.current.handleClearFilters();
        await waitFor(() => expect(result.current.activeFilterCount).toBe(0));
    });
});
