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
    /** สี่ตัวนี้มาจาก FieldControlProps ตรง ๆ -- Field.tsx ส่งมาให้ทั้งก้อนผ่าน
        `{...aria}` เหมือนที่ TextInput/TextArea รับ อย่าคัดมาแค่ id เฉย ๆ ไม่งั้น
        select ที่อยู่ใต้ error message จะไม่ประกาศตัวเองว่าผิดพลาดเลย */
    'aria-describedby'?: string;
    'aria-invalid'?: true;
    'aria-required'?: true;
    /** ทาสีสถานะผิดพลาด -- ชุดเดียวกับ TextInput.tsx */
    invalid?: boolean;
}

// chevron อยู่ในตัว ของเดิมทั้ง 7 ที่ในโฟลเดอร์ admin วาดเองด้วย
// `<ChevronRight className="rotate-90" />` ซึ่งเป็นไอคอนผิดตัวที่ถูกหมุนให้ดูถูก
//
// สลับทั้งชุด ไม่ใช่ต่อ `border-red-300` ทับสตริงที่มี `border-slate-200` อยู่แล้ว
// -- ชุดเดียวกับ TextInput.tsx:19-23 เป๊ะ เพื่อให้ select กับ input ที่นั่งอยู่ใน
// ฟอร์มเดียวกันดูเป็นวัตถุชิ้นเดียวกันตอนผิดพลาด
// `border-line-control` ไม่ใช่ `border-slate-200`: กล่องขาวใบนี้วางอยู่บนการ์ดขาว
// เส้นขอบจึงเป็นสิ่งเดียวที่บอกว่ามันเป็นช่องกรอก ค่าเดิมวัดได้ 1.23:1 ซึ่งจางจน
// ช่องกรอกละลายไปกับการ์ด ตัวเลขที่ใช้อยู่และเหตุผลที่มันไม่ถึง 3:1 อยู่ที่โทเคน
// `--color-line-control` ใน index.css ที่เดียว -- อย่าคัดตัวเลขมาเขียนซ้ำที่นี่
const SURFACE_IDLE = 'border-line-control focus-visible:outline-brand-500';
const SURFACE_INVALID = 'border-red-300 focus-visible:outline-red-500';

export const SelectField: React.FC<SelectFieldProps> = ({
    value,
    onChange,
    options,
    ariaLabel,
    icon: Icon,
    id,
    name,
    className = '',
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    'aria-required': ariaRequired,
    invalid = false,
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
            aria-describedby={ariaDescribedBy}
            aria-invalid={ariaInvalid}
            aria-required={ariaRequired}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={
                'min-h-10 w-full appearance-none rounded-xl border bg-white py-2 ' +
                `${Icon ? 'pl-9' : 'pl-3'} pr-9 text-sm text-slate-900 transition ` +
                `focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    invalid ? SURFACE_INVALID : SURFACE_IDLE
                }`
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
