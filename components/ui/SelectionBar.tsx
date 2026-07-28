import React, { useEffect, useRef } from 'react';

// Escape ปิด "สิ่งที่อยู่ในสุด" ก่อนเสมอ -- แถบนี้อยู่นอกสุด จึงรับ Escape ได้
// ต่อเมื่อไม่มีเมนูหรือโมดัลเปิดอยู่ ตรวจด้วย DOM ไม่ใช่ stopPropagation เพราะ
// listener ทั้งสองตัวอยู่บน document โหนดเดียวกัน จึงยิงตามลำดับที่ผูก และตัวนี้
// ผูกก่อน (ตั้งแต่ count > 0) -- stopPropagation ของอีกฝั่งมาไม่ทันเสมอ
//
// อาการที่ปิดไป: ติ๊กเลือกพาเลท 40 ตัว -> เปิดเมนู "..." บนแถบ -> กด Escape เพื่อปิดเมนู
// -> เมนูปิดและการเลือกทั้ง 40 ตัวหายไปด้วย ไม่มี undo
//
// เลือกเป็น selector ของ role ไม่ใช่ prop `escapeEnabled` เพราะแถบนี้ไม่รู้จัก
// และไม่ควรต้องรู้จักว่ามีอะไรเปิดอยู่บ้างบนหน้าที่มันลอยอยู่ -- โมดัลที่เปิดผ่าน
// portal ไปที่ document.body ก็ไม่ได้อยู่ในต้นไม้ React ของผู้เรียกด้วยซ้ำ
const DISMISSIBLE = '[role="menu"], [role="dialog"], [role="listbox"], [aria-modal="true"]';

export interface SelectionBarProps {
    /** 0 = ไม่เรนเดอร์อะไรเลย และไม่ผูก listener ใด ๆ */
    count: number;
    countLabel: string;
    onClear: () => void;
    clearLabel: string;
    actions?: React.ReactNode;
    menu?: React.ReactNode;
    /** แผงเสริมเหนือแถบ เช่น รายการรหัสที่เลือกไว้ */
    detail?: React.ReactNode;
}

// สัญญาที่คอมโพเนนต์นี้ให้กับหน้าที่ใช้มัน: ขณะที่แถบแสดงอยู่ มันจะประกาศความสูงจริง
// ของกองลอยทั้งกอง (แถบ + `detail` + padding) ไว้ที่ `--selection-bar-h` บน <html>
// หน้าที่ใช้กันพื้นที่ท้ายหน้าด้วย inline style เช่น
//   style={{ paddingBottom: 'calc(var(--selection-bar-h, 0px) + 1rem)' }}
// -- inline style ไม่ใช่คลาส Tailwind ค่า arbitrary เพราะค่าเป็นของรันไทม์ และ
// Tailwind สแกนข้อความในซอร์สเท่านั้น ค่า fallback 0px ทำให้หน้าที่ยังไม่มีอะไรถูกเลือก
// (แถบยังไม่ mount จึงยังไม่มีตัวแปร) ไม่มีช่องว่างค้างอยู่

// แถบลอยติดขอบล่างจอ แทนที่แถบเดิมที่เข้าไปแทนที่หัวเพจทั้งแถบ:
// แบบเดิมพอเลื่อนลงไปติ๊กแถวล่าง ๆ ตัวแถบอยู่นอกจอ มองไม่เห็นว่าเลือกไปกี่ตัว
// และกดปุ่มไม่ได้จนกว่าจะเลื่อนกลับขึ้นไป -- ทั้งที่นั่นคือจังหวะที่ต้องใช้มันที่สุด
//
// lg:pl-[calc(16rem+1rem)] หลบ sidebar ซึ่งเป็น `fixed w-64` ไม่ใช่ส่วนหนึ่งของ
// การไหลของหน้า ถ้าไม่หลบ แถบจะโผล่อยู่ใต้ sidebar
//
// z-20 จงใจให้ต่ำ: overlay ของเมนูมือถืออยู่ z-30, sidebar z-40 และโมดัลทุกตัว
// z-50 ขึ้นไป แถบนี้ต้องอยู่ใต้ทุกอันนั้น
//
// print:hidden เพราะ element ที่เป็น fixed จะถูกพิมพ์ทับลงบนกระดาษทุกหน้า
// index.css จัดการ .sticky ไว้แล้วตอนพิมพ์ แต่ไม่ครอบ fixed
export const SelectionBar: React.FC<SelectionBarProps> = ({
    count,
    countLabel,
    onClear,
    clearLabel,
    actions,
    menu,
    detail,
}) => {
    const active = count > 0;
    const stackRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!active) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            // มีอะไรที่ "อยู่ในกว่า" เปิดอยู่ ปล่อยให้ตัวนั้นกิน Escape ไป
            if (document.querySelector(DISMISSIBLE)) return;
            event.preventDefault();
            onClear();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [active, onClear]);

    // แถบนี้ fixed อยู่เหนือเนื้อหา หน้าที่ใช้มันจึงต้องกันพื้นที่ใต้สุดไว้ให้ --
    // แต่ความสูงไม่ใช่ค่าคงที่: แผง `detail` (เช่น รายการรหัสที่เลือก) กางออกมาแล้ว
    // กองลอยสูงขึ้นเกินสองเท่า และสถานะที่คุมการกางอยู่เป็น state ภายในของผู้เรียก
    // ซึ่งหน้าเพจมองไม่เห็น การ hardcode `pb-24` ไว้ที่หน้าเพจจึงบังตัวแบ่งหน้ากับ
    // แถวท้าย ๆ ของตารางทันทีที่แผงกาง
    //
    // วัดความสูงจริงของตัวเองแล้วประกาศเป็น CSS custom property บน <html> แทน:
    // ผู้เรียกอ่านค่าไปใช้ผ่าน var() ได้โดยไม่ต้องรู้ว่าข้างในมีอะไร และ property
    // ถูกถอดออกเมื่อ unmount หรือเมื่อ count กลับเป็น 0 (ทั้งสองกรณีวิ่งผ่าน cleanup
    // ตัวเดียวกัน) จึงไม่มีช่องว่างค้างอยู่ท้ายหน้า
    useEffect(() => {
        const node = stackRef.current;
        if (!active || !node) return;

        const root = document.documentElement;
        const publish = () => {
            root.style.setProperty('--selection-bar-h', `${Math.ceil(node.getBoundingClientRect().height)}px`);
        };
        publish();

        // jsdom (และเบราว์เซอร์เก่ามาก) ไม่มี ResizeObserver -- ค่าที่ publish รอบแรก
        // ยังถูกต้องอยู่ ขาดแค่การอัปเดตตอนแผงกาง จึงไม่ควรทำให้ทั้งคอมโพเนนต์พัง
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(publish);
        observer?.observe(node);

        return () => {
            observer?.disconnect();
            root.style.removeProperty('--selection-bar-h');
        };
    }, [active]);

    if (!active) return null;

    return (
        <div
            ref={stackRef}
            className="fixed inset-x-0 bottom-0 z-20 px-4 pb-4 lg:pl-[calc(16rem+1rem)] print:hidden"
        >
            <div className="mx-auto flex max-w-5xl flex-col gap-2">
                {detail}
                <div
                    className={
                        'flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand-900 ' +
                        'px-3 py-2.5 shadow-[0_24px_60px_-24px_rgba(15,42,82,0.8)] animate-surface-in'
                    }
                >
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{countLabel}</span>
                        <button
                            type="button"
                            onClick={onClear}
                            className={
                                'rounded-lg px-2 py-1 text-sm font-medium text-white/70 transition ' +
                                'hover:bg-white/10 hover:text-white focus-visible:outline-2 ' +
                                'focus-visible:outline-offset-2 focus-visible:outline-white'
                            }
                        >
                            {clearLabel}
                        </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {actions}
                        {menu}
                    </div>
                </div>
            </div>
        </div>
    );
};
