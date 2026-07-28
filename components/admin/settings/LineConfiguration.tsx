import React, { useId } from 'react';
import { MessageSquare } from 'lucide-react';
import { SystemSettings } from '../../../services/settingsService';
import { useT } from '../../../hooks/useT';
import { Card, Field, SectionHeader, TextInput } from '../../ui';

interface LineConfigurationProps {
    settings: SystemSettings;
    onChange: (key: keyof SystemSettings, value: any) => void;
}

export const LineConfiguration: React.FC<LineConfigurationProps> = ({ settings, onChange }) => {
    const t = useT();
    const fieldId = useId();

    // ป้ายมุมขวาเคยเป็นตัวอักษร "เปิดใช้งาน" ที่เขียนค้างไว้ตายตัว มันขึ้นแบบนี้
    // เหมือนกันทั้งบนระบบที่ตั้ง token ครบแล้วและระบบที่ยังไม่เคยกรอกอะไรเลย --
    // ป้ายสถานะที่ไม่ได้อ่านสถานะอะไรคือป้ายที่โกหกได้อย่างเดียว
    const isConfigured = Boolean(settings.line_channel_token && settings.line_target_id);

    return (
        <Card className="p-5 sm:p-6">
            <SectionHeader
                level="h3"
                title={t.settings.lineTitle}
                subtitle={t.settings.lineSubtitle}
                icon={MessageSquare}
                action={
                    <span
                        className={
                            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ' +
                            (isConfigured
                                ? 'border-green-200 bg-green-50 text-green-700'
                                : 'border-slate-200 bg-slate-100 text-slate-500')
                        }
                    >
                        <span
                            className={`h-1.5 w-1.5 rounded-full ${isConfigured ? 'bg-green-600' : 'bg-slate-400'}`}
                            aria-hidden="true"
                        />
                        {isConfigured ? t.settings.lineConfigured : t.settings.lineNotConfigured}
                    </span>
                }
            />

            <div className="mt-5 flex flex-col gap-4">
                <Field
                    label={t.settings.channelToken}
                    htmlFor={`${fieldId}-token`}
                    hint={t.settings.channelTokenHint}
                >
                    {(aria) => (
                        <TextInput
                            {...aria}
                            type="password"
                            autoComplete="off"
                            className="font-mono text-xs"
                            placeholder={t.settings.channelTokenPlaceholder}
                            value={settings.line_channel_token}
                            onChange={(e) => onChange('line_channel_token', e.target.value)}
                        />
                    )}
                </Field>

                <Field
                    label={t.settings.targetId}
                    htmlFor={`${fieldId}-target`}
                    hint={t.settings.targetIdHint}
                >
                    {(aria) => (
                        <div className="relative">
                            <MessageSquare
                                size={16}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                aria-hidden="true"
                            />
                            <TextInput
                                {...aria}
                                className="pl-9 font-mono text-xs"
                                placeholder={t.settings.targetIdPlaceholder}
                                value={settings.line_target_id}
                                onChange={(e) => onChange('line_target_id', e.target.value)}
                            />
                        </div>
                    )}
                </Field>
            </div>
        </Card>
    );
};
