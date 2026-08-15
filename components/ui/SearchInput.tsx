import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    ariaLabel: string;
    /** aria-label ของปุ่มล้าง อ่านออกเสียง จึงไม่ใช่ตัวเดียวกับ placeholder */
    clearLabel: string;
    id?: string;
    name?: string;
    className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
    value,
    onChange,
    placeholder,
    ariaLabel,
    clearLabel,
    id,
    name,
    className = '',
}) => (
    // ตัวห่อเป็น relative w-full ${className} เสมอ -- className ที่ส่งเข้ามาแบบไม่มี
    // responsive prefix (เช่น 'w-64') ไม่รับประกันว่าจะชนะ w-full ที่อยู่ก่อนหน้าในสตริง
    // เพราะลำดับคลาสตัดสินที่ CSS ที่ build ออกมา ไม่ใช่ลำดับในสตริงรันไทม์ ใช้ pattern
    // แบบมี responsive prefix เช่น 'sm:w-48' ที่การันตีว่าชนะได้จริง
    <div className={`relative w-full ${className}`}>
        <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
        />
        <input
            id={id}
            name={name}
            type="text"
            aria-label={ariaLabel}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            // pr-9 เผื่อปุ่มล้าง ไว้ตลอดแม้ตอนไม่มีปุ่ม ไม่งั้นข้อความจะขยับตอนพิมพ์
            // ตัวแรกซึ่งเป็นจังหวะที่สายตากำลังจับอยู่ที่ข้อความพอดี
            className={
                // border-line-control: ช่องค้นหาเป็นตัวควบคุม ไม่ใช่กล่องตกแต่ง
                // -- เหตุผลเต็มที่ TextInput.tsx และที่โทเคนใน index.css
                'min-h-10 w-full rounded-xl border border-line-control bg-white py-2 pl-9 pr-9 ' +
                'text-sm text-slate-900 placeholder:text-slate-400 transition ' +
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'
            }
        />
        {value && (
            <button
                type="button"
                onClick={() => onChange('')}
                aria-label={clearLabel}
                className={
                    'absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 ' +
                    'transition hover:bg-slate-100 hover:text-slate-600 ' +
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'
                }
            >
                <X size={14} aria-hidden="true" />
            </button>
        )}
    </div>
);
