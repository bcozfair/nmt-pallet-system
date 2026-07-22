import React, { useState } from 'react';
import { Clock, Send } from 'lucide-react';
import { SettingsCard } from './SettingsCard';
import { SystemSettings } from '../../../services/settingsService';
import { sendMorningReport, sendEveningReport } from '../../../services/reportService';
import { useT } from '../../../hooks/useT';

// These are the values stored in system_settings.report_scheduled_days and the
// ones the scheduled-report edge function compares against, so they stay in
// English. Only the label on the button is translated (t.settings.weekday).
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface ReportSchedulingProps {
    settings: SystemSettings;
    onChange: (key: keyof SystemSettings, value: any) => void;
}

export const ReportScheduling: React.FC<ReportSchedulingProps> = ({ settings, onChange }) => {
    const t = useT();
    const [reportStatus, setReportStatus] = useState<string | null>(null);

    const toggleDay = (day: string) => {
        const currentDays = settings.report_scheduled_days || [];
        const newDays = currentDays.includes(day)
            ? currentDays.filter(d => d !== day)
            : [...currentDays, day];
        onChange('report_scheduled_days', newDays);
    };

    const handleTestMorning = async () => {
        setReportStatus(t.settings.sendingOverdueReport);
        const result = await sendMorningReport();
        setReportStatus(result);
        setTimeout(() => setReportStatus(null), 3000);
    };

    const handleTestEvening = async () => {
        setReportStatus(t.settings.sendingSummaryReport);
        const result = await sendEveningReport();
        setReportStatus(result);
        setTimeout(() => setReportStatus(null), 3000);
    };

    return (
        <SettingsCard
            title={t.settings.scheduleTitle}
            subtitle={t.settings.scheduleSubtitle}
            icon={Clock}
            variant="purple"
        >
            <div className="flex flex-col gap-3">

                <label className="block text-xs font-bold text-gray-700 mb-1">{t.settings.sendReportsOn}</label>
                <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map(day => (
                        <button
                            key={day}
                            onClick={() => toggleDay(day)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all duration-200 transform hover:scale-110 active:scale-95 hover:shadow-md border ${settings.report_scheduled_days.includes(day)
                                ? 'bg-purple-600 text-white border-purple-600'
                                : 'bg-white text-gray-500 border-gray-300 hover:border-purple-300'
                                }`}
                        >
                            {t.settings.weekday(day)}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">{t.settings.overdueReportTime}</label>
                        <div className="flex gap-2">
                            <select
                                className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 min-w-0"
                                value={settings.report_time_morning}
                                onChange={(e) => onChange('report_time_morning', e.target.value)}
                            >
                                {Array.from({ length: 24 }).map((_, i) => {
                                    const time = `${String(i).padStart(2, '0')}:00`;
                                    return <option key={time} value={time}>{time}</option>;
                                })}
                            </select>
                            <button
                                onClick={handleTestMorning}
                                className="px-3 py-2 bg-red-50 text-red-700 text-xs font-bold rounded-lg hover:bg-red-100 border border-red-200 transition whitespace-nowrap flex items-center gap-2"
                            >
                                <Send size={14} /> {t.settings.sendAlertNow}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">{t.settings.summaryReportTime}</label>
                        <div className="flex gap-2">
                            <select
                                className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 min-w-0"
                                value={settings.report_time_evening}
                                onChange={(e) => onChange('report_time_evening', e.target.value)}
                            >
                                {Array.from({ length: 24 }).map((_, i) => {
                                    const time = `${String(i).padStart(2, '0')}:00`;
                                    return <option key={time} value={time}>{time}</option>;
                                })}
                            </select>
                            <button
                                onClick={handleTestEvening}
                                className="px-3 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 border border-blue-200 transition whitespace-nowrap flex items-center gap-2"
                            >
                                <Send size={14} /> {t.settings.sendSummaryNow}
                            </button>
                        </div>
                    </div>
                </div>

                {reportStatus && (
                    <div className="p-3 bg-gray-800 text-white text-sm rounded-lg text-center animate-pulse shadow-lg">
                        {reportStatus}
                    </div>
                )}
            </div>
        </SettingsCard>
    );
};
