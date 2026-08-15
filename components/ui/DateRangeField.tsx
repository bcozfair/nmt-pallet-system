import React, { useId } from 'react';
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
    /** ไม่ระบุแล้วปล่อยให้ `useId()` สร้างให้ -- กันสอง instance บนหน้าเดียวกันชน id กัน */
    idPrefix?: string;
    // ชื่อฟิลด์ของ input วันที่ทั้งสองช่อง ตรงกับที่ SearchInput และ SelectField รับ
    // `name` เหมือนกัน ของเดิมใน InventoryFilters เคยใส่ name="startDate" /
    // name="endDate" ไว้ แล้วหล่นหายตอนย้ายมาเป็น primitive -- วันนี้ยังไม่มีผลกับ
    // ผู้ใช้เพราะไม่มีการ submit form แต่เป็นความไม่สม่ำเสมอของ API ในชุดเดียวกัน
    // และอีกสี่หน้ากำลังจะมาใช้ primitive ตัวนี้
    //
    // ลงที่ input type="date" ตัวจริงเท่านั้น ไม่ลงที่ input type="text" ที่วางทับอยู่
    // ข้างบน -- ตัวนั้นเป็นของตกแต่ง (aria-hidden, tabIndex -1) การให้ name ไปด้วย
    // จะทำให้ค่าที่ซ้ำกันสองชุดถูกส่งไปในฟอร์มเดียว
    startName?: string;
    endName?: string;
    // ตัวห่อ control เป็น relative w-full ... sm:w-auto ${className} เสมอ -- className
    // ที่ส่งเข้ามาแบบไม่มี prefix (เช่น 'w-64') ไม่รับประกันว่าจะชนะ w-full/sm:w-auto ที่
    // อยู่ก่อนหน้าในสตริง เพราะลำดับคลาสตัดสินที่ CSS ที่ build ออกมา ไม่ใช่ลำดับในสตริง
    // รันไทม์ ใช้ pattern แบบมี responsive prefix เช่น 'sm:w-48' ที่การันตีว่าชนะได้จริง
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
//
// input จริงที่คีย์บอร์ดโฟกัสได้ (ตัวล่าง) เป็น opacity-0 ทั้งตัว -- วง focus ที่วาด
// บนตัวมันเองจะโปร่งใสไปด้วย มองไม่เห็น จึงย้ายวง focus ไปไว้ที่ wrapper แทน โดยใช้
// `has-[:focus-visible]` ของ Tailwind v4 ให้ wrapper ตอบสนองสถานะโฟกัสของ input
// ที่อยู่ข้างในแทนที่จะพึ่งวงที่วาดบน input ที่มองไม่เห็นอยู่แล้ว
const DateCell: React.FC<{
    id?: string;
    name?: string;
    label: string;
    value: string;
    onChange: (next: string) => void;
}> = ({ id, name, label, value, onChange }) => (
    <div className="group/date relative w-28 rounded-md has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-500">
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
            name={name}
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
    idPrefix,
    startName,
    endName,
    className = '',
}) => {
    // ค่า default เดิมเป็นค่าคงที่ 'date-range' ธรรมดา ทำให้สอง instance บนหน้าเดียวกัน
    // ที่ไม่ได้ส่ง idPrefix มาชนกันเป็น id="date-range-start" ซ้ำ -- HTML ไม่ยอมให้ id
    // ซ้ำและมันทำให้ label/control เชื่อมกันผิดตัว useId() การันตีว่าไม่ชนไม่ว่าจะมีกี่
    // instance โดยที่ idPrefix ที่ส่งมาจากภายนอกยังชนะเหมือนเดิม
    const generatedPrefix = useId();
    const prefix = idPrefix ?? generatedPrefix;

    return (
        <div
            className={
                'flex min-h-10 w-full items-center justify-between gap-2 rounded-xl border ' +
                // border-line-control: กล่องนี้เป็นตัวควบคุมที่มีช่องกรอกวันที่อยู่ข้างใน
                // เส้นขอบคือสิ่งที่มัดสองช่องให้อ่านเป็นฟิลด์เดียว -- ดูโทเคนใน index.css
                `border-line-control bg-slate-50 px-2 py-1.5 sm:w-auto sm:justify-start ${className}`
            }
        >
            <Calendar size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
            <div className="flex items-center gap-1">
                <DateCell
                    id={`${prefix}-start`}
                    name={startName}
                    label={startLabel}
                    value={value.start}
                    onChange={(start) => onChange({ ...value, start })}
                />
                <span className="text-slate-300" aria-hidden="true">
                    -
                </span>
                <DateCell
                    id={`${prefix}-end`}
                    name={endName}
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
};
