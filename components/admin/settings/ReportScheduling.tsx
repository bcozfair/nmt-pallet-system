import React, { useId, useState } from 'react';
import { Clock, Send } from 'lucide-react';
import { SystemSettings } from '../../../services/settingsService';
import { sendMorningReport, sendEveningReport } from '../../../services/reportService';
import { useT } from '../../../hooks/useT';
import { Button, Card, Field, SectionHeader, SelectField, ToggleChip } from '../../ui';

// These are the values stored in system_settings.report_scheduled_days and the
// ones the scheduled-report edge function compares against, so they stay in
// English. Only the label on the button is translated (t.settings.weekday).
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// 24 ตัวเลือกเดิม แต่ประกอบครั้งเดียวนอกคอมโพเนนต์ ไม่ใช่ประกอบใหม่ทุกเรนเดอร์
// สองครั้ง (ของเดิมมี Array.from({length:24}) อยู่ในสอง <select>)
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
    const time = `${String(i).padStart(2, '0')}:00`;
    return { value: time, label: time };
});

interface ReportSchedulingProps {
    settings: SystemSettings;
    onChange: (key: keyof SystemSettings, value: any) => void;
}

export const ReportScheduling: React.FC<ReportSchedulingProps> = ({ settings, onChange }) => {
    const t = useT();
    const fieldId = useId();
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
        <Card className="p-5 sm:p-6">
            <SectionHeader
                level="h3"
                title={t.settings.scheduleTitle}
                subtitle={t.settings.scheduleSubtitle}
                icon={Clock}
            />

            <div className="mt-5 flex flex-col gap-4">
                {/* กลุ่มปุ่มวัน ใช้ <fieldset>/<legend> เพราะเจ็ดปุ่มนี้ตอบคำถามเดียวกัน
                    ของเดิมเป็น <label> ลอย ๆ ที่ไม่ได้ผูกกับอะไรเลย -- screen reader
                    จึงได้ยินปุ่มเจ็ดตัวติดกันโดยไม่รู้ว่าเป็นเรื่องอะไร

                    ตัวปุ่มเป็น ToggleChip ซึ่งมี aria-pressed จริง ของเดิมสลับแค่สีพื้น
                    ป้ายไม่เคยเปลี่ยน สถานะเปิด/ปิดจึงไปถึงตาอย่างเดียว */}
                <fieldset>
                    <legend className="mb-2 block text-sm font-medium text-slate-700">
                        {t.settings.sendReportsOn}
                    </legend>
                    <div className="flex flex-wrap gap-2">
                        {WEEKDAYS.map(day => (
                            <ToggleChip
                                key={day}
                                pressed={settings.report_scheduled_days.includes(day)}
                                onChange={() => toggleDay(day)}
                                label={t.settings.weekday(day)}
                            />
                        ))}
                    </div>
                </fieldset>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <Field label={t.settings.overdueReportTime} htmlFor={`${fieldId}-morning`}>
                        {(aria) => (
                            <div className="flex gap-2">
                                <SelectField
                                    {...aria}
                                    className="flex-1"
                                    ariaLabel={t.settings.overdueReportTime}
                                    value={settings.report_time_morning}
                                    onChange={(value) => onChange('report_time_morning', value)}
                                    options={HOUR_OPTIONS}
                                />
                                {/* `danger` ไม่ใช่ `dangerSolid`: มันเป็นปุ่มทดสอบส่งที่
                                    นั่งปนอยู่กับตัวควบคุมอื่น ไม่ใช่ปุ่มหลักของกล่องยืนยัน
                                    (ดูคอมเมนต์แยกความต่างของสอง variant ใน Button.tsx) */}
                                <Button variant="danger" icon={Send} onClick={handleTestMorning}>
                                    {t.settings.sendAlertNow}
                                </Button>
                            </div>
                        )}
                    </Field>

                    <Field label={t.settings.summaryReportTime} htmlFor={`${fieldId}-evening`}>
                        {(aria) => (
                            <div className="flex gap-2">
                                <SelectField
                                    {...aria}
                                    className="flex-1"
                                    ariaLabel={t.settings.summaryReportTime}
                                    value={settings.report_time_evening}
                                    onChange={(value) => onChange('report_time_evening', value)}
                                    options={HOUR_OPTIONS}
                                />
                                <Button variant="secondary" icon={Send} onClick={handleTestEvening}>
                                    {t.settings.sendSummaryNow}
                                </Button>
                            </div>
                        )}
                    </Field>
                </div>

                {/* ผลของการกดส่งทดสอบ เป็น role="status" จึงประกาศตัวเองเมื่อขึ้นมา
                    ของเดิมเป็นกล่องดำ animate-pulse ที่ไม่มีใครนอกจากตามองเห็น */}
                {reportStatus && (
                    <p
                        role="status"
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center text-sm text-slate-700"
                    >
                        {reportStatus}
                    </p>
                )}
            </div>
        </Card>
    );
};
