import React, { useId } from 'react';
import { Bell } from 'lucide-react';
import { SystemSettings } from '../../../services/settingsService';
import { useT } from '../../../hooks/useT';
import { Card, Field, SectionHeader, TextInput } from '../../ui';

interface GeneralSettingsProps {
    settings: SystemSettings;
    onChange: (key: keyof SystemSettings, value: any) => void;
}

// การ์ดทั้งสี่ใบของหน้านี้ใช้โครงเดียวกัน: Card + SectionHeader level="h3" + เนื้อ
// ของเดิมเป็น SettingsCard ที่มี variant 6 สี ซึ่งทำให้การ์ดแต่ละใบคนละสีโดยที่สีนั้น
// ไม่ได้แปลว่าอะไร (ตารางส่งรายงานเป็นสีม่วงด้วยเหตุผลอะไรก็ไม่มีใครตอบได้)
// สีที่เหลืออยู่ในหน้านี้จึงมีแต่ที่สื่อความหมายจริง เช่นกรอบแดงรอบกล่องเตือน
export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings, onChange }) => {
    const t = useT();
    const fieldId = useId();

    return (
        <Card className="p-5 sm:p-6">
            <SectionHeader
                level="h3"
                title={t.settings.rulesTitle}
                subtitle={t.settings.rulesSubtitle}
                icon={Bell}
            />

            <div className="mt-5">
                <Field
                    label={t.settings.overdueThreshold}
                    htmlFor={`${fieldId}-overdue`}
                    hint={t.settings.overdueHint}
                >
                    {(aria) => (
                        <div className="flex items-center gap-2">
                            {/* ความกว้างอยู่ที่กล่องห่อ ไม่ได้ส่ง `w-32` เข้าไปที่
                                TextInput -- ตัวมันมี `w-full` อยู่ในสตริงฐานแล้ว และ
                                คลาสสอง ตัวที่คุมคุณสมบัติเดียวกันตัดสินผู้ชนะที่ลำดับใน
                                CSS ที่ build ออกมา ไม่ใช่ลำดับในสตริง (ดู Card.tsx:22-29)
                                ตรวจกับ dist จริงแล้ว: `.w-32` ออกมาก่อน `.w-full`
                                การส่งเข้าไปจึงแพ้เงียบ ๆ และช่องจะกว้างเต็มแถว */}
                            <div className="w-32">
                                <TextInput
                                    {...aria}
                                    type="number"
                                    min={1}
                                    max={365}
                                    value={settings.overdue_days}
                                    onChange={(e) => onChange('overdue_days', parseInt(e.target.value) || 7)}
                                />
                            </div>
                            <span className="text-sm text-slate-500">{t.settings.days}</span>
                        </div>
                    )}
                </Field>
            </div>
        </Card>
    );
};
