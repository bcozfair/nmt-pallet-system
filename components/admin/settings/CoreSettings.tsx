import React, { useId } from 'react';
import { Lock, Mail } from 'lucide-react';
import { SystemSettings } from '../../../services/settingsService';
import { useT } from '../../../hooks/useT';
import { Button, Card, Field, SectionHeader, TextInput } from '../../ui';

interface CoreSettingsProps {
    settings: SystemSettings;
    onChange: (key: keyof SystemSettings, value: any) => void;
    onUpdateEmail: () => void;
}

export const CoreSettings: React.FC<CoreSettingsProps> = ({ settings, onChange, onUpdateEmail }) => {
    const t = useT();
    const fieldId = useId();

    return (
        <Card className="p-5 sm:p-6">
            <SectionHeader
                level="h3"
                title={t.settings.coreTitle}
                subtitle={t.settings.coreSubtitle}
                icon={Lock}
            />

            <div className="mt-5">
                {/* คำเตือนเป็น `warning` ของ Field ไม่ใช่ <p> ที่วาดสามเหลี่ยมกับ
                    ข้อความสีแดงเอง -- Field ผูกมันเข้า aria-describedby ของช่อง
                    ให้เอง และวาดไอคอนเตือนชุดเดียวกับทุกช่องในแอป
                    `warning` ไม่ใช่ `error` เพราะค่าที่กรอกอยู่ไม่ได้ผิด สิ่งที่เตือน
                    คือผลของการกดปุ่มข้าง ๆ */}
                <Field
                    label={t.settings.adminEmailBase}
                    htmlFor={`${fieldId}-email`}
                    hint={t.settings.adminEmailBaseHint}
                    warning={`${t.settings.warningLabel} ${t.settings.adminEmailWarning}`}
                >
                    {(aria) => (
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <div className="relative flex-1">
                                <Mail
                                    size={16}
                                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                    aria-hidden="true"
                                />
                                <TextInput
                                    {...aria}
                                    type="email"
                                    className="pl-9 font-mono"
                                    value={settings.admin_email_base}
                                    onChange={(e) => onChange('admin_email_base', e.target.value)}
                                />
                            </div>
                            {/* `dangerSolid`: การกดปุ่มนี้เขียนอีเมลเข้าสู่ระบบของผู้ใช้
                                ทุกคนใหม่ในทรานแซกชันเดียว ไม่มีการย้อนกลับทีละคน
                                (ดูข้อความยืนยันใน locales/admin/settings.ts) */}
                            <Button variant="dangerSolid" onClick={onUpdateEmail}>
                                {t.settings.updateEmail}
                            </Button>
                        </div>
                    )}
                </Field>
            </div>
        </Card>
    );
};
