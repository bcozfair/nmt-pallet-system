import { describe, expect, it } from 'vitest';
import type { Transaction } from '../types';
import { batchKeyOf, groupIntoBatches } from './transactionBatch';

const tx = (over: Partial<Transaction>): Transaction => ({
    id: 'x',
    pallet_id: 'P001',
    user_id: 'staff-1',
    action_type: 'check_out',
    department_origin: 'Warehouse',
    department_dest: 'คลังกลาง',
    evidence_image_url: null,
    timestamp: '2026-08-15T03:00:00.000Z',
    ...over,
});

describe('groupIntoBatches', () => {
    it('แถวที่มี timestamp เท่ากันเป๊ะรวมเป็นชุดเดียว', () => {
        const batches = groupIntoBatches([
            tx({ id: '1', pallet_id: 'P001' }),
            tx({ id: '2', pallet_id: 'P002' }),
        ]);

        expect(batches).toHaveLength(1);
        expect(batches[0].total).toBe(2);
    });

    it('เวลาต่างกันแม้มิลลิวินาทีเดียวคือคนละชุด', () => {
        const batches = groupIntoBatches([
            tx({ id: '1', timestamp: '2026-08-15T03:00:00.000Z' }),
            tx({ id: '2', timestamp: '2026-08-15T03:00:00.001Z' }),
        ]);

        expect(batches).toHaveLength(2);
    });

    it('เวลาเดียวกันแต่คนละปลายทางคือคนละชุด ไม่ยุบรวมเป็นการ์ดเดียว', () => {
        const batches = groupIntoBatches([
            tx({ id: '1', department_dest: 'คลังกลาง' }),
            tx({ id: '2', department_dest: 'ฝ่ายผลิต' }),
        ]);

        expect(batches).toHaveLength(2);
        expect(batchKeyOf(tx({ department_dest: 'คลังกลาง' }))).not.toBe(
            batchKeyOf(tx({ department_dest: 'ฝ่ายผลิต' }))
        );
    });

    it('คืนชุดตามลำดับที่แถวส่งเข้ามา ไม่เรียงใหม่เอง', () => {
        const batches = groupIntoBatches([
            tx({ id: '1', timestamp: '2026-08-15T05:00:00.000Z' }),
            tx({ id: '2', timestamp: '2026-08-15T03:00:00.000Z' }),
            tx({ id: '3', timestamp: '2026-08-15T05:00:00.000Z' }),
        ]);

        expect(batches.map((batch) => batch.timestamp)).toEqual([
            '2026-08-15T05:00:00.000Z',
            '2026-08-15T03:00:00.000Z',
        ]);
        expect(batches[0].total).toBe(2);
    });
});
