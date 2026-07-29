import React from 'react';
import { AlertTriangle } from 'lucide-react';

/** สิ่งที่ Field ส่งให้ control ข้างใน กระจายด้วย {...aria} ได้ทั้งก้อน */
export interface FieldControlProps {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': true | undefined;
    'aria-required': true | undefined;
    /** ให้ TextInput/TextArea ทาสีสถานะผิดพลาด */
    invalid: boolean;
}

export interface FieldProps {
    /** ป้ายที่มองเห็น -- ไม่ optional ช่องในฟอร์มต้องมีป้ายเสมอ */
    label: React.ReactNode;
    /** id ของ control ข้างใน Field เดินสาย aria ทั้งหมดจากค่านี้ */
    htmlFor: string;
    required?: boolean;
    hint?: React.ReactNode;
    /** คำเตือน -- ไม่ใช่ความผิดพลาด ช่องยังใช้ได้ */
    warning?: React.ReactNode;
    /** ข้อความผิดพลาด ทับ warning และ hint */
    error?: string;
    /**
     * `vertical` (ปริยาย) ป้ายอยู่บน control -- พฤติกรรมเดิมทุกประการ
     *
     * `horizontal` ป้ายยืนซ้ายของ control บรรทัดเดียวกัน ส่วนหมายเหตุลงไปกินเต็ม
     * แถวข้างล่าง สำหรับแถวที่ป้ายสั้นแต่ control ควรได้ความกว้างที่เหลือทั้งหมด
     */
    orientation?: 'vertical' | 'horizontal';
    children: (control: FieldControlProps) => React.ReactNode;
}

// `children` เป็นฟังก์ชัน ไม่ใช่ node ที่ Field เอาไปยัด prop ใส่
//
// การ "เดินสาย aria ให้อัตโนมัติ" กับ node ต้องทำผ่าน React.cloneElement ซึ่ง
// StatTile.tsx:121-125 บันทึกไว้แล้วว่าเป็นเหตุให้ type ผ่านแต่พังตอนรันไทม์:
// มันแคสต์ ReactNode เป็น ReactElement<any> แล้วยัด prop ลงไป อะไรก็ตามที่ไม่ใช่
// element ที่รับ prop เหล่านั้นจึงพังตอนเรนเดอร์แทนที่จะพังตอนคอมไพล์
//
// ฟังก์ชันให้ผลลัพธ์เดียวกัน (คนเรียกไม่ต้องประกอบ id เอง) โดยที่ TypeScript
// ตรวจได้จริงว่า control รับ prop ครบ
export const Field: React.FC<FieldProps> = ({
    label,
    htmlFor,
    required = false,
    hint,
    warning,
    error,
    orientation = 'vertical',
    children,
}) => {
    const noteId = `${htmlFor}-note`;

    // แสดงทีละอย่าง ไม่ซ้อนกัน: ถ้า error กองต่อท้าย hint กล่องจะสูงขึ้นตอนเกิด
    // error แล้วปุ่มท้ายโมดัลขยับหนีนิ้วที่กำลังจะกดซ้ำ
    const note = error ?? warning ?? hint ?? null;
    const isError = error != null;
    const isWarning = !isError && warning != null;
    const isHorizontal = orientation === 'horizontal';

    // แนวนอนเป็น grid ที่ระบุตำแหน่งของทุกชิ้นเอง ไม่ใช่การสลับลำดับใน DOM --
    // ลำดับ ป้าย -> control -> หมายเหตุ เป็นลำดับที่ screen reader ต้องได้ยิน และมัน
    // ไม่ควรเปลี่ยนเพราะการจัดหน้าเปลี่ยน
    //
    // คอลัมน์ป้ายเป็น `auto` (หดตามความยาวป้าย) ส่วน control ได้ที่เหลือทั้งหมด --
    // เป็นเหตุผลที่หมายเหตุต้องลงไปกินเต็มแถวข้างล่าง ไม่ใช่ต่อท้ายป้ายในคอลัมน์ซ้าย
    // คำเตือนยาว ๆ จะดันคอลัมน์ป้ายให้กว้างจน control ไม่เหลือที่
    //
    // `minmax(0,1fr)` ไม่ใช่ `1fr` เปล่า: `1fr` คือ `minmax(auto,1fr)` และ min-width
    // อัตโนมัติของ form control ไม่ยอมหดต่ำกว่าความกว้างพื้นฐานของมัน คอลัมน์จึงล้น
    // แทนที่จะหดตามที่เหลือ
    //
    // ต่ำกว่า sm ทุกคลาสที่ย้ายตำแหน่งมี `sm:` นำหน้าหมด กริดจึงเหลือคอลัมน์เดียว
    // เรียงตามลำดับ DOM ซึ่งเท่ากับโหมด vertical พอดี
    const wrapperClass = isHorizontal
        ? 'grid gap-x-4 gap-y-1.5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center'
        : 'space-y-1.5';

    const control = children({
        id: htmlFor,
        // undefined ไม่ใช่สตริงว่าง -- React ตัด attribute ทิ้งเมื่อเป็น undefined
        // ส่วนสตริงว่างจะกลายเป็น aria-describedby="" ที่ชี้ไปยัง element ที่ไม่มีอยู่
        'aria-describedby': note ? noteId : undefined,
        'aria-invalid': isError ? true : undefined,
        'aria-required': required ? true : undefined,
        invalid: isError,
    });

    return (
        <div className={wrapperClass}>
            <label
                htmlFor={htmlFor}
                className={
                    'block text-sm font-medium text-slate-700 ' +
                    (isHorizontal ? 'sm:col-start-1 sm:row-start-1' : '')
                }
            >
                {label}
                {required && (
                    // aria-hidden เพราะ aria-required บน control พูดเรื่องเดียวกัน
                    // อยู่แล้ว ดอกจันนี้เป็นของสำหรับตาเท่านั้น
                    <span className="ml-0.5 text-red-500" aria-hidden="true">
                        *
                    </span>
                )}
            </label>

            {/* กล่องห่อ control มีเฉพาะโหมดแนวนอน -- grid วางตำแหน่งได้เฉพาะกับลูกที่
                เป็น element และ children เป็นฟังก์ชันที่คืนอะไรมาก็ได้ โหมดแนวตั้งจึง
                คืน control ตรง ๆ เหมือนเดิม ไม่มี div เกินโผล่ใน DOM ของ call site
                เดิมสักที่ */}
            {isHorizontal ? (
                <div className="min-w-0 sm:col-start-2 sm:row-start-1">{control}</div>
            ) : (
                control
            )}

            {note && (
                <p
                    id={noteId}
                    // ประกาศเฉพาะตอนเป็นความผิดพลาด: hint อยู่ตรงนั้นตั้งแต่แรกและ
                    // ถูกอ่านตอนโฟกัสเข้าช่องผ่าน aria-describedby อยู่แล้ว
                    // การทำให้มันเป็น alert ด้วยจะให้ screen reader อ่านซ้ำสองรอบ
                    role={isError ? 'alert' : undefined}
                    className={
                        `flex items-start gap-1.5 text-xs leading-relaxed ${
                            isError ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-slate-500'
                        } ` +
                        // col-end-3 ไม่ใช่ col-span-2 -- `col-span-*` เขียนลง
                        // grid-column ทั้งพร็อพเพอร์ตี้ แล้วทับ col-start-1 ที่อยู่
                        // ข้าง ๆ กัน สองคลาสที่คุมพร็อพเพอร์ตี้เดียวกันบน element
                        // เดียวตัดสินผู้ชนะที่ลำดับใน CSS ที่ build ออกมา
                        (isHorizontal ? 'sm:col-start-1 sm:col-end-3 sm:row-start-2' : '')
                    }
                >
                    {(isError || isWarning) && (
                        <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                    )}
                    <span>{note}</span>
                </p>
            )}
        </div>
    );
};
