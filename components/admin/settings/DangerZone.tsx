import React, { useId } from 'react';
import { Mail } from 'lucide-react';
import { SystemSettings } from '../../../services/settingsService';
import { useT } from '../../../hooks/useT';
import { Button, Card, Field, TextInput } from '../../ui';

interface DangerZoneProps {
    settings: SystemSettings;
    onChange: (key: keyof SystemSettings, value: any) => void;
    onUpdateEmail: () => void;
}

// ของเดิมคือ CoreSettings ซึ่งเป็นการ์ดขาวหน้าตาเหมือนอีกสามใบทุกประการ ทั้งที่ปุ่ม
// ข้างในเขียนอีเมลเข้าสู่ระบบของผู้ใช้ทุกคนใหม่ในทรานแซกชันเดียวและย้อนกลับทีละคน
// ไม่ได้ (ดูข้อความยืนยันใน locales/admin/settings.ts) น้ำหนักทางสายตาเท่ากับช่อง
// กรอกตัวเลขคือสิ่งที่ผิด ไม่ใช่ตัวคำเตือนที่ขาดไป -- คำเตือนมีอยู่แล้ว
//
// เคยมีหัวข้อ "โซนอันตราย" กับคำอธิบายอยู่นอกการ์ด ถอดออกตามที่สั่ง สิ่งที่บอกว่าส่วน
// นี้คนละเรื่องกับข้างบนจึงเหลือสามอย่าง: สีของการ์ด (tone="danger") ระยะห่างที่มาก
// กว่าช่องว่างระหว่างการ์ดปกติ (ตั้งไว้ที่ SettingsView) และคำเตือนใต้ช่องกรอกซึ่ง
// ผูกกับ aria-describedby ของช่องอยู่แล้ว
export const DangerZone: React.FC<DangerZoneProps> = ({ settings, onChange, onUpdateEmail }) => {
    const t = useT();
    const fieldId = useId();

    return (
        // tone="danger" สลับ CARD_SURFACE ทั้งก้อน ไม่ใช่ส่ง border-red-200 เข้าไปทาง
        // className ซึ่งจะได้คลาสสีขอบสองตัวบน element เดียวแล้วแพ้ชนะกันตามลำดับใน
        // CSS ที่ build ออกมา -- Card.tsx เขียนกำกับเรื่องนี้ไว้เอง
        <Card tone="danger" as="section" className="p-5 sm:p-6">
            {/* คำเตือนเป็น `warning` ของ Field ไม่ใช่ <p> ที่วาดสามเหลี่ยมกับข้อความ
                สีแดงเอง -- Field ผูกมันเข้า aria-describedby ของช่องให้เอง และวาด
                ไอคอนเตือนชุดเดียวกับทุกช่องในแอป
                `warning` ไม่ใช่ `error` เพราะค่าที่กรอกอยู่ไม่ได้ผิด สิ่งที่เตือนคือ
                ผลของการกดปุ่มข้าง ๆ

                หลังถอดหัวข้อ "โซนอันตราย" ออก บรรทัดนี้เป็นข้อความเดียวที่เหลือซึ่ง
                บอกว่าการกดปุ่มข้าง ๆ กระทบใครบ้าง จึงห้ามย่อหรือถอดตามไปด้วย */}
            {/* orientation="horizontal": ป้ายยืนซ้ายของช่องกรอกกับปุ่มบรรทัดเดียวกัน
                ส่วนคำเตือนลงไปกินเต็มแถวข้างล่าง การ์ดจึงเหลือสองบรรทัดแทนสามบรรทัด
                คำเตือนอยู่แถวล่าง ไม่ได้ต่อท้ายป้ายในคอลัมน์ซ้าย เพราะมันยาวกว่าป้าย
                หลายเท่า ถ้าอยู่คอลัมน์เดียวกันมันจะดันคอลัมน์นั้นให้กว้างจนช่องอีเมล
                ไม่เหลือที่ */}
            <Field
                label={t.settings.adminEmailBase}
                htmlFor={`${fieldId}-email`}
                hint={t.settings.adminEmailBaseHint}
                warning={`${t.settings.warningLabel} ${t.settings.adminEmailWarning}`}
                orientation="horizontal"
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
                        {/* `dangerSolid`: การกดปุ่มนี้เขียนอีเมลเข้าสู่ระบบของผู้ใช้ทุก
                            คนใหม่ในทรานแซกชันเดียว ไม่มีการย้อนกลับทีละคน */}
                        <Button variant="dangerSolid" onClick={onUpdateEmail}>
                            {t.settings.updateEmail}
                        </Button>
                    </div>
                )}
            </Field>
        </Card>
    );
};
