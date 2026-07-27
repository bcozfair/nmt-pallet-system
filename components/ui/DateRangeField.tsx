import React from 'react';
import { Calendar, ChevronDown, X } from 'lucide-react';

export interface DateRange {
    start: string;
    end: string;
}

export interface DateRangeFieldProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
    startLabel: string;
    endLabel: string;
    clearLabel: string;
    idPrefix?: string;
    className?: string;
}

// `<input type="date">` โปร่งใสวางทับ `<input type="text">` ที่แสดงวันที่รูปแบบ
// DD/MM/YYYY -- เพราะเบราว์เซอร์แต่ละตัวจัดรูปแบบและวางไอคอนปฏิทินของ input วันที่
// ไม่เหมือนกันเลย และสั่งด้วย CSS ไม่ได้ นี่เป็นวิธีเดียวที่ทำให้ทุกเบราว์เซอร์
// แสดงวันที่ในรูปแบบเดียวกับที่ formatDate ใช้ทั้งแอป
//
// input ตัวบนได้ tabIndex={-1} และ aria-hidden: มันคือของตกแต่ง ไม่ใช่ช่องกรอก
// ของเดิมทั้งใน InventoryFilters และ TransactionFilters ไม่มีสองอย่างนี้ ทำให้แท็บ
// ไปหยุดที่ช่องที่อ่านออกเสียงแล้วไม่ได้อะไรเลย แล้วต้องแท็บอีกทีถึงจะถึงตัวจริง
const DateCell: React.FC<{
    id?: string;
    label: string;
    value: string;
    onChange: (next: string) => void;
}> = ({ id, label, value, onChange }) => (
    <div className="group/date relative w-28">
        <input
            type="text"
            readOnly
            tabIndex={-1}
            aria-hidden="true"
            placeholder={label}
            value={value ? value.split('-').reverse().join('/') : ''}
            className="w-full cursor-pointer bg-transparent pr-4 text-left text-sm text-slate-700 outline-none placeholder:text-slate-400"
        />
        <ChevronDown
            size={14}
            className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-hover/date:text-brand-500"
            aria-hidden="true"
        />
        <input
            id={id}
            type="date"
            aria-label={label}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
    </div>
);

export const DateRangeField: React.FC<DateRangeFieldProps> = ({
    value,
    onChange,
    startLabel,
    endLabel,
    clearLabel,
    idPrefix = 'date-range',
    className = '',
}) => (
    <div
        className={
            'flex min-h-10 w-full items-center justify-between gap-2 rounded-xl border ' +
            `border-slate-200 bg-slate-50 px-2 py-1.5 sm:w-auto sm:justify-start ${className}`
        }
    >
        <Calendar size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
        <div className="flex items-center gap-1">
            <DateCell
                id={`${idPrefix}-start`}
                label={startLabel}
                value={value.start}
                onChange={(start) => onChange({ ...value, start })}
            />
            <span className="text-slate-300" aria-hidden="true">
                -
            </span>
            <DateCell
                id={`${idPrefix}-end`}
                label={endLabel}
                value={value.end}
                onChange={(end) => onChange({ ...value, end })}
            />
        </div>
        {(value.start || value.end) && (
            <button
                type="button"
                onClick={() => onChange({ start: '', end: '' })}
                aria-label={clearLabel}
                className="rounded-full p-1 text-slate-400 transition hover:bg-slate-200 hover:text-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
                <X size={14} aria-hidden="true" />
            </button>
        )}
    </div>
);
