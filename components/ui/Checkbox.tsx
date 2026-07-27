import React, { useEffect, useRef } from 'react';

export interface CheckboxProps {
    checked: boolean;
    /** สถานะ "เลือกบางส่วน" ของช่องหัวตาราง ถูกเมินเมื่อ `checked` เป็น true */
    indeterminate?: boolean;
    onChange: () => void;
    ariaLabel: string;
    id?: string;
}

// `rounded-md` ไม่ใช่ `rounded-full` ซึ่งเป็นของเดิมในตารางคลังพาเลท: ช่องกลม
// สื่อว่าเลือกได้อันเดียว ซึ่งตรงข้ามกับสิ่งที่ตารางนี้ทำอยู่จริง
//
// เครื่องหมายถูกเป็น SVG ฝัง base64 ใน background-image ของ ::after เพราะ
// `appearance-none` ลบเครื่องหมายที่เบราว์เซอร์วาดให้ทิ้งไปด้วย สตริงนั้นเคยถูก
// คัดลอกไว้สองที่ใน InventoryTable.tsx และตัวหนึ่งตกคุณสมบัติ stroke-linejoin ไป
// -- ซึ่งไม่มีใครเห็นเพราะมันต่างกันไม่กี่พิกเซล ตอนนี้มีที่เดียว
const TICK =
    "bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwb2x5bGluZSBwb2ludHM9IjIwIDYgOSAxNyA0IDEyIiAvPjwvc3ZnPg==')]";

const BOX =
    'relative h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-md border-2 ' +
    'border-slate-300 bg-white transition ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ' +
    'checked:border-brand-600 checked:bg-brand-600 ' +
    'indeterminate:border-brand-600 indeterminate:bg-brand-600';

const CHECKED_MARK =
    "checked:after:content-[''] checked:after:absolute checked:after:left-1/2 checked:after:top-1/2 " +
    'checked:after:h-3 checked:after:w-3 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2 ' +
    `checked:after:bg-contain checked:after:bg-center checked:after:bg-no-repeat checked:after:${TICK}`;

// ขีดกลางวาดด้วยกล่องเปล่า ไม่ใช่ SVG อีกอัน -- มันคือสี่เหลี่ยมขาว 2px ไม่คุ้มกับ
// การฝังไฟล์ที่สอง
const INDETERMINATE_MARK =
    "indeterminate:after:content-[''] indeterminate:after:absolute indeterminate:after:left-1/2 " +
    'indeterminate:after:top-1/2 indeterminate:after:h-0.5 indeterminate:after:w-2 ' +
    'indeterminate:after:-translate-x-1/2 indeterminate:after:-translate-y-1/2 ' +
    'indeterminate:after:rounded-full indeterminate:after:bg-white';

export const Checkbox: React.FC<CheckboxProps> = ({
    checked,
    indeterminate = false,
    onChange,
    ariaLabel,
    id,
}) => {
    const ref = useRef<HTMLInputElement>(null);

    // `indeterminate` เป็น property ของ DOM node ไม่ใช่ attribute ของ HTML
    // เขียนใน JSX ตรง ๆ ไม่ได้ ต้องตั้งผ่าน ref หลัง render ทุกครั้ง
    useEffect(() => {
        if (ref.current) ref.current.indeterminate = indeterminate && !checked;
    }, [indeterminate, checked]);

    return (
        <input
            ref={ref}
            id={id}
            type="checkbox"
            aria-label={ariaLabel}
            checked={checked}
            onChange={onChange}
            className={`${BOX} ${CHECKED_MARK} ${INDETERMINATE_MARK}`}
        />
    );
};
