import React from 'react';
import { Bell } from 'lucide-react';
import { SettingsCard } from './SettingsCard';
import { SystemSettings } from '../../../services/settingsService';

interface GeneralSettingsProps {
    settings: SystemSettings;
    onChange: (key: keyof SystemSettings, value: any) => void;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings, onChange }) => {
    return (
        <SettingsCard
            title="Rules & Alerts"
            subtitle="Notification and alert rules"
            icon={Bell}
            variant="yellow"
        >
            <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                    Overdue Threshold (Days)
                </label>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        min="1"
                        max="365"
                        className="w-50 bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        value={settings.overdue_days}
                        onChange={(e) => onChange('overdue_days', parseInt(e.target.value) || 7)}
                    />
                    <span className="text-gray-500 text-sm">Days</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Pallets checked out longer than this will be marked as overdue.</p>
            </div>
        </SettingsCard>
    );
};
