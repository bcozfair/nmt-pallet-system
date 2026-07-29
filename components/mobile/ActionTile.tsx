import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { CARD_SHELL_SHAPE, CARD_SURFACE } from '../ui/Card';

export type ActionTileTone = 'brand' | 'accent' | 'neutral' | 'danger';

/** `stack` = การ์ดใหญ่แนวตั้งสำหรับงานหลัก · `row` = แถวเตี้ยสำหรับงานรอง */
export type ActionTileLayout = 'stack' | 'row';

export interface ActionTileProps {
    icon: LucideIcon;
    title: string;
    /** ละได้เมื่อหัวเรื่องพูดครบแล้ว เช่น แถวรายชื่อสถานที่ */
    subtitle?: string;
    tone?: ActionTileTone;
    layout?: ActionTileLayout;
    onClick: () => void;
    className?: string;
}

// โทนคุมแค่วงกลมไอคอน (และสีหัวเรื่องของโทน danger) เท่านั้น ตัวกล่องเป็น
// CARD_SURFACE เดียวกันทุกโทน -- ต่อคลาสสีขอบเพิ่มเข้าไปในสตริงที่มี
// `border-slate-200/80` อยู่แล้วจะได้คลาสสีขอบสองตัวบน element เดียว และผู้ชนะ
// ตัดสินที่ลำดับใน CSS ที่ build ออกมา (Card.tsx:44-55)
const TONE_CHIP: Record<ActionTileTone, string> = {
    brand: 'bg-brand-50 text-brand-600',
    // accent-700 ไม่ใช่ accent-500: ไอคอนบนชิปอ่อนต้องเข้มพอจะเห็นรูปทรง
    // เหตุผลเดียวกับที่ Button.tsx เลือก accent-700 เป็นฐานของปุ่ม accent
    accent: 'bg-accent-50 text-accent-700',
    neutral: 'bg-slate-100 text-slate-500',
    danger: 'bg-red-50 text-red-600',
};

const TONE_TITLE: Record<ActionTileTone, string> = {
    brand: 'text-slate-900',
    accent: 'text-slate-900',
    neutral: 'text-slate-900',
    danger: 'text-red-700',
};

const TONE_SUBTITLE: Record<ActionTileTone, string> = {
    brand: 'text-slate-500',
    accent: 'text-slate-500',
    neutral: 'text-slate-500',
    danger: 'text-red-500',
};

// `hover:border-brand-200` ต่อท้าย CARD_SURFACE ได้ ทั้งที่ CARD_SURFACE มี
// `border-slate-200/80` อยู่แล้ว -- คลาสที่มี variant นำหน้าชนะคลาสที่ไม่มีเสมอ
// StatTile.tsx:102 ใช้คู่นี้อยู่ก่อนแล้ว นี่คือการทำตาม ไม่ใช่การเสี่ยง
const SHELL =
    `${CARD_SHELL_SHAPE} ${CARD_SURFACE} w-full transition duration-200 ` +
    'hover:border-brand-200 active:scale-[0.99] ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';

// min-h ไม่ใช่ h: หัวเรื่องภาษาไทยตัดสองบรรทัดในการ์ดแคบ ความสูงตายตัวจะตัดคำบรรยายทิ้ง
const LAYOUT: Record<ActionTileLayout, string> = {
    stack: 'flex min-h-[9.5rem] flex-col items-center justify-center gap-3 p-6 text-center',
    row: 'flex items-center justify-between gap-4 p-4 text-left',
};

export const ActionTile: React.FC<ActionTileProps> = ({
    icon: Icon,
    title,
    subtitle,
    tone = 'brand',
    layout = 'stack',
    onClick,
    className = '',
}) => {
    const stack = layout === 'stack';

    const chip = (
        <span
            className={
                'flex shrink-0 items-center justify-center rounded-2xl ' +
                (stack ? 'h-14 w-14 ' : 'h-11 w-11 ') +
                TONE_CHIP[tone]
            }
            aria-hidden="true"
        >
            <Icon size={stack ? 28 : 20} />
        </span>
    );

    const text = (
        <span className="block min-w-0">
            <span className={`block font-semibold ${stack ? 'text-lg' : 'text-base'} ${TONE_TITLE[tone]}`}>
                {title}
            </span>
            {subtitle && (
                <span className={`mt-0.5 block ${stack ? 'text-sm' : 'text-xs'} ${TONE_SUBTITLE[tone]}`}>
                    {subtitle}
                </span>
            )}
        </span>
    );

    return (
        <button type="button" onClick={onClick} className={`${SHELL} ${LAYOUT[layout]} ${className}`}>
            {/* แนวตั้ง: ไอคอนอยู่บนข้อความ · แนวนอน: ข้อความซ้าย ไอคอนขวา
                ลำดับที่ screen reader ได้ยินจึงเป็นหัวเรื่องก่อนเสมอในโหมดแถว
                และเป็นข้อความล้วนทั้งสองโหมด เพราะไอคอนเป็น aria-hidden */}
            {stack ? (
                <>
                    {chip}
                    {text}
                </>
            ) : (
                <>
                    {text}
                    {chip}
                </>
            )}
        </button>
    );
};
