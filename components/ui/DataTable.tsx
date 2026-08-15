import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { CARD_SHELL } from './Card';
import { SkeletonRows } from './Skeleton';

export interface SortState<K extends string> {
    key: K;
    direction: 'asc' | 'desc';
}

export interface SortableThProps<K extends string> {
    label: string;
    /** ไม่ส่ง = คอลัมน์ที่เรียงไม่ได้ จะไม่เป็นปุ่มและไม่ขึ้นมือชี้ */
    sortKey?: K;
    sortConfig: SortState<K> | null;
    onSort?: (key: K) => void;
    align?: 'left' | 'right' | 'center';
    /** สำหรับซ่อนตามความกว้าง เช่น 'hidden xl:table-cell' */
    className?: string;
}

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;
const JUSTIFY = { left: 'justify-start', right: 'justify-end', center: 'justify-center' } as const;

// font-bold (700) ใช้ที่นี่ที่เดียวในระบบ: มันเป็นน้ำหนักหนักสุดที่ Google Fonts
// ส่งมาจริงสำหรับทั้ง Inter และ Noto Sans Thai อะไรที่หนักกว่านี้ถูกสังเคราะห์
//
// ไม่มี uppercase และไม่มี tracking ค่าบวก ทั้งคู่เป็น regression ที่เห็นเฉพาะ
// ภาษาเดียว -- uppercase ไม่มีผลกับไทย ส่วน tracking บวกดันวรรณยุกต์ออกจากตัวอักษร
// เส้นใต้หัวตารางใช้ `line-band` ไม่ใช่ `line-overlay`: เส้นนี้วางอยู่บนพื้น
// `surface-band` ไม่ใช่บนขาว `line-overlay` บนแถบนั้นเหลือ 1.11:1 คือหายไปทั้ง
// เส้น หัวตารางเป็นแถวที่ต้องอ่านออกว่าไม่ใช่ข้อมูล และเมื่อมันเลื่อนตามจอ
// (sticky) มันคือแถบที่ลอยทับแถวข้อมูลจริง ๆ เส้นจึงต้องเข้มกว่าเส้นคั่นระหว่างแถว
const TH_BASE = 'border-b border-line-band px-3 py-2.5 text-xs font-bold text-slate-600';

export function SortableTh<K extends string>({
    label,
    sortKey,
    sortConfig,
    onSort,
    align = 'left',
    className = '',
}: SortableThProps<K>) {
    const isSorted = sortKey !== undefined && sortConfig?.key === sortKey;
    const cellClass = `${TH_BASE} ${ALIGN[align]} ${className}`;

    // คอลัมน์ที่เรียงไม่ได้ออกมาเป็น <th> เปล่า ของเดิมทั้ง 4 ตารางใส่ cursor-pointer
    // ไว้กับหัวคอลัมน์ทุกอันรวมถึง "จัดการ" ซึ่งกดแล้วไม่มีอะไรเกิดขึ้น
    if (sortKey === undefined || !onSort) {
        return (
            <th scope="col" className={cellClass}>
                {label}
            </th>
        );
    }

    const Icon = isSorted ? (sortConfig!.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

    return (
        <th
            scope="col"
            // aria-sort อยู่บน <th> ไม่ใช่บนปุ่ม -- มันบรรยายคอลัมน์ ไม่ใช่ตัวควบคุม
            aria-sort={
                isSorted ? (sortConfig!.direction === 'asc' ? 'ascending' : 'descending') : undefined
            }
            className={cellClass}
        >
            {/* <button> จริง ของเดิมผูก onClick ไว้กับ <th> เอง ทำให้เรียงลำดับได้
                ด้วยเมาส์อย่างเดียว คีย์บอร์ดไปไม่ถึง */}
            <button
                type="button"
                onClick={() => onSort(sortKey)}
                className={
                    `flex w-full items-center gap-1.5 ${JUSTIFY[align]} rounded-md transition ` +
                    'hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 ' +
                    'focus-visible:outline-brand-500'
                }
            >
                {label}
                <Icon
                    size={14}
                    className={isSorted ? 'text-brand-600' : 'text-slate-300'}
                    aria-hidden="true"
                />
            </button>
        </th>
    );
}

export interface DataTableProps {
    head: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    caption?: string;
    isLoading?: boolean;
    isEmpty?: boolean;
    empty?: React.ReactNode;
    loadingRows?: number;
    loadingCols?: number;
    loadingLabel?: string;
    /** px ใช้ต่ำกว่า xl ที่ตารางเลื่อนซ้ายขวา */
    minWidth?: number;
}

// `overflow-clip` ไม่ใช่ `overflow-hidden` และนี่คือหัวใจของไฟล์นี้:
// `overflow: hidden` สร้าง scroll container ขึ้นมา ทำให้ `position: sticky` ข้างใน
// ไปเกาะกับกล่องนั้นแทนที่จะเกาะ viewport -- และกล่องนั้นไม่มีความสูงจำกัด
// หัวตารางจึงไม่มีวันเกาะได้เลย ส่วน `overflow: clip` ตัดขอบมนให้เหมือนกันทุกอย่าง
// แต่ไม่สร้าง scroll container
//
// ชั้นในเป็น `overflow-x-auto xl:overflow-visible` ด้วยเหตุผลเดียวกัน: ต่ำกว่า xl
// เราต้องการเลื่อนซ้ายขวาจริง ๆ จึงยอมเสียหัวเกาะไป ที่ xl ขึ้นไปไม่มี scroll
// container เหลืออยู่เลย หัวตารางจึงเกาะ viewport ได้
//
// เลือก xl (1280px) ไม่ใช่ lg เพราะที่ 1024px คอลัมน์เนื้อหาเหลือราว 640px
// (sidebar 256 + padding 64) ซึ่งไม่พอให้ตาราง 8 คอลัมน์กางโดยไม่ล้น และ xl
// ยังอยู่เหนือจุดที่ header ของแอปเลิกเกาะพอดี จึงใช้ top-0 ได้ตรง ๆ
export const DataTable: React.FC<DataTableProps> = ({
    head,
    children,
    footer,
    caption,
    isLoading = false,
    isEmpty = false,
    empty,
    loadingRows = 8,
    loadingCols = 5,
    loadingLabel,
    minWidth,
}) => {
    // ลำดับสำคัญ: กำลังโหลดมาก่อนว่างเปล่าเสมอ ชุดข้อมูลที่ยังมาไม่ถึงไม่ใช่
    // ชุดข้อมูลที่ว่าง -- นี่คือบั๊กที่หน้าคลังพาเลทขึ้นว่า "ไม่พบพาเลท"
    // ระหว่างที่การดึงข้อมูลครั้งแรกยังไม่เสร็จ
    if (isLoading) {
        return (
            <div className={`${CARD_SHELL} overflow-clip p-4`}>
                <SkeletonRows rows={loadingRows} cols={loadingCols} ariaLabel={loadingLabel} />
            </div>
        );
    }

    if (isEmpty) {
        return <div className={`${CARD_SHELL} overflow-clip p-4`}>{empty}</div>;
    }

    return (
        <div className={`${CARD_SHELL} overflow-clip`}>
            <div className="overflow-x-auto styled-scrollbar xl:overflow-visible">
                <table
                    className="w-full border-collapse text-left"
                    // ค่าจาก runtime ต้องผ่าน style เสมอ คลาสที่ประกอบตอนรันไทม์
                    // คอมไพล์ออกมาเป็นศูนย์เงียบ ๆ
                    style={minWidth ? { minWidth } : undefined}
                >
                    {caption && <caption className="sr-only">{caption}</caption>}
                    {/* เกาะใต้กองหัวเพจที่ StickyHeader ตรึงไว้ ไม่ใช่ที่ยอดจอ --
                        ค่าความสูงจริงของกองนั้นถูกวัดตอนรันไทม์แล้วประกาศไว้ที่
                        <html> หน้าที่ไม่ได้ใช้ StickyHeader ก็ไม่มีตัวแปรนี้ จึงตกไป
                        ใช้ 0px ซึ่งเท่ากับ top-0 เดิมพอดี */}
                    {/* `bg-surface-band` ไม่ใช่ `bg-canvas` และไม่ใช่ `bg-slate-50`
                        เดิมเป็น `#f8fafc` ซึ่งห่างจากแถวข้อมูลสีขาวแค่ 1.05:1 แล้วย้าย
                        มาเป็นพื้นหน้าจอ (1.12:1) ซึ่งดีขึ้นแต่ยังไม่พอ -- และมันสร้าง
                        ปัญหาอีกอย่าง คือหัวตารางกลายเป็น "พื้นหน้าจอที่โผล่เข้ามาข้างใน
                        การ์ด" ทั้งที่มันอยู่ในกรอบการ์ด

                        `surface-band` ตรงกับสีเส้นขอบการ์ด หัวตารางจึงอ่านเป็นส่วนหนึ่ง
                        ของกรอบการ์ด ไม่ใช่พื้นหน้าจอที่เล็ดลอดเข้ามา และห่างจากแถวข้อมูล
                        1.29:1 -- ดูโทเคนใน index.css

                        `text-slate-600` ไม่ใช่ `slate-500`: เป็นค่าสำรองสำหรับ <th> ที่
                        ไม่ได้ผ่าน TH_BASE ต้องเป็นค่าเดียวกัน ไม่งั้นหัวตารางแถวเดียวกัน
                        จะมีตัวหนังสือสองเฉด และ `slate-500` บนแถบนี้เหลือ 3.68:1 ซึ่งตก
                        เกณฑ์ข้อความ 4.5:1 */}
                    <thead className="bg-surface-band text-slate-600 xl:sticky xl:top-[var(--sticky-head-h,0px)] xl:z-10">
                        {head}
                    </thead>
                    {children}
                </table>
            </div>
            {footer}
        </div>
    );
};
