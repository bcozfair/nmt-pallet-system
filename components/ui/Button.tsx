import React from 'react';
import type { LucideIcon } from 'lucide-react';

export type ButtonVariant =
    | 'primary'
    | 'secondary'
    | 'danger'
    | 'dangerSolid'
    | 'ghost'
    | 'accent'
    | 'accentSoft'
    | 'inverse'
    | 'inverseGhost'
    | 'inverseAccent'
    | 'inverseDanger';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    icon?: LucideIcon;
    iconRight?: LucideIcon;
    size?: 'sm' | 'md' | 'lg';
}

// ยกมาจาก components/admin/dashboard/sections/PageHeader.tsx ทั้งชุด ที่นั่นเคยเป็น
// ค่าคงที่ประจำไฟล์ ทำให้ทุกหน้าที่เหลือในแอปประกอบคลาสปุ่มขึ้นเองทีละที่ -- 20 กว่าที่
// ที่ไม่มีอะไรรับประกันว่าจะเหมือนกัน
//
// ที่มาของขนาดและทรง: ปุ่มยืนยันของหน้าเข้าสู่ระบบ (components/LoginPage.tsx) ย่อลงมา
// -- รัศมีเดียวกัน สีพื้นแบรนด์เดียวกัน เงาโทนเดียวกัน ต่างแค่ py-2 แทน py-3 บันทึกไว้
// เพราะถ้าไม่รู้ที่มา คนถัดไปจะปรับตัวเลขพวกนี้ตามใจแล้วสองฝั่งของแอปก็แยกจากกันอีก
//
// `min-h-10` ไม่ใช่ `h-10` เด็ดขาด: ป้ายปุ่มภาษาไทยกว้างกว่าต้นฉบับอังกฤษ 1.4-1.7 เท่า
// และเบราว์เซอร์ตัดคำกลางคำไม่ได้ ความสูงตายตัวจึงตัดป้ายขาดในภาษาเดียว --
// ภาษาที่คนรีวิวสกรีนช็อตอังกฤษไม่มีวันเห็น
export const BUTTON_BASE =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold leading-snug ' +
    'transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 ' +
    'focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60';

// `min-h-*` ไม่ใช่ `h-*` เด็ดขาด -- เหตุผลอยู่ในคอมเมนต์เหนือ BUTTON_BASE
//
// `lg` เพิ่มเข้ามาสำหรับหน้าฝั่งพนักงาน ซึ่งกดบนมือถือกลางโกดัง บ่อยครั้งใส่ถุงมือ
// ปุ่มเดิมที่นั่นเป็น `py-4` (~56px) ประกอบเองทีละที่ การบังคับให้ใช้ `md` (40px)
// คือการลดเป้ากดลงเพื่อความสม่ำเสมอ ส่วนการปล่อยให้ส่ง className ทับก็คือการ
// กระจายขนาดออกไปหลายที่อีกครั้ง ซึ่งเป็นปัญหาที่ตารางนี้มีอยู่เพื่อแก้ตั้งแต่แรก
export const BUTTON_SIZE: Record<'sm' | 'md' | 'lg', string> = {
    sm: 'min-h-8 px-2.5 py-1 text-xs',
    md: 'min-h-10 px-3.5 py-2 text-sm',
    lg: 'min-h-14 px-5 py-3.5 text-base',
};

export const BUTTON_VARIANT: Record<ButtonVariant, string> = {
    primary:
        'bg-brand-600 text-white shadow-lg shadow-brand-600/20 hover:bg-brand-700 ' +
        'active:scale-[0.99] disabled:hover:bg-brand-600',
    secondary:
        'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 ' +
        'active:scale-[0.99] disabled:hover:bg-white',
    // ยกมาจากปุ่ม cleanup ใน components/admin/transactions/TransactionHeader.tsx
    // เพื่อให้รอบที่ย้ายหน้ารายการมาใช้ primitive ไม่ต้องคิดสีใหม่
    danger:
        'border border-red-200 bg-white text-red-600 hover:bg-red-50 ' +
        'active:scale-[0.99] disabled:hover:bg-white',
    // `danger` ข้างบนเป็นปุ่มอันตรายที่นั่งปนกับปุ่มอื่นบนหน้า -- เส้นขอบ พื้นขาว
    // ตัวหนังสือแดง อ่านว่า "ระวัง" โดยไม่ตะโกน ตัวนี้คนละหน้าที่: เป็นปุ่มหลักใน
    // ท้ายโมดัลยืนยัน ซึ่งมีปุ่มยกเลิก (secondary -- พื้นขาว เส้นขอบเทา) นั่งซ้ายมือ
    // อยู่แล้ว ถ้าใช้ `danger` ตรงนั้น ปุ่มทำลายจะมีน้ำหนักสายตาเท่าหรือน้อยกว่า
    // ปุ่มถอย ซึ่งกลับหัวลำดับความสำคัญของกล่อง
    //
    // ทรงยกมาจาก `primary` ทั้งชุด เปลี่ยนแค่ hue: ปุ่มยืนยันของทุกโมดัลจึงเป็น
    // วัตถุเดียวกันไม่ว่าจะทำลายหรือไม่ ต่างกันที่สีอย่างเดียว
    dangerSolid:
        'bg-red-600 text-white shadow-lg shadow-red-600/20 hover:bg-red-700 ' +
        'active:scale-[0.99] disabled:hover:bg-red-600',
    ghost: 'text-slate-600 hover:bg-slate-100 active:scale-[0.99] disabled:hover:bg-transparent',
    // สองตัวนี้เป็นสีเขียวน้ำทะเลของโลโก้ (`accent-*` ใน index.css คือสีตัวที่สองของ
    // NMT wordmark) ใช้กับตระกูลปุ่ม "พิมพ์ QR" ทั้งหมด เพื่อให้ทุกทางเข้าสู่การพิมพ์ QR
    // -- หัวหน้าคลัง แถบเลือกหลายรายการ ไอคอนท้ายแถว และปุ่มพิมพ์ในโมดัล -- เป็นสีเดียวกัน
    //
    // ฐานเป็น `accent-700` (#037777) ไม่ใช่ `accent-500` (#01b5b4) ที่สดกว่า เพราะป้ายปุ่ม
    // เป็น text-sm ซึ่งนับเป็นตัวอักษรปกติ ต้องได้คอนทราสต์ 4.5:1 ขึ้นไป: ตัวอักษรขาวบน
    // `accent-500` ได้แค่ 2.4:1 บน `accent-600` ได้ 3.6:1 -- ตกทั้งคู่ ส่วน `accent-700`
    // ได้ 5.4:1 ผ่าน (เทียบกับ `primary` ที่ 7.6:1) อย่าเลื่อนกลับขึ้นไปหาเฉดที่สดกว่านี้
    // โดยไม่เปลี่ยนสีตัวอักษร
    accent:
        'bg-accent-700 text-white shadow-lg shadow-accent-700/20 hover:bg-accent-800 ' +
        'active:scale-[0.99] disabled:hover:bg-accent-700',
    // ทรงเดียวกับ `secondary` เป๊ะ เปลี่ยนแค่ hue: สำหรับปุ่มตระกูล accent ที่ต้องนั่งข้าง
    // ปุ่ม `primary` ของหน้า แล้วยอมถอยให้ปุ่มหลักเด่นกว่า -- ปัจจุบันคือปุ่ม "ทดสอบส่ง" ใน
    // หน้าตั้งค่าแจ้งเตือน (NotificationSettings.tsx) ที่มี "บันทึกการเปลี่ยนแปลง" อยู่บนหัวเพจ
    //
    // ปุ่ม "พิมพ์ QR" บนหัวหน้าคลังเคยใช้ตัวนี้ด้วยเหตุผลเดียวกัน แต่ถูกเปลี่ยนเป็น `accent`
    // ทึบตามที่เจ้าของงานสั่ง เพื่อให้สีตรงกับปุ่ม "พิมพ์ / PDF" ในโมดัลที่มันเปิดขึ้นมา
    // ผลคือหัวหน้าคลังมีปุ่มทึบสองสี (accent + primary) นั่งข้างกัน -- ตั้งใจ ไม่ใช่หลุด
    accentSoft:
        'border border-accent-200 bg-white text-accent-700 hover:bg-accent-50 ' +
        'active:scale-[0.99] disabled:hover:bg-white',
    // สองตัวล่างสำหรับพื้นเข้มเท่านั้น (SelectionBar) -- brand-600 บน brand-900
    // คอนทราสต์ต่ำเกินอ่าน และการส่ง className ไปทับจากข้างนอกใช้ไม่ได้
    // เพราะลำดับคลาส Tailwind ตัดสินที่ CSS ที่ build ออกมา ไม่ใช่ลำดับในสตริง
    inverse: 'bg-white text-brand-900 hover:bg-slate-100 active:scale-[0.99] disabled:hover:bg-white',
    inverseGhost:
        'border border-white/25 bg-white/10 text-white hover:bg-white/20 active:scale-[0.99] ' +
        'disabled:hover:bg-white/10 focus-visible:outline-white',
    // คู่ของ `accent` สำหรับพื้นเข้ม (SelectionBar ที่เป็น `bg-brand-900`) ด้วยเหตุผล
    // เดียวกับ `inverseDanger`: `accent-700` บน `brand-900` เป็นสีเข้มบนสีเข้ม แทบไม่ต่างจาก
    // แถบที่มันนั่งอยู่ ตัวนี้จึงยืมทรงของ `inverseGhost` มาแล้วย้อมเป็นเขียวน้ำทะเลแทน
    // ตัวอักษรใช้ `accent-200` ซึ่งได้คอนทราสต์ ~11:1 บนแถบ
    //
    // `focus-visible:outline-white` ทับ `outline-brand-500` ของ BUTTON_BASE ด้วยกลไก
    // เดียวกับที่ `inverseGhost` ใช้ (ดูคอมเมนต์ข้างล่าง)
    inverseAccent:
        'border border-accent-300/40 bg-accent-400/15 text-accent-200 hover:bg-accent-400/25 ' +
        'hover:text-accent-100 active:scale-[0.99] disabled:hover:bg-accent-400/15 ' +
        'focus-visible:outline-white',
    // `danger` is built for a white card and is unreadable here -- red-600 text
    // on brand-900 is barely darker than the bar it sits on. This is the same
    // shape as inverseGhost with the tint carried over to red, which is enough
    // to separate a destructive action from the ones beside it without a
    // filled red button shouting on a bar the user opens routinely.
    //
    // `focus-visible:outline-white` overrides BUTTON_BASE's outline-brand-500
    // the same way inverseGhost does. That override was checked against the
    // built stylesheet rather than assumed: appending a class does not by
    // itself beat one already in the base string (see the note above), but
    // Tailwind emits outline-white after outline-brand-500, so it wins.
    inverseDanger:
        'border border-red-400/40 bg-red-500/15 text-red-200 hover:bg-red-500/25 ' +
        'hover:text-red-100 active:scale-[0.99] disabled:hover:bg-red-500/15 ' +
        'focus-visible:outline-white',
};

export const Button: React.FC<ButtonProps> = ({
    variant = 'secondary',
    icon: Icon,
    iconRight: IconRight,
    size = 'md',
    className = '',
    children,
    type = 'button',
    ...rest
}) => {
    // ไอคอนเป็นของตกแต่งที่ทวนสิ่งที่ป้ายพูดอยู่แล้ว จึง aria-hidden เสมอ
    // ปุ่มที่มีไอคอนอย่างเดียวต้องส่ง aria-label มาเอง
    const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;
    return (
        <button
            type={type}
            className={`${BUTTON_BASE} ${BUTTON_SIZE[size]} ${BUTTON_VARIANT[variant]} ${className}`}
            {...rest}
        >
            {Icon && <Icon size={iconSize} aria-hidden="true" />}
            {children}
            {IconRight && <IconRight size={iconSize} aria-hidden="true" />}
        </button>
    );
};
