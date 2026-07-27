import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface PageHeaderProps {
    title: string;
    subtitle?: string;
    icon?: LucideIcon;
    actions?: React.ReactNode;
    /** ตั้ง aria-busy บนกลุ่มปุ่มระหว่างที่คำสั่งกำลังทำงาน */
    actionsBusy?: boolean;
}

// <h1> เสมอ: นี่คือหน้า ส่วนการ์ดข้างในเป็น h2/h3 ผ่าน SectionHeader
// อีก 4 หน้าของแอดมินใช้ <h2> เป็นหัวเพจ ซึ่งทำให้ทุกหน้าไม่มี h1 เลย
//
// items-start ไม่ใช่ items-center: หัวเรื่องภาษาไทยตัดสองบรรทัดในคอลัมน์แคบ
// การจัดกึ่งกลางแนวตั้งจะลากปุ่มลงไปกลางบล็อก
// flex-wrap ให้ปุ่มตกลงไปอยู่แถวของตัวเองที่ 360px แทนที่จะบีบหัวเรื่อง
//
// tracking-tight เท่านั้น ห้ามค่าบวก -- ทิศทางบวกดันวรรณยุกต์ไทยลอยออกจาก
// ตัวอักษรฐาน และไม่มีอะไรหนักกว่า semibold เพราะ 900 ไม่ใช่หนึ่งในน้ำหนัก
// ที่แอปโหลด
//
// print:hidden เพราะเป็นส่วนควบคุม ไม่ใช่เนื้อหา
export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    icon: Icon,
    actions,
    actionsBusy = false,
}) => (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 print:hidden">
        <div className="flex min-w-0 items-start gap-2.5">
            {Icon && (
                <span className="mt-1 shrink-0 text-brand-600" aria-hidden="true">
                    <Icon size={22} />
                </span>
            )}
            <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                    {title}
                </h1>
                {subtitle && (
                    <p className="mt-1 text-sm leading-relaxed text-slate-500">{subtitle}</p>
                )}
            </div>
        </div>
        {actions && (
            <div className="flex flex-wrap items-center gap-2" aria-busy={actionsBusy}>
                {actions}
            </div>
        )}
    </div>
);
