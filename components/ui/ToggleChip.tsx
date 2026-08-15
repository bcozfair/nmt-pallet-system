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
            // สองสถานะนี้ต่างกันที่ "ความสูง" ไม่ใช่แค่สี ซึ่งตรงกับความหมายของมันพอดี:
            //   ยังไม่เลือก = แผ่นขาวที่ลอยอยู่ (`shadow-raised` ชุดเดียวกับปุ่มรอง)
            //   เลือกแล้ว   = แผ่นที่ถูกกดจมลงไป จึงแบน ไม่มีเงา และมีสีค้างไว้
            // `border-transparent` ไม่ใช่การถอดคลาส `border` ออกจากสตริงฐาน: Tailwind v4
            // ตั้งค่าสีขอบเริ่มต้นเป็น `currentColor` การปล่อย `border` ไว้เฉย ๆ จะได้
            // เส้นสีเดียวกับตัวหนังสือ -- เส้นเทาเข้มรอบชิปทุกใบ ส่วนการถอด `border`
            // ออกจากฐานจะทำให้สองสถานะมีเมตริกต่างกัน 2px
            (pressed
                ? TONE_ON[tone]
                : 'border-transparent bg-white text-slate-600 shadow-raised hover:bg-slate-50') +
            ` ${className}`
        }
    >
        {Icon && <Icon size={16} aria-hidden="true" />}
        {label}
    </button>
);
