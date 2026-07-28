import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Pallet } from '../../types';
import { useInventoryActions } from './useInventoryActions';

// Mock the dependencies so we never touch the network
vi.mock('../../services/palletService', () => ({
    deletePallet: vi.fn(),
    updatePallet: vi.fn(),
}));

vi.mock('../../services/transactionService', () => ({
    resolveDamage: vi.fn(),
    scrapPallet: vi.fn(),
    createBulkTransaction: vi.fn(),
}));

vi.mock('../../services/userService', () => ({
    fetchUsers: vi.fn(),
}));

vi.mock('../../services/supabase', () => ({
    supabase: {},
}));

vi.mock('../../services/toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));

vi.mock('../../services/i18n', () => ({
    dict: () => ({
        inventory: {
            idExists: 'รหัสพาเลทนี้มีอยู่ในระบบแล้ว',
            updateFailed: 'บันทึกข้อมูลพาเลทไม่สำเร็จ',
        },
    }),
}));

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        user: {
            id: 'test-user-1',
            full_name: 'Test User',
            email: 'test@example.com',
        },
    }),
}));

describe('useInventoryActions — handleSavePalletEdit', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('บันทึกสำเร็จแล้ว resolve ไม่โยน', async () => {
        const { updatePallet } = await import('../../services/palletService');
        vi.mocked(updatePallet).mockResolvedValue(undefined);

        const { result } = renderHook(() => useInventoryActions(() => {}, () => {}));

        const testPallet: Pallet = {
            pallet_id: 'P-01',
            status: 'available',
            current_location: 'Warehouse',
            last_checkout_date: null,
            created_at: '2026-01-01T00:00:00Z',
        };

        // Should not throw when save succeeds
        await expect(
            result.current.handleSavePalletEdit('P-01', testPallet, {
                pallet_id: 'P-01',
                pallet_remark: 'Test remark',
            })
        ).resolves.toBeUndefined();
    });

    it('บันทึกไม่สำเร็จ รหัส 23505 (ซ้ำ) โยน error ข้อความเป็น inventory.idExists', async () => {
        const { updatePallet } = await import('../../services/palletService');
        vi.mocked(updatePallet).mockRejectedValue({ code: '23505', message: 'Duplicate key' });

        const { result } = renderHook(() => useInventoryActions(() => {}, () => {}));

        const testPallet: Pallet = {
            pallet_id: 'P-01',
            status: 'available',
            current_location: 'Warehouse',
            last_checkout_date: null,
            created_at: '2026-01-01T00:00:00Z',
        };

        // Should reject with idExists message
        await expect(
            result.current.handleSavePalletEdit('P-01', testPallet, {
                pallet_id: 'P-02',
                pallet_remark: 'Test remark',
            })
        ).rejects.toThrow('รหัสพาเลทนี้มีอยู่ในระบบแล้ว');
    });

    it('บันทึกไม่สำเร็จ รหัสอื่น โยน error ข้อความเป็น inventory.updateFailed', async () => {
        const { updatePallet } = await import('../../services/palletService');
        vi.mocked(updatePallet).mockRejectedValue({ code: 'GENERIC_ERROR', message: 'Something went wrong' });

        const { result } = renderHook(() => useInventoryActions(() => {}, () => {}));

        const testPallet: Pallet = {
            pallet_id: 'P-01',
            status: 'available',
            current_location: 'Warehouse',
            last_checkout_date: null,
            created_at: '2026-01-01T00:00:00Z',
        };

        // Should reject with updateFailed message
        await expect(
            result.current.handleSavePalletEdit('P-01', testPallet, {
                pallet_id: 'P-01',
                pallet_remark: 'Updated remark',
            })
        ).rejects.toThrow('บันทึกข้อมูลพาเลทไม่สำเร็จ');
    });

});
