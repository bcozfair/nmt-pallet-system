import React from 'react';
import { X } from 'lucide-react';
import { CARD_SHELL } from './Card';

export interface FilterBarProps {
    children: React.ReactNode;
    /** เช่น "พบ 12 รายการ" แสดงเฉพาะตอน isFiltered */
    resultLabel?: string;
    onClear?: () => void;
    clearLabel?: string;
    isFiltered?: boolean;
}

// แถวจำนวนผลลัพธ์อยู่ *นอก* การ์ด ไม่ใช่ข้างใน: มันบรรยายผลของตัวกรอง
// ไม่ใช่ตัวกรองเอง และมันโผล่มา/หายไปตามสถานะ ถ้าอยู่ข้างในการ์ดจะเปลี่ยน
// ความสูงของการ์ดทุกครั้งที่พิมพ์ตัวแรกลงในช่องค้นหา
export const FilterBar: React.FC<FilterBarProps> = ({
    children,
    resultLabel,
    onClear,
    clearLabel,
    isFiltered = false,
}) => (
    <div className="flex flex-col gap-2">
        <div className={`${CARD_SHELL} p-3`}>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">{children}</div>
        </div>

        {isFiltered && (resultLabel || (onClear && clearLabel)) && (
            <div className="flex flex-wrap items-center gap-3 px-1">
                {resultLabel && <span className="text-sm text-slate-500">{resultLabel}</span>}
                {onClear && clearLabel && (
                    <button
                        type="button"
                        onClick={onClear}
                        className={
                            'inline-flex items-center gap-1 rounded-lg text-sm font-semibold ' +
                            'text-brand-700 transition hover:text-brand-800 focus-visible:outline-2 ' +
                            'focus-visible:outline-offset-2 focus-visible:outline-brand-500'
                        }
                    >
                        <X size={14} aria-hidden="true" />
                        {clearLabel}
                    </button>
                )}
            </div>
        )}
    </div>
);
