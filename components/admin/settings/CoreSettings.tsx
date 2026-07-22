import React from 'react';
import { Lock, Mail, AlertTriangle } from 'lucide-react';
import { SystemSettings } from '../../../services/settingsService';
import { SettingsCard } from './SettingsCard';
import { useT } from '../../../hooks/useT';

interface CoreSettingsProps {
    settings: SystemSettings;
    onChange: (key: keyof SystemSettings, value: any) => void;
    onUpdateEmail: () => void;
}

export const CoreSettings: React.FC<CoreSettingsProps> = ({ settings, onChange, onUpdateEmail }) => {
    const t = useT();

    return (
        <SettingsCard
            title={t.settings.coreTitle}
            subtitle={t.settings.coreSubtitle}
            icon={Lock}
            variant="red"
        >
            <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                    {t.settings.adminEmailBase} <span className="text-gray-400 font-normal text-[10px] ml-1">{t.settings.adminEmailBaseHint}</span>
                </label>
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Mail size={18} className="absolute left-3 top-2.5 text-gray-400" />
                        <input
                            type="email"
                            className="w-full pl-10 bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-red-500 font-mono text-sm"
                            value={settings.admin_email_base}
                            onChange={(e) => onChange('admin_email_base', e.target.value)}
                        />
                    </div>
                    <button
                        onClick={onUpdateEmail}
                        className="px-5 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition shadow-sm text-sm whitespace-nowrap"
                    >
                        {t.settings.updateEmail}
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                    <AlertTriangle size={12} className="text-red-500" />
                    <span className="font-bold text-red-600">{t.settings.warningLabel}</span> {t.settings.adminEmailWarning}
                </p>
            </div>
        </SettingsCard>
    );
};
