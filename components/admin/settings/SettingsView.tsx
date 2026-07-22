import React, { useState, useEffect } from 'react';
import { Save, Database } from 'lucide-react';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { GeneralSettings } from './GeneralSettings';
import { ReportScheduling } from './ReportScheduling';
import { LineConfiguration } from './LineConfiguration';
import { CoreSettings } from './CoreSettings';

import { toast } from '../../../services/toast';
import { fetchAllSystemSettings, updateSystemSetting, SystemSettings } from '../../../services/settingsService';
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
            {/* Header with Save Button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 mb-2 px-1">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 flex items-center gap-2 tracking-tight">
                        <Database className="text-blue-600" /> {t.settings.title}
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">{t.settings.subtitle}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={handleSaveSettings}
                        disabled={isSaving}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition shadow-sm whitespace-nowrap ${isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                        {isSaving ? t.common.saving : <><Save size={18} /> {t.settings.saveChanges}</>}
                    </button>
                </div>
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
