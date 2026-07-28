import React, { useState, useEffect } from 'react';
import { Save, Database } from 'lucide-react';
import { NotificationSettings } from './NotificationSettings';
import { LineConfiguration } from './LineConfiguration';
import { DangerZone } from './DangerZone';
import { Button, ConfirmDialog, PageHeader, SkeletonCard, StickyHeader } from '../../ui';

import { toast } from '../../../services/toast';
import { fetchAllSystemSettings, fetchLineConfigStatus, updateSystemSetting, LineConfigStatus, SystemSettings } from '../../../services/settingsService';
import { invalidateSettings } from '../../../services/settingsCache';
import { useT } from '../../../hooks/useT';
import { dict } from '../../../services/i18n';
import { describeAppError } from '../../../services/appError';


const SettingsView: React.FC = () => {
    const t = useT();

    // --- State ---
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // System Settings State
    const [settings, setSettings] = useState<SystemSettings>({
        admin_email_base: '',
        overdue_days: 7,
        line_channel_token: '',
        line_target_id: '',
        report_scheduled_days: [],
        report_time_morning: '08:00',
        report_time_evening: '16:00'
    });

    // แยกจาก settings ข้างบนโดยตั้งใจ: สองค่าลับของ LINE ถูก RLS กรองทิ้งก่อนถึง
    // เบราว์เซอร์ settings.line_* จึงเป็น '' เสมอและใช้บอกสถานะไม่ได้
    const [lineStatus, setLineStatus] = useState<LineConfigStatus>('unknown');

    // Modal State
    const [confirmAction, setConfirmAction] = useState<{
        title: string;
        message: string;
        confirmLabel: string;
        isDestructive?: boolean;
        onConfirm: () => Promise<void>;
    } | null>(null);





    // --- Effects ---
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setIsLoading(true);
        try {
            // ขนานกัน: สถานะ LINE มาจาก RPC คนละทางกับตารางการตั้งค่า และการที่ RPC
            // ล้มไม่ควรทำให้ทั้งหน้าโหลดไม่ขึ้น -- fetchLineConfigStatus จับ error
            // ของตัวเองแล้วคืน 'unknown' อยู่แล้ว
            const [data, status] = await Promise.all([
                fetchAllSystemSettings(),
                fetchLineConfigStatus(),
            ]);
            setSettings(data);
            setLineStatus(status);
        } catch (error) {
            console.error("Failed to load settings", error);
            // dict() rather than the `t` above: this runs from the mount effect
            // and from onConfirm, so it must read the language at call time
            // instead of the one captured by the first render's closure.
            toast.error(dict().settings.loadFailed);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Handlers ---

    // Generic setting change handler
    const handleChange = (key: keyof SystemSettings, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };



    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            await updateSystemSetting('overdue_days', settings.overdue_days.toString());

            // Only update secrets if they are not empty strings
            if (settings.line_channel_token) {
                await updateSystemSetting('line_channel_token', settings.line_channel_token);
            }
            if (settings.line_target_id) {
                await updateSystemSetting('line_target_id', settings.line_target_id);
            }

            await updateSystemSetting('report_scheduled_days', JSON.stringify(settings.report_scheduled_days));
            await updateSystemSetting('report_time_morning', settings.report_time_morning);
            await updateSystemSetting('report_time_evening', settings.report_time_evening);

            // overdue_days is cached in a module singleton so that non-component
            // callers can read it too, which means the save above is invisible
            // until something tells that cache to forget. Without this line the
            // dashboard, the location table and the inventory filter keep using
            // the pre-save threshold for the rest of the session while the LINE
            // report -- which reads the database directly -- already uses the new
            // one. Inside the try, after the writes succeeded: invalidating on a
            // failed save would only throw away a value that is still correct.
            invalidateSettings();

            // ป้ายบนการ์ด LINE รายงานสิ่งที่บันทึกแล้ว ไม่ใช่สิ่งที่พิมพ์ค้างในช่อง
            // ถ้าไม่ถามใหม่ตรงนี้ คนที่เพิ่งกรอก token ครั้งแรกจะเห็นป้ายเทาต่อไป
            // จนกว่าจะรีเฟรชหน้า ทั้งที่บันทึกสำเร็จไปแล้ว
            setLineStatus(await fetchLineConfigStatus());

            toast.success(t.settings.saved);
        } catch (error: any) {
            toast.error(t.settings.saveFailed(describeAppError(error)));
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateEmailBase = () => {
        setConfirmAction({
            title: t.settings.confirmEmailTitle,
            message: t.settings.confirmEmailMessage,
            confirmLabel: t.settings.confirmEmailAction,
            isDestructive: true,
            onConfirm: async () => {
                try {
                    await updateSystemSetting('admin_email_base', settings.admin_email_base);
                    toast.success(dict().settings.emailUpdated);
                    loadSettings();
                } catch (e: any) {
                    toast.error(dict().settings.migrationFailed(describeAppError(e)));
                }
            }
        });
    };



    return (
        // No height and no overflow here, on purpose -- same reason as every
        // other screen in this folder (see InventoryView.tsx and
        // StickyHeader.tsx). Dropping the locked column is also what let the
        // wrapper around PageHeader go: `shrink-0` only meant something while
        // this was a flex column that could squeeze its children.
        //
        // max-w-5xl ครอบทั้งหัวเพจและการ์ด ไม่ได้ครอบเฉพาะการ์ด -- ถ้าครอบแค่การ์ด
        // หัวเพจกับปุ่มบันทึกจะกางออกไปกว้างกว่าของที่มันคุมอยู่
        //
        // 5xl ไม่ใช่ 4xl เพราะแถวเดียวใน NotificationSettings ต้องการเนื้อที่ราว 962px
        // (ชิพเจ็ดวัน ~356 + เกณฑ์ ~134 + สองช่องเวลา ~288 + เมนู ~120 + ช่องไฟ 64)
        // 4xl ให้เนื้อที่ 848px หลังหัก p-6 สองข้าง แถวจึงแตกลงบรรทัดใหม่ตั้งแต่บนจอ
        // กว้าง 5xl ให้ 976px ซึ่งพอโดยเหลือระยะกันชนราว 14px
        //
        // การจำกัดความกว้างไม่กระทบพื้นหลังของแถบตรึง: StickyHeader วาดพื้นหลังบน
        // ::before ที่ยืด -left-[100vw]/-right-[100vw] ไม่ได้ทาบนตัว element เอง
        // (StickyHeader.tsx:150-167 อธิบายไว้ยาวว่าทำไมถึงต้องเป็นแบบนั้น) พื้นหลัง
        // จึงยังกินเต็มจอตอนเกาะเหมือนเดิม ไม่ได้หดตามคอลัมน์
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
            <StickyHeader>
                <PageHeader
                    title={t.settings.title}
                    subtitle={t.settings.subtitle}
                    icon={Database}
                    actionsBusy={isSaving}
                    actions={
                        <Button
                            variant="primary"
                            // ระหว่างบันทึกไม่มีไอคอน ตามของเดิม: ป้ายเปลี่ยนเป็น
                            // "กำลังบันทึก..." ซึ่งไอคอนรูปแผ่นดิสก์ไม่ได้ช่วยอธิบายอะไร
                            icon={isSaving ? undefined : Save}
                            onClick={handleSaveSettings}
                            disabled={isSaving}
                        >
                            {isSaving ? t.common.saving : t.settings.saveChanges}
                        </Button>
                    }
                />
            </StickyHeader>

            {/* skeleton ใช้กองเดียวกับการ์ดจริง การ์ดจึงมาแทนที่ placeholder ตรง
                ตำแหน่งเดิม ไม่ใช่ดันเลย์เอาต์ใหม่ทั้งหน้า

                ของเดิมคือ `if (isLoading) return <div>กำลังโหลดการตั้งค่า...</div>`
                ที่กินทั้งหน้า หัวเพจกับปุ่มบันทึกจึงมาถึงจอช้าไปหนึ่งรอบ fetch

                กริด 12 คอลัมน์แบบ 5/7 ที่เคยอยู่ตรงนี้หายไปทั้งอัน ความกว้างของ
                คอลัมน์ไม่ได้มาจากเนื้อหาข้างใน การ์ดที่มีของชิ้นเดียวจึงได้ที่ว่าง
                ครึ่งใบ ส่วนการ์ดที่มีของสามชุดถูกบีบ -- ดูสเปกฉบับเต็มที่
                docs/superpowers/specs/2026-07-29-settings-layout-redesign-design.md */}
            <div className="flex flex-col gap-6">
                {isLoading ? (
                    <>
                        {/* ตัวแรกเท่านั้นที่ประกาศตัวเป็น live region -- สามตัวจะให้
                            screen reader พูดว่า "กำลังโหลด" สามรอบสำหรับหน้าเดียว */}
                        <SkeletonCard ariaLabel={t.settings.loading} />
                        <SkeletonCard />
                        <SkeletonCard />
                    </>
                ) : (
                    <>
                        <NotificationSettings settings={settings} onChange={handleChange} />
                        <LineConfiguration settings={settings} lineStatus={lineStatus} onChange={handleChange} />
                        {/* ระยะห่างมากกว่าช่องว่างปกติระหว่างการ์ด (gap-6 = 24px)
                            เพราะโซนอันตรายไม่ใช่การ์ดใบที่สามในกองเดียวกัน
                            มันเป็นส่วนอื่นของหน้า และช่องว่างคือสิ่งที่พูดแบบนั้น */}
                        <div className="pt-4">
                            <DangerZone
                                settings={settings}
                                onChange={handleChange}
                                onUpdateEmail={handleUpdateEmailBase}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* เรนเดอร์เฉพาะตอนมี action จริง เพื่อให้ state ภายใน (กำลังทำงาน)
                ถูกล้างทุกครั้งที่เปิดกล่องใหม่ -- เหมือนอีกสี่หน้า เรียก ConfirmDialog
                ตรง ๆ แล้ว ไม่ผ่าน common/ConfirmationModal ซึ่งเป็นสะพานสำหรับ call
                site ที่ยังไม่ได้ย้าย และตอนนี้ไม่เหลือแล้ว */}
            {confirmAction && (
                <ConfirmDialog
                    isOpen
                    title={confirmAction.title}
                    message={confirmAction.message}
                    confirmLabel={confirmAction.confirmLabel}
                    cancelLabel={t.common.cancel}
                    closeLabel={t.common.closeDialog}
                    workingLabel={t.common.working}
                    isDestructive={confirmAction.isDestructive}
                    onConfirm={confirmAction.onConfirm}
                    onCancel={() => setConfirmAction(null)}
                    onError={(error) => toast.error(describeAppError(error))}
                />
            )}
        </div>
    );
};

export default SettingsView;
