import React from 'react';

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    /** ทาสีสถานะผิดพลาด -- Field ส่งมาให้เองผ่าน FieldControlProps */
    invalid?: boolean;
    /** รหัสพาเลทเป็นสตริงที่คนอ่านทีละตัวอักษร ฟอนต์โมโนทำให้ 0 กับ O ต่างกัน */
    mono?: boolean;
    /**
     * ช่องที่ค่าเป็นตัวพิมพ์ใหญ่เสมอ -- รหัสพาเลท รหัสพนักงาน
     *
     * แปลงค่าจริงที่ส่งออกทาง onChange ไม่ใช่แค่หน้าตา (ดูคอมเมนต์ข้างล่าง)
     */
    uppercase?: boolean;
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
// `border-line-control` ไม่ใช่ `border-slate-200`: กล่องขาวใบนี้วางอยู่บนการ์ดขาว
// เส้นขอบจึงเป็นสิ่งเดียวที่บอกว่ามันเป็นช่องกรอก ค่าเดิมวัดได้ 1.23:1 ซึ่งจางจน
// ช่องกรอกละลายไปกับการ์ด ตัวเลขที่ใช้อยู่และเหตุผลที่มันไม่ถึง 3:1 อยู่ที่โทเคน
// `--color-line-control` ใน index.css ที่เดียว -- อย่าคัดตัวเลขมาเขียนซ้ำที่นี่
const SURFACE_IDLE = 'border-line-control focus-visible:outline-brand-500';
const SURFACE_INVALID = 'border-red-300 focus-visible:outline-red-500';

// ===== ทำไม `uppercase` ต้องแตะค่า ไม่ใช่แค่คลาส ============================
//
// คลาส `uppercase` ของ Tailwind คือ `text-transform` ซึ่งเปลี่ยนแค่ "ภาพที่วาด
// ออกมา" ค่าใน state ยังเป็นตัวที่ผู้ใช้พิมพ์ทุกตัวอักษร -- คนที่พิมพ์ `p024`
// บนคีย์บอร์ดมือถือจึงเห็น `P024` เต็มตาแต่ส่ง `p024` ออกไป
//
// และปลายทางแยกตัวพิมพ์: `pallet_id` เป็น `text primary key`
// (supabase/migrations/00_current_schema.sql:79) ส่วน getPalletById ค้นด้วย
// `.eq('pallet_id', ...)` -- `p024` จึงไม่เจออะไรเลยทั้งที่พาเลทมีอยู่จริง
//
// เดิมคลาสนี้ผูกติดมากับ `mono` แล้วให้แต่ละที่เรียก `.toUpperCase()` ใน onChange
// เอง ซึ่งเป็นหน้าที่ที่ลืมได้ และถูกลืมไปแล้วสองที่ (ช่องกรอกรหัสเองในหน้าแจ้ง
// ชำรุด และรหัสพนักงานในหน้าเพิ่มผู้ใช้) การผูกติดกันยังบังคับให้ช่องที่อยาก
// ได้ฟอนต์โมโนแต่ห้ามแปลงตัวพิมพ์ -- โทเคน LINE, อีเมล -- ต้องเลี่ยงไปเขียน
// `className="font-mono"` เอง สองเรื่องนี้จึงแยก prop กัน
const applyUppercase = (el: HTMLInputElement) => {
    const next = el.value.toUpperCase();
    if (next === el.value) return;

    // เขียนกลับลง DOM ก่อนส่งต่อ เพื่อให้ onChange ของคนเรียกอ่าน e.target.value
    // ได้ค่าที่แปลงแล้วโดยไม่ต้องรู้เรื่องนี้เลย
    //
    // การเซ็ต .value ดีดเคอร์เซอร์ไปท้ายช่อง จึงต้องคืนตำแหน่งเดิมให้ ไม่งั้นคน
    // ที่แก้ตัวอักษรกลางรหัสจะโดนเคอร์เซอร์กระโดดหนีทุกครั้งที่พิมพ์
    // selectionStart เป็น null ใน input บางชนิดที่ไม่รองรับการเลือกช่วง จึงต้อง
    // เช็ก และคืนตำแหน่งเฉพาะตอนความยาวไม่เปลี่ยน (บางอักษรยาวขึ้นเมื่อเป็นตัวใหญ่)
    const caret = el.selectionStart;
    const sameLength = next.length === el.value.length;
    el.value = next;
    if (caret !== null && sameLength) el.setSelectionRange(caret, caret);
};

// forwardRef เพราะ AddPalletModal/EditPalletModal ต้องส่งช่องรหัสพาเลทเข้า
// `initialFocusRef` ของ Modal (ดูคอมเมนต์ที่ prop นั้นใน Modal.tsx) -- component
// ฟังก์ชันธรรมดารับ ref ไม่ได้ ต้องห่อด้วย forwardRef ถึงจะเป็น target โฟกัสได้
export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
    ({ invalid = false, mono = false, uppercase = false, className = '', onChange, ...rest }, ref) => (
        <input
            ref={ref}
            className={`${BASE} ${invalid ? SURFACE_INVALID : SURFACE_IDLE} ${
                mono ? 'font-mono' : ''
            } ${uppercase ? 'uppercase' : ''} ${className}`}
            // ให้คีย์บอร์ดมือถือขึ้นแป้นตัวใหญ่ตั้งแต่แรก -- ค่าถูกแปลงอยู่แล้วไม่ว่า
            // จะพิมพ์อะไรมา อันนี้เป็นเรื่องของ "สิ่งที่ผู้ใช้เห็นตอนพิมพ์" ให้ตรงกัน
            // วางไว้ก่อน {...rest} คนเรียกจึงยังทับได้
            autoCapitalize={uppercase ? 'characters' : undefined}
            onChange={
                uppercase && onChange
                    ? (e) => {
                          applyUppercase(e.currentTarget);
                          onChange(e);
                      }
                    : onChange
            }
            {...rest}
        />
    ),
);
TextInput.displayName = 'TextInput';
