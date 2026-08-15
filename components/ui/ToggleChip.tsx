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
// สถานะที่เลือกอยู่ก็ต้องขยับตอนชี้ เท่ากับสถานะที่ยังไม่เลือก -- ของเดิมมีแต่ฝั่ง
// ยังไม่เลือกที่มี hover ชิปที่เลือกแล้วจึงนิ่งสนิท ซึ่งอ่านเหมือน "กดไม่ได้แล้ว"
// ทั้งที่มันคือปุ่มที่กดเพื่อ *ยกเลิก* การเลือก
//
// เข้มขึ้นหนึ่งขั้น ไม่ใช่จางลง: ทิศทางเดียวกับฝั่งยังไม่เลือก (slate-200 -> slate-300)
// `brand-100` ไม่ใช่ `brand-200` เพราะ `brand-200` เป็นสีเส้นขอบของสถานะนี้พอดี
// พื้นกับขอบจะกลายเป็นสีเดียวกัน ชิปเลยเสียเส้นขอบไปตอนชี้ ส่วนตัวหนังสือ
// `brand-700` บน `brand-100` ได้ 7.43:1 และ `red-700` บน `red-100` ได้ 5.30:1
const TONE_ON: Record<'brand' | 'critical', string> = {
    brand: 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100',
    critical: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
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
            // สองสถานะนี้ต่างกันทั้ง "ความสูง" และสี:
            //   ยังไม่เลือก = แผ่นเทาอ่อนที่ลอยอยู่ (`shadow-raised` ชุดเดียวกับปุ่มรอง)
            //   เลือกแล้ว   = แผ่นที่ถูกกดจมลงไป จึงแบน ไม่มีเงา และมีสีน้ำเงินค้างไว้
            //
            // พื้นเคยเป็น `bg-white` ซึ่งใช้ไม่ได้ตรงที่มันไปใช้จริง: ชิปเลือกวันในหน้า
            // ตั้งค่าแจ้งเตือนนั่งอยู่บนการ์ดสีขาว ชิปที่ยังไม่เลือกจึงเป็นขาวบนขาว = 1:1
            // เหลือแค่เงาบาง ๆ เป็นสิ่งเดียวที่บอกว่ามีปุ่มอยู่ตรงนั้น -- ในทางปฏิบัติคือ
            // มองไม่เห็นว่ามีวันให้เลือกอีก 2 วัน
            //
            // `slate-200` ไม่ใช่ `slate-100`: slate-100 ได้ 1.10:1 บนการ์ดขาว ซึ่งห่างจาก
            // สถานะเลือกแล้ว (`brand-50` = 1.12:1) แค่ 1.02:1 -- สองสถานะจะต่างกันที่ hue
            // อย่างเดียว ส่วน `slate-200` ได้ 1.23:1 บนการ์ด และ 1.11:1 เทียบกับสถานะ
            // เลือกแล้ว พอให้แยกออกโดยไม่ต้องพึ่งสีอย่างเดียว
            //
            // hover เข้มขึ้น ไม่ใช่จางลง: ของเดิมเป็น `hover:bg-slate-50` ซึ่งจางกว่าพื้น
            // ปกติ ตอนพื้นเป็นขาวมันยังพอสื่อได้ แต่ตอนนี้จะกลายเป็น "ชี้แล้วปุ่มจางลง"
            //
            // `border-transparent` ไม่ใช่การถอดคลาส `border` ออกจากสตริงฐาน: Tailwind v4
            // ตั้งค่าสีขอบเริ่มต้นเป็น `currentColor` การปล่อย `border` ไว้เฉย ๆ จะได้
            // เส้นสีเดียวกับตัวหนังสือ -- เส้นเทาเข้มรอบชิปทุกใบ ส่วนการถอด `border`
            // ออกจากฐานจะทำให้สองสถานะมีเมตริกต่างกัน 2px
            (pressed
                ? TONE_ON[tone]
                : 'border-transparent bg-slate-200 text-slate-600 shadow-raised hover:bg-slate-300') +
            ` ${className}`
        }
    >
        {Icon && <Icon size={16} aria-hidden="true" />}
        {label}
    </button>
);
