import React, { useId, useState } from 'react';
import { Bell, Send } from 'lucide-react';
import { SystemSettings } from '../../../services/settingsService';
import { sendMorningReport, sendEveningReport } from '../../../services/reportService';
import { useT } from '../../../hooks/useT';
import { Card, Field, Menu, SectionHeader, SelectField, TextInput, ToggleChip } from '../../ui';

// These are the values stored in system_settings.report_scheduled_days and the
// ones the scheduled-report edge function compares against, so they stay in
// English. Only the label on the button is translated (t.settings.weekday).
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// 24 ตัวเลือก ประกอบครั้งเดียวนอกคอมโพเนนต์ ไม่ใช่ประกอบใหม่ทุกเรนเดอร์สองครั้ง
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
    const time = `${String(i).padStart(2, '0')}:00`;
    return { value: time, label: time };
});

// ป้ายของกลุ่มชิพเจ็ดวัน -- คลาสชุดเดียวกับ <label> ใน Field.tsx เป๊ะ เพื่อให้ป้ายทั้ง
// สี่ช่องในแถวนี้เป็นของชิ้นเดียวกัน ไม่ใช่สามช่องเป็นแบบหนึ่งและอีกช่องเป็นอีกแบบ
const GROUP_LABEL = 'block text-sm font-medium text-slate-700';

// ความกว้างของสองช่องเวลา มาจากป้าย ไม่ได้มาจาก "08:00" -- ป้ายกว้างกว่าตัว select
// เกือบเท่าตัว ปล่อยให้ช่องหดตามเนื้อหาแล้วป้ายจะตัดสองบรรทัดในขณะที่ช่องอื่นในแถว
// ยังบรรทัดเดียว
//
// 128px พอดีกับป้ายที่ยาวที่สุดของทั้งสองภาษา: "เวลาส่งสรุปประจำวัน" นับเฉพาะตัวที่กิน
// ความกว้างจริงได้ 16 ตัว (สระบน/ล่างและวรรณยุกต์เป็น combining ไม่กินที่) ราว 112px
// ส่วน "Summary Time" ราว 88px
const TIME_COL = 'w-32 shrink-0';

interface NotificationSettingsProps {
    settings: SystemSettings;
    onChange: (key: keyof SystemSettings, value: any) => void;
}

// รวมของเดิมสองไฟล์ -- GeneralSettings (เกณฑ์เกินกำหนด) กับ ReportScheduling
// (วัน เวลา ปุ่มทดสอบ) -- เป็นการ์ดใบเดียว แถวเดียว
//
// สองใบนั้นเคยนั่งซ้อนกันในคอลัมน์กว้าง 5/12 ซึ่งเป็นที่มาของอาการทั้งสองข้างที่หน้านี้
// เป็น: ใบบนมีของอยู่ชิ้นเดียวคือช่องตัวเลขแล้วเหลือที่ว่างทางขวาครึ่งการ์ด ส่วนใบล่าง
// มีของสามชุดยัดอยู่ในความกว้างเท่ากัน
//
// ตัวควบคุมทั้งสี่ตอบคำถามต่อเนื่องกันเรื่องเดียว -- อะไรนับว่าเกินกำหนด วันไหน เวลาไหน
// -- และไม่มีตัวไหนกว้างเกินกว่าจะยืนเรียงกันได้ การให้แต่ละตัวมีแถวของตัวเองคือสิ่งที่
// ทำให้การ์ดสูง 370px ทั้งที่ความกว้างว่างอยู่ข้าง ๆ ทุกแถว
//
// แถวนี้ต้องการเนื้อที่ราว 876px ในภาษาอังกฤษ ซึ่งเป็นภาษาที่กว้างกว่า (ชิพเจ็ดวัน
// Mon...Sun ราว 406px เทียบกับ จ....อา. ราว 356px) จึงเป็นเหตุผลที่ SettingsView
// ขยายจาก max-w-4xl (เนื้อที่ 848px) เป็น max-w-5xl -- ดูคอมเมนต์ที่นั่น
export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ settings, onChange }) => {
    const t = useT();
    const fieldId = useId();
    const [reportStatus, setReportStatus] = useState<string | null>(null);

    const daysLabelId = `${fieldId}-days-label`;

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
        <Card as="section" className="p-5 sm:p-6">
            {/* h2 ไม่ใช่ h3 -- การ์ดสามใบของหน้านี้เป็นภูมิภาคระดับบนสุดใต้ <h1> ของ
                PageHeader ไม่ได้อยู่ในภูมิภาค h2 อีกชั้น (SectionHeader.tsx:13-16)
                ของเดิมใช้ h3 ทั้งสี่ใบ หน้านี้จึงข้าม h2 ไปทั้งหน้า */}
            <SectionHeader
                level="h2"
                title={t.settings.notificationsTitle}
                subtitle={t.settings.notificationsSubtitle}
                icon={Bell}
            />

            {/* flex-wrap ไม่ใช่ grid ที่ล็อกจำนวนคอลัมน์: ของสี่ชิ้นในแถวนี้กว้างไม่เท่า
                กันเลย (ชิพเจ็ดวัน 356-406px แล้วแต่ภาษา ส่วนช่องเกณฑ์ ~134px) กริด
                คอลัมน์เท่ากันจะยืดช่องเกณฑ์ให้กว้างเท่าชิพ ซึ่งคือที่ว่างเปล่าแบบเดียว
                กับที่หน้านี้เพิ่งเลิกเป็น และเมื่อจอแคบลง flex-wrap ตัดทีละชิ้นตามที่
                เหลือจริง ไม่ใช่กระโดดจากสี่คอลัมน์เหลือหนึ่งที่ breakpoint เดียว

                items-end คือสิ่งที่ทำให้แถวนี้ตรง: ป้ายของแต่ละช่องยาวไม่เท่ากันและ
                ตัดสองบรรทัดได้ในภาษาใดภาษาหนึ่ง ถ้าจัดชิดยอด ช่อง select ของตัวที่ป้าย
                ยาวจะลอยต่ำกว่าเพื่อนหนึ่งบรรทัด จัดชิดล่างแล้วตัวควบคุมทุกตัวยืนบนเส้น
                เดียวกันไม่ว่าป้ายข้างบนจะกี่บรรทัด */}
            <div className="mt-5 flex flex-wrap items-end gap-4">
                <div className="shrink-0">
                    <Field label={t.settings.overdueThreshold} htmlFor={`${fieldId}-overdue`}>
                        {(aria) => (
                            <div className="flex items-center gap-2">
                                {/* ความกว้างอยู่ที่กล่องห่อ ไม่ได้ส่ง `w-20` เข้าไปที่
                                    TextInput -- ตัวมันมี `w-full` อยู่ในสตริงฐานแล้ว
                                    และคลาสสองตัวที่คุมคุณสมบัติเดียวกันตัดสินผู้ชนะที่
                                    ลำดับใน CSS ที่ build ออกมา ไม่ใช่ลำดับในสตริง
                                    (ดู Card.tsx) ตรวจกับ dist จริงแล้ว: `.w-20` ออกมา
                                    ก่อน `.w-full` การส่งเข้าไปจึงแพ้เงียบ ๆ */}
                                <div className="w-20">
                                    <TextInput
                                        {...aria}
                                        type="number"
                                        min={1}
                                        max={365}
                                        value={settings.overdue_days}
                                        onChange={(e) => onChange('overdue_days', parseInt(e.target.value) || 7)}
                                    />
                                </div>
                                <span className="shrink-0 text-sm text-slate-500">{t.settings.days}</span>
                            </div>
                        )}
                    </Field>
                </div>

                {/* ป้ายนี้คุมปุ่มเจ็ดตัว ไม่ใช่ control ตัวเดียว จึงใช้ <label> หรือ
                    Field ไม่ได้ -- ทั้งคู่ผูกกับ control ตัวเดียวผ่าน htmlFor
                    และไม่ใช้ <fieldset>/<legend> อย่างที่ ReportScheduling เคยใช้
                    เพราะ <legend> ถูกวาดในขอบของ fieldset เป็นกรณีพิเศษ การจัดวางมัน
                    ให้เข้าที่ในแถว flex จึงเชื่อถือข้ามเบราว์เซอร์ไม่ได้
                    role="group" + aria-labelledby ให้ชื่อในผังการเข้าถึงเหมือนกันเป๊ะ
                    โดยไม่ผูกมือเรื่องการจัดวาง

                    space-y-1.5 คือระยะป้าย-ถึง-control ชุดเดียวกับ Field.tsx:55
                    ชิพจึงเริ่มที่ความสูงเดียวกับช่องกรอกข้าง ๆ */}
                {/* ไม่มี shrink-0 ต่างจากช่องอื่นในแถว และนี่เป็นการแก้บั๊ก ไม่ใช่
                    ความชอบ: ชิพเจ็ดตัวเรียงกันกว้าง 356-406px แล้วแต่ภาษา ซึ่งกว้าง
                    กว่าการ์ดบนมือถือ ตอนที่กล่องนี้เป็น shrink-0 มันหดต่ำกว่าความกว้าง
                    นั้นไม่ได้ ชิพข้างในจึงไม่มีวันได้ตัดบรรทัดถึงแม้ตัวมันเองจะเป็น
                    flex-wrap อยู่แล้ว ผลคือ "อา."/"Sun" ถูกตัดหายไปนอกขอบการ์ด
                    ปล่อยให้หดได้แล้วมันหดลงมาเท่าที่เหลือจริง แล้วชิพก็ตัดบรรทัดเอง
                    บนจอกว้างไม่มีอะไรเปลี่ยน เพราะ flex ย่อของที่ยังพอดีอยู่แล้วไม่ได้ */}
                <div
                    role="group"
                    aria-labelledby={daysLabelId}
                    className="min-w-0 space-y-1.5"
                >
                    <span id={daysLabelId} className={GROUP_LABEL}>
                        {t.settings.sendReportsOn}
                    </span>
                    {/* ToggleChip มี aria-pressed จริง สถานะเปิด/ปิดจึงไปถึงหูด้วย
                        ไม่ใช่ไปถึงตาอย่างเดียวแบบที่ปุ่มสลับสีพื้นเฉย ๆ เคยเป็น */}
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
                </div>

                <div className={TIME_COL}>
                    <Field label={t.settings.overdueReportTime} htmlFor={`${fieldId}-morning`}>
                        {(aria) => (
                            <SelectField
                                {...aria}
                                ariaLabel={t.settings.overdueReportTime}
                                value={settings.report_time_morning}
                                onChange={(value) => onChange('report_time_morning', value)}
                                options={HOUR_OPTIONS}
                            />
                        )}
                    </Field>
                </div>

                <div className={TIME_COL}>
                    <Field label={t.settings.summaryReportTime} htmlFor={`${fieldId}-evening`}>
                        {(aria) => (
                            <SelectField
                                {...aria}
                                ariaLabel={t.settings.summaryReportTime}
                                value={settings.report_time_evening}
                                onChange={(value) => onChange('report_time_evening', value)}
                                options={HOUR_OPTIONS}
                            />
                        )}
                    </Field>
                </div>

                {/* สองปุ่มยุบเป็นเมนูเดียว: การส่งทดสอบเป็นสิ่งที่นาน ๆ ทำที ปุ่มเต็ม
                    สองตัวจะกินราว 300px ซึ่งเป็นระยะที่แถวเดียวไม่มีให้

                    Menu ไม่ใช่ปุ่มที่วาด dropdown เอง -- มันมี aria-haspopup,
                    aria-expanded, Escape และการคืนโฟกัสกลับปุ่ม ครบตามที่
                    Menu.tsx:45-51 บันทึกไว้ว่าเวอร์ชันก่อนหน้ามันไม่มีสักอย่าง

                    w-24 (96px) เป็นเพดานที่แถวนี้ให้ได้ ไม่ใช่ค่าที่เลือกตามใจ:
                    ในภาษาอังกฤษซึ่งกว้างกว่า แถวใช้ไปแล้วราว 847px (เกณฑ์ 137 +
                    ชิพ Mon...Sun 406 + สองช่องเวลา 256 + ช่องไฟ 48) จาก 976px ที่มี
                    เหลือ 129px หักช่องไฟอีก 16 เหลือ 113px ให้ปุ่ม

                    จึงไม่มีไอคอนนำหน้า (ประหยัด 24px) และป้ายเป็น "ทดสอบ"/"Test"
                    ไม่ใช่ "ทดสอบส่ง"/"Test send" -- ที่ 96px เนื้อหาคือป้ายราว 29-35px
                    + ช่องไฟ 8 + เชฟรอน 16 + px-3.5 สองข้าง 28 = ราว 81-87px
                    รอบก่อนหน้าปุ่มเป็น w-44 พร้อมไอคอน (176px) ซึ่งเกินที่เหลือเกือบ
                    เท่าตัว มันจึงตกลงไปอยู่บรรทัดของตัวเองเฉพาะภาษาอังกฤษ

                    ไม่ใช้ matchTriggerWidth: พาเนลที่กว้างเท่าปุ่ม 96px จะเหลือที่ให้
                    ข้อความแค่ 22px หลังหัก p-1.5, px-3 ของรายการ และชิพไอคอน 28px
                    ป้าย "ส่งแจ้งเตือน" จะตัดบรรทัดจนอ่านไม่ได้ พาเนลจึงใช้ความกว้าง
                    ปริยายของ Menu ซึ่งตอนนี้กว้างตามข้อความที่ยาวที่สุด (`w-max`)
                    ไม่ใช่ 256px ตายตัวเหมือนตอนที่เขียนคอมเมนต์นี้ครั้งแรก

                    ml-auto ไม่มี sm: นำหน้า และนี่เป็นการแก้บั๊ก: พาเนลเป็น
                    align="right" มันจึงกางจากขอบขวาของปุ่มไปทางซ้าย 256px ตอนที่
                    ml-auto มีแต่ที่ sm ขึ้นไป บนมือถือปุ่มไปอยู่ชิดซ้ายของบรรทัดตัวเอง
                    พาเนลก็กางทะลุออกนอกจอทางซ้ายทั้งแผง ตรึงให้ปุ่มชิดขวาทุกความกว้าง
                    แล้วพาเนลกางเข้าหาเนื้อหาเสมอ ไม่ว่าจอกว้างเท่าไร */}
                <Menu
                    className="w-24 shrink-0 ml-auto"
                    label={t.settings.testSendTitle}
                    // `accent` ทึบ ชุดเดียวกับปุ่ม "พิมพ์ QR" ทั้งแอป ตามที่เจ้าของงานสั่ง
                    //
                    // เดิมเป็น `accentSoft` (พื้นขาว ตัวหนังสือเขียวน้ำทะเล) ด้วยเหตุผลว่า
                    // หน้านี้มีปุ่ม primary "บันทึกการเปลี่ยนแปลง" อยู่บนหัวเพจแล้ว ปุ่มนี้
                    // จึงควรถอยให้ -- ผลที่ได้จริงคือปุ่มขาวใบเล็กบนการ์ดขาว ซึ่งอ่านไม่ออก
                    // ว่าเป็นปุ่ม
                    //
                    // ตัวหนังสือขาวบน `accent-700` ได้ 5.37:1 ผ่านเกณฑ์ 4.5:1 -- เหตุผลที่
                    // ฐานต้องเป็น 700 ไม่ใช่เฉดที่สดกว่านั้น อยู่ที่ Button.tsx เหนือ `accent`
                    variant="accent"
                    align="right"
                    items={[
                        {
                            label: t.settings.sendAlertNow,
                            icon: Send,
                            tone: 'danger',
                            onClick: handleTestMorning,
                        },
                        {
                            label: t.settings.sendSummaryNow,
                            icon: Send,
                            tone: 'neutral',
                            onClick: handleTestEvening,
                        },
                    ]}
                />
            </div>

            {/* ผลของการกดส่งทดสอบ เป็น role="status" จึงประกาศตัวเองเมื่อขึ้นมา
                อยู่นอกแถว ไม่ได้แทรกในแถว เพราะมันโผล่มาแล้วหายไปใน 3 วินาที --
                ถ้าอยู่ในแถว ตัวควบคุมทั้งสี่จะขยับทุกครั้งที่กดทดสอบ */}
            {reportStatus && (
                <p
                    role="status"
                    className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm text-slate-700"
                >
                    {reportStatus}
                </p>
            )}
        </Card>
    );
};
