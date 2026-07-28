import React, { useState, useEffect } from 'react';
import { Save, Database } from 'lucide-react';
import { GeneralSettings } from './GeneralSettings';
import { ReportScheduling } from './ReportScheduling';
import { LineConfiguration } from './LineConfiguration';
import { CoreSettings } from './CoreSettings';
import { Button, ConfirmDialog, PageHeader, SkeletonCard, StickyHeader } from '../../ui';

import { toast } from '../../../services/toast';
import { fetchAllSystemSettings, updateSystemSetting, SystemSettings } from '../../../services/settingsService';
import { invalidateSettings } from '../../../services/settingsCache';
import { useT } from '../../../hooks/useT';
import { dict } from '../../../services/i18n';
import { describeAppError } from '../../../services/appError';


// Remove WEEKDAYS constant as it is now in ReportScheduling


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
            const data = await fetchAllSystemSettings();
            setSettings(data);
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
        <div className="flex flex-col gap-4">
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

            {/* กริดเดิมทุกประการ และ skeleton ใช้กริดตัวเดียวกัน การ์ดจริงจึงมาแทน
                ที่ placeholder ตรงตำแหน่งเดิม ไม่ใช่ดันเลย์เอาต์ใหม่ทั้งหน้า

                ของเดิมคือ `if (isLoading) return <div>กำลังโหลดการตั้งค่า...</div>`
                ที่กินทั้งหน้า หัวเพจกับปุ่มบันทึกจึงมาถึงจอช้าไปหนึ่งรอบ fetch */}
            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 flex flex-col gap-6 lg:col-span-5">
                    {isLoading ? (
                        <>
                            {/* ตัวแรกเท่านั้นที่ประกาศตัวเป็น live region -- สี่ตัวจะให้
                                screen reader พูดว่า "กำลังโหลด" สี่รอบสำหรับหน้าเดียว */}
                            <SkeletonCard ariaLabel={t.settings.loading} />
                            <SkeletonCard />
                        </>
                    ) : (
                        <>
                            <GeneralSettings settings={settings} onChange={handleChange} />
                            <ReportScheduling settings={settings} onChange={handleChange} />
                        </>
                    )}
                </div>

                <div className="col-span-12 flex flex-col gap-6 lg:col-span-7">
                    {isLoading ? (
                        <>
                            <SkeletonCard />
                            <SkeletonCard />
                        </>
                    ) : (
                        <>
                            <LineConfiguration settings={settings} onChange={handleChange} />
                            <CoreSettings settings={settings} onChange={handleChange} onUpdateEmail={handleUpdateEmailBase} />
                        </>
                    )}
                </div>
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
