import React, { useEffect } from 'react';

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

    useEffect(() => {
        if (!active) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClear();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [active, onClear]);

    if (!active) return null;

    return (
        <div className="fixed inset-x-0 bottom-0 z-20 px-4 pb-4 lg:pl-[calc(16rem+1rem)] print:hidden">
            <div className="mx-auto flex max-w-4xl flex-col gap-2">
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
