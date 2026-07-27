import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface ToggleChipProps {
    pressed: boolean;
    onChange: (pressed: boolean) => void;
    label: string;
    icon?: LucideIcon;
    /** `critical` สำหรับตัวกรองที่คัดเอาเฉพาะสิ่งที่ต้องรีบจัดการ */
    tone?: 'brand' | 'critical';
    className?: string;
}

// `<button aria-pressed>` จริง ของเดิมใน InventoryFilters.tsx เป็นปุ่มที่วาดวงกลมเปล่า
// กับไอคอนติ๊กสลับกันเอง -- ตาเห็นว่าเป็นสวิตช์ แต่ screen reader ได้ยินแค่ปุ่มธรรมดา
// ที่ป้ายไม่เคยเปลี่ยน จึงไม่มีทางรู้ว่าตัวกรองเปิดอยู่หรือไม่
const TONE_ON: Record<'brand' | 'critical', string> = {
    brand: 'border-brand-200 bg-brand-50 text-brand-700',
    critical: 'border-red-200 bg-red-50 text-red-700',
};

export const ToggleChip: React.FC<ToggleChipProps> = ({
    pressed,
    onChange,
    label,
    icon: Icon,
    tone = 'brand',
    className = '',
}) => (
    <button
        type="button"
        aria-pressed={pressed}
        onClick={() => onChange(!pressed)}
        className={
            'inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl ' +
            'border px-3 py-2 text-sm font-semibold leading-snug transition duration-200 ' +
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ' +
            (pressed
                ? TONE_ON[tone]
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50') +
            ` ${className}`
        }
    >
        {Icon && <Icon size={16} aria-hidden="true" />}
        {label}
    </button>
);
