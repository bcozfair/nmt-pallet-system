import React from 'react';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    invalid?: boolean;
}

// คลาสชุดเดียวกับ TextInput ยกเว้นความสูง ซึ่งมาจาก `rows` แทน `min-h`
// และ `resize-none` เพราะช่องที่ยืดได้ในกล่องที่ max-h-[90vh] อยู่แล้ว จะดันหัว
// กับท้ายกล่องจนเลย์เอาต์แตกได้
const BASE =
    'w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 transition resize-none ' +
    'placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2';

// `border-line-control` ไม่ใช่ `border-slate-200`: กล่องขาวใบนี้วางอยู่บนการ์ดขาว
// เส้นขอบจึงเป็นสิ่งเดียวที่บอกว่ามันเป็นช่องกรอก ค่าเดิมวัดได้ 1.23:1 ซึ่งจางจน
// ช่องกรอกละลายไปกับการ์ด ตัวเลขที่ใช้อยู่และเหตุผลที่มันไม่ถึง 3:1 อยู่ที่โทเคน
// `--color-line-control` ใน index.css ที่เดียว -- อย่าคัดตัวเลขมาเขียนซ้ำที่นี่
const SURFACE_IDLE = 'border-line-control focus-visible:outline-brand-500';
const SURFACE_INVALID = 'border-red-300 focus-visible:outline-red-500';

export const TextArea: React.FC<TextAreaProps> = ({
    invalid = false,
    className = '',
    rows = 3,
    ...rest
}) => (
    <textarea
        rows={rows}
        className={`${BASE} ${invalid ? SURFACE_INVALID : SURFACE_IDLE} ${className}`}
        {...rest}
    />
);
