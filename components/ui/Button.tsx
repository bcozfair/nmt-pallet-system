import React from 'react';
import type { LucideIcon } from 'lucide-react';

export type ButtonVariant =
    | 'primary'
    | 'secondary'
    | 'danger'
    | 'ghost'
    | 'inverse'
    | 'inverseGhost';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    icon?: LucideIcon;
    iconRight?: LucideIcon;
    size?: 'sm' | 'md';
}

// ยกมาจาก components/admin/dashboard/sections/PageHeader.tsx ทั้งชุด ที่นั่นเคยเป็น
// ค่าคงที่ประจำไฟล์ ทำให้ทุกหน้าที่เหลือในแอปประกอบคลาสปุ่มขึ้นเองทีละที่ -- 20 กว่าที่
// ที่ไม่มีอะไรรับประกันว่าจะเหมือนกัน
//
// `min-h-10` ไม่ใช่ `h-10` เด็ดขาด: ป้ายปุ่มภาษาไทยกว้างกว่าต้นฉบับอังกฤษ 1.4-1.7 เท่า
// และเบราว์เซอร์ตัดคำกลางคำไม่ได้ ความสูงตายตัวจึงตัดป้ายขาดในภาษาเดียว --
// ภาษาที่คนรีวิวสกรีนช็อตอังกฤษไม่มีวันเห็น
export const BUTTON_BASE =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold leading-snug ' +
    'transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 ' +
    'focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60';

export const BUTTON_SIZE: Record<'sm' | 'md', string> = {
    sm: 'min-h-8 px-2.5 py-1 text-xs',
    md: 'min-h-10 px-3.5 py-2 text-sm',
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
    ghost: 'text-slate-600 hover:bg-slate-100 active:scale-[0.99]',
    // สองตัวล่างสำหรับพื้นเข้มเท่านั้น (SelectionBar) -- brand-600 บน brand-900
    // คอนทราสต์ต่ำเกินอ่าน และการส่ง className ไปทับจากข้างนอกใช้ไม่ได้
    // เพราะลำดับคลาส Tailwind ตัดสินที่ CSS ที่ build ออกมา ไม่ใช่ลำดับในสตริง
    inverse: 'bg-white text-brand-900 hover:bg-slate-100 active:scale-[0.99]',
    inverseGhost:
        'border border-white/25 bg-white/10 text-white hover:bg-white/20 active:scale-[0.99] ' +
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
    const iconSize = size === 'sm' ? 14 : 16;
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
