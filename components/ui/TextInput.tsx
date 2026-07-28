import React from 'react';

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    /** ทาสีสถานะผิดพลาด -- Field ส่งมาให้เองผ่าน FieldControlProps */
    invalid?: boolean;
    /** รหัสพาเลทเป็นสตริงที่คนอ่านทีละตัวอักษร ฟอนต์โมโนทำให้ 0 กับ O ต่างกัน */
    mono?: boolean;
}

// ทาสีชุดเดียวกับ SelectField.tsx:48-52 เป๊ะ ทั้งความสูงขั้นต่ำ รัศมี สีขอบ และ
// focus ring -- ช่องกรอกกับช่องเลือกที่นั่งอยู่ในฟอร์มเดียวกันต้องเป็นวัตถุเดียวกัน
//
// `min-h-10` ไม่ใช่ `h-10` ด้วยเหตุผลเดียวกับ Button.tsx:28-30
const BASE =
    'min-h-10 w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 transition ' +
    'placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2';

// สลับทั้งชุด ไม่ใช่ต่อ `border-red-300` ทับสตริงที่มี `border-slate-200` อยู่แล้ว
// -- Card.tsx:22-29 บันทึกกับดักนี้ไว้ ทั้งสองตัวเป็น selector คลาสเดี่ยวเหมือนกัน
// ผู้ชนะจึงตัดสินที่ลำดับใน CSS ที่ build ออกมา
const SURFACE_IDLE = 'border-slate-200 focus-visible:outline-brand-500';
const SURFACE_INVALID = 'border-red-300 focus-visible:outline-red-500';

export const TextInput: React.FC<TextInputProps> = ({
    invalid = false,
    mono = false,
    className = '',
    ...rest
}) => (
    <input
        className={`${BASE} ${invalid ? SURFACE_INVALID : SURFACE_IDLE} ${
            mono ? 'font-mono uppercase' : ''
        } ${className}`}
        {...rest}
    />
);
