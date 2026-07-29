import { describe, expect, it, vi, beforeEach } from 'vitest';

// vi.mock ถูกยกขึ้นไปบนสุดของไฟล์ก่อน const ทุกตัว การอ้าง vi.fn() ที่ประกาศ
// ด้วย const ธรรมดาข้างในโรงงานจึงพังด้วย TDZ -- vi.hoisted ยกมันขึ้นไปด้วยกัน
const mocks = vi.hoisted(() => ({
    rpc: vi.fn(),
    upsert: vi.fn(),
}));

vi.mock('./supabase', () => ({
    supabase: {
        rpc: mocks.rpc,
        from: vi.fn(() => ({ upsert: mocks.upsert })),
    },
}));

import { updateSystemSetting } from './settingsService';

beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    mocks.upsert.mockResolvedValue({ error: null });
});

// สองแถวนี้ตั้ง is_secret = true และ policy ฝั่ง SELECT ของ system_settings คือ
// `using (is_secret = false)` มันจึงมองไม่เห็นจากเบราว์เซอร์ -- ซึ่งเป็นสิ่งที่
// ตั้งใจ เพราะ token ต้องไม่เดินทางมาถึง client
//
// ผลข้างเคียงที่ไม่ได้ตั้งใจคือ .upsert() เขียนมันไม่ได้เลย: PostgREST แปล upsert
// เป็น INSERT ... ON CONFLICT DO UPDATE และ Postgres บังคับใช้ policy ฝั่ง SELECT
// กับ "แถวเดิมที่ชนกัน" บนเส้นทางนั้นด้วย แถวที่มองไม่เห็นจึงอัปเดตไม่ได้ ตอบกลับ
// เป็น 42501 "new row violates row-level security policy (USING expression)"
//
// ทางออกไม่ใช่การเปิด policy ให้แอดมินอ่าน token ได้ -- นั่นคือการรื้อเหตุผลที่
// ตารางนี้แยก is_secret ตั้งแต่แรก แต่เป็นการเขียนผ่าน RPC ที่เป็น SECURITY
// DEFINER เหมือนที่ admin_email_base ทำอยู่แล้ว
describe('updateSystemSetting -- ค่าลับต้องไม่เขียนผ่าน upsert', () => {
    it.each(['line_channel_token', 'line_target_id'])(
        'ส่ง %s เข้า RPC แทนการ upsert ตรงเข้าตาราง',
        async (key) => {
            await updateSystemSetting(key, 'ค่าใหม่');

            expect(mocks.rpc).toHaveBeenCalledWith('update_secret_setting', {
                setting_key: key,
                setting_value: 'ค่าใหม่',
            });
            expect(mocks.upsert).not.toHaveBeenCalled();
        },
    );

    // ถ้า RPC ล้ม ต้องโยนต่อ ไม่ใช่คืน true -- SettingsView อ่านค่านี้เพื่อตัดสินใจ
    // ว่าจะขึ้น toast ว่าบันทึกสำเร็จหรือไม่ การกลืน error ตรงนี้คือการขึ้น
    // "บันทึกเรียบร้อย" ทับความจริงว่าไม่มีอะไรถูกบันทึก
    it('โยน error ของ RPC ต่อ ไม่กลืนแล้วรายงานว่าสำเร็จ', async () => {
        const failure = { message: 'permission denied' };
        mocks.rpc.mockResolvedValue({ data: null, error: failure });

        await expect(updateSystemSetting('line_target_id', 'U123')).rejects.toBe(failure);
    });

    // ด้านกลับของกฎเดียวกัน: คีย์ธรรมดายังต้องเดินทางเดิม การเหวี่ยงทุกอย่างเข้า
    // RPC จะทำให้ฟังก์ชันที่ตั้งใจรับเฉพาะค่าลับกลายเป็นประตูเขียนอะไรก็ได้
    it('คีย์ที่ไม่ลับยังใช้ upsert ตามเดิม', async () => {
        await updateSystemSetting('overdue_days', '7');

        expect(mocks.upsert).toHaveBeenCalledTimes(1);
        expect(mocks.rpc).not.toHaveBeenCalled();
    });
});
