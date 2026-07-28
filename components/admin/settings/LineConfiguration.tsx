import React, { useId } from 'react';
import { MessageSquare } from 'lucide-react';
import type { LineConfigStatus, SystemSettings } from '../../../services/settingsService';
import { useT } from '../../../hooks/useT';
import { Card, Field, SectionHeader, TextInput } from '../../ui';

interface LineConfigurationProps {
    settings: SystemSettings;
    /** มาจาก RPC get_line_config_status ไม่ใช่จาก settings -- ดูคอมเมนต์ข้างล่าง */
    lineStatus: LineConfigStatus;
    onChange: (key: keyof SystemSettings, value: any) => void;
}

const CHIP_STYLES: Record<LineConfigStatus, { chip: string; dot: string }> = {
    configured:     { chip: 'border-green-200 bg-green-50 text-green-700', dot: 'bg-green-600' },
    not_configured: { chip: 'border-slate-200 bg-slate-100 text-slate-500', dot: 'bg-slate-400' },
    unknown:        { chip: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
};

export const LineConfiguration: React.FC<LineConfigurationProps> = ({
    settings,
    lineStatus,
    onChange,
}) => {
    const t = useT();
    const fieldId = useId();

    // ป้ายมุมขวาเคยเป็นตัวอักษร "เปิดใช้งาน" ที่เขียนค้างไว้ตายตัว มันขึ้นแบบนี้
    // เหมือนกันทั้งบนระบบที่ตั้ง token ครบแล้วและระบบที่ยังไม่เคยกรอกอะไรเลย --
    // ป้ายสถานะที่ไม่ได้อ่านสถานะอะไรคือป้ายที่โกหกได้อย่างเดียว
    //
    // การแก้รอบแรกให้มันอ่าน settings.line_channel_token ก็ยังโกหกอยู่ดี แค่กลับทิศ:
    // RLS บน system_settings กรองแถวที่ is_secret ทิ้งก่อนถึงเบราว์เซอร์เสมอ สองค่านี้
    // จึงเป็น '' ตลอดไม่ว่าฐานข้อมูลจะมีอะไร ป้ายเลยขึ้น "ยังไม่ได้ตั้งค่า" ค้างอยู่บน
    // ระบบที่ส่ง LINE ได้ปกติ สถานะที่เชื่อถือได้มาจาก RPC เท่านั้น -- และค่าในช่องกรอก
    // ข้างล่างเป็นสิ่งที่ "กำลังพิมพ์" ไม่ใช่สิ่งที่ "บันทึกแล้ว" จึงห้ามเอามาปนกับป้ายนี้
    const chip = CHIP_STYLES[lineStatus];
    const chipLabel =
        lineStatus === 'configured' ? t.settings.lineConfigured
        : lineStatus === 'not_configured' ? t.settings.lineNotConfigured
        : t.settings.lineStatusUnknown;

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
                            chip.chip
                        }
                    >
                        <span
                            className={`h-1.5 w-1.5 rounded-full ${chip.dot}`}
                            aria-hidden="true"
                        />
                        {chipLabel}
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
