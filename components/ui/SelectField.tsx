import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface SelectFieldOption {
    value: string;
    label: string;
}

export interface SelectFieldProps {
    value: string;
    onChange: (value: string) => void;
    options: readonly SelectFieldOption[];
    ariaLabel: string;
    icon?: LucideIcon;
    id?: string;
    name?: string;
    /** ความกว้าง เช่น 'sm:w-48' — ตัว field เองไม่กำหนดความกว้าง */
    className?: string;
}

// chevron อยู่ในตัว ของเดิมทั้ง 7 ที่ในโฟลเดอร์ admin วาดเองด้วย
// `<ChevronRight className="rotate-90" />` ซึ่งเป็นไอคอนผิดตัวที่ถูกหมุนให้ดูถูก
export const SelectField: React.FC<SelectFieldProps> = ({
    value,
    onChange,
    options,
    ariaLabel,
    icon: Icon,
    id,
    name,
    className = '',
}) => (
    <div className={`relative w-full ${className}`}>
        {Icon && (
            <Icon
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
            />
        )}
        <select
            id={id}
            name={name}
            aria-label={ariaLabel}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={
                'min-h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 ' +
                `${Icon ? 'pl-9' : 'pl-3'} pr-9 text-sm text-slate-900 transition ` +
                'focus:border-brand-300 focus:outline-2 focus:outline-offset-0 focus:outline-brand-500'
            }
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
        <ChevronDown
            size={14}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
        />
    </div>
);
