import React from 'react';
import { MessageSquare } from 'lucide-react';
import { SettingsCard } from './SettingsCard';
import { SystemSettings } from '../../../services/settingsService';

interface LineConfigurationProps {
    settings: SystemSettings;
    onChange: (key: keyof SystemSettings, value: any) => void;
}

export const LineConfiguration: React.FC<LineConfigurationProps> = ({ settings, onChange }) => {
    return (
        <SettingsCard
            title="LINE Messaging API"
            subtitle="Integration with LINE messaging"
            icon={MessageSquare}
            variant="green"
            headerAction={<span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">ACTIVE</span>}
        >
            <div className="flex flex-col gap-3">
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                        Channel Access Token <span className="text-gray-400 font-normal text-[10px] ml-1">(Long-lived)</span>
                    </label>
                    <input
                        type="password"
                        className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500 text-xs font-mono"
                        placeholder="•••••••••••••••• (Hidden) - Type to Change"
                        value={settings.line_channel_token}
                        onChange={(e) => onChange('line_channel_token', e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                        Target ID <span className="text-gray-400 font-normal text-[10px] ml-1">(User ID or Group ID)</span>
                    </label>
                    <div className="relative">
                        <MessageSquare size={16} className="absolute left-3 top-2.5 text-gray-400" />
                        <input
                            type="text"
                            className="w-full pl-9 bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500 font-mono text-xs"
                            placeholder="•••••••• (Hidden) - Type to Change"
                            value={settings.line_target_id}
                            onChange={(e) => onChange('line_target_id', e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </SettingsCard>
    );
};
