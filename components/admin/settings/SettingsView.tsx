import React, { useState, useEffect } from 'react';
import { Save, Database } from 'lucide-react';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { GeneralSettings } from './GeneralSettings';
import { ReportScheduling } from './ReportScheduling';
import { LineConfiguration } from './LineConfiguration';
import { CoreSettings } from './CoreSettings';
import { Button, PageHeader } from '../../ui';

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



    if (isLoading) return <div className="h-full flex items-center justify-center text-gray-500">{t.settings.loading}</div>;

    return (
        <div className="h-[calc(100vh-110px)] flex flex-col gap-4 overflow-hidden">
            {/* Header with Save Button.

                ห่อด้วย div อีกชั้นเพราะหน้านี้เป็น flex column ที่ overflow-hidden
                -- `shrink-0` ต้องอยู่บนลูกโดยตรงของคอลัมน์ ไม่งั้นหัวเรื่องจะถูกบีบ
                ตอนตารางตั้งค่าด้านล่างยาว ส่วน PageHeader เองไม่รับ className
                เพื่อไม่ให้แต่ละหน้าแอบปรับทรงของมันจนหลุดจากกัน */}
            <div className="shrink-0 mb-2 px-1">
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
            </div>

            {/* Main Grid Layout */}
            <div className="grid grid-cols-12 gap-6 flex-1 min-h-0 overflow-y-auto pr-2 styled-scrollbar">

                {/* LEFT COLUMN (Span 5) - Rules & Scheduling */}
                <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
                    <GeneralSettings settings={settings} onChange={handleChange} />
                    <ReportScheduling settings={settings} onChange={handleChange} />
                </div>

                {/* RIGHT COLUMN (Span 7) - LINE & System Core */}
                <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
                    <LineConfiguration settings={settings} onChange={handleChange} />
                    <CoreSettings settings={settings} onChange={handleChange} onUpdateEmail={handleUpdateEmailBase} />
                </div>

            </div>

            {/* CONFIRMATION MODAL */}
            <ConfirmationModal
                isOpen={!!confirmAction}
                title={confirmAction?.title || ''}
                message={confirmAction?.message || ''}
                confirmLabel={confirmAction?.confirmLabel || ''}
                isDestructive={confirmAction?.isDestructive}
                onConfirm={async () => {
                    if (confirmAction) {
                        await confirmAction.onConfirm();
                        setConfirmAction(null);
                    }
                }}
                onCancel={() => setConfirmAction(null)}
            />

        </div>
    );
};

export default SettingsView;
