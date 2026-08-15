import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useT } from '../../../hooks/useT';
import { BUTTON_BASE, BUTTON_SIZE, BUTTON_VARIANT } from '../../ui';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems?: number;
    itemsPerPage?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    onPageChange,
    totalItems,
    itemsPerPage
}) => {
    const t = useT();

    if (totalPages <= 0) return null;

    return (
        // print:hidden — page buttons are dead on paper, and the "showing 1-20
        // of 137" line would contradict the sheet, which carries every filtered
        // row (see InventoryTable's off-page rows). A control that lies about
        // what the reader is holding is worse than one that is merely useless.
        // พื้นและเส้นชุดเดียวกับหัวตาราง (surface-band / line-band) หัวกับท้ายเป็น
        // กรอบคู่ของข้อมูลชุดเดียวกัน ถ้าคนละเฉดการ์ดจะอ่านเป็นสามชั้น
        //
        // ค่าเดิมเป็น `bg-slate-50` + `border-slate-200` ซึ่งเป็นพาเลทก่อนรีดีไซน์
        // ทั้งคู่ -- แถบท้ายจึงสว่างกว่าพื้นหน้าจอที่การ์ดวางอยู่บน และปุ่มขาว
        // ข้างในห่างจากพื้นแค่ 1.05:1 คือแทบมองไม่เห็นว่ามีปุ่มอยู่ บนแถบใหม่
        // ปุ่มตระกูลพื้นขาวได้ 1.29:1 โดยไม่ต้องแตะตัวปุ่มเลย
        //
        // ความสูงของแถบ = py + ตัวที่สูงที่สุดข้างใน ไม่ใช่ค่าที่ตั้งไว้ตรง ๆ
        // เดิมเป็น `p-4` + กล่องเลือกหน้า `min-h-10` = 73px ทั้งที่ข้างในมีแค่
        // ปุ่มไอคอนกับข้อความบรรทัดเดียว ตอนนี้ `py-2.5` + ทุกอย่างสูง 32px = 53px
        //
        // `min-h-10` เดิมที่กล่องนี้ถูกถอดออก ไม่ใช่ลืม: มันเป็นพื้นความสูง 40px
        // ซึ่งต่ำกว่าความสูงจริงของเนื้อหาทุกกรณีอยู่แล้ว (ต่อให้ไม่มีข้อความ
        // ก็ยังเหลือแถวปุ่ม 32px + py 20px) มันจึงไม่เคยมีผลกับอะไรเลย
        <div className="px-4 py-2.5 border-t border-line-band flex flex-col sm:flex-row items-center justify-between bg-surface-band shrink-0 gap-3 print:hidden">
            {totalItems !== undefined && itemsPerPage !== undefined && (
                // One sentence from the dictionary instead of English fragments
                // stitched around bold <span>s. Thai puts those numbers in a
                // different order, which that markup could not express; the
                // emphasis is the price, and it was only decoration.
                //
                // `slate-600` ไม่ใช่ `slate-500`: บรรทัดนี้ย้ายจากพื้น `#f8fafc`
                // (4.76:1 ผ่านมาแบบเฉียดฉิว) มาอยู่บนแถบที่เข้มขึ้น ซึ่ง `slate-500`
                // เหลือ 3.68:1 -- ตกเกณฑ์ข้อความ 4.5:1 ค่าใหม่ได้ 5.86:1
                <p className="text-sm text-slate-600 order-2 sm:order-1">
                    {t.pagination.showing(
                        ((currentPage - 1) * itemsPerPage) + 1,
                        Math.min(currentPage * itemsPerPage, totalItems),
                        totalItems
                    )}
                </p>
            )}

            <div className="flex items-center gap-2 order-1 sm:order-2">
                {/* First Page */}
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    className={`${BUTTON_BASE} ${BUTTON_SIZE.sm} ${BUTTON_VARIANT.secondary}`}
                    title={t.pagination.firstPage}
                    aria-label={t.pagination.firstPage}
                >
                    <ChevronsLeft size={18} />
                </button>

                {/* Previous Page */}
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className={`${BUTTON_BASE} ${BUTTON_SIZE.sm} ${BUTTON_VARIANT.secondary}`}
                    title={t.pagination.prevPage}
                    aria-label={t.pagination.prevPage}
                >
                    <ChevronLeft size={18} />
                </button>

                {/* Page Dropdown */}
                {/* border-line-control: กล่องนี้ห่อ <select> อยู่ เส้นขอบจึงเป็น
                    ขอบเขตของตัวควบคุม ไม่ใช่เส้นตกแต่ง

                    `min-h-8` ไม่ใช่ `min-h-10`: ต้องเท่ากับ BUTTON_SIZE.sm ของปุ่ม
                    สี่ใบที่นั่งเรียงกันอยู่ในแถวเดียวกันนี้ ของเดิมสูงกว่าปุ่ม 8px
                    กล่องนี้จึงเป็นตัวที่กำหนดความสูงของทั้งแถบอยู่คนเดียว และมองเห็น
                    เป็นกล่องที่โผล่สูงกว่าเพื่อนในภาพ

                    ถ้าวันหลังเปลี่ยนปุ่มพวกนั้นเป็น `md` ต้องกลับมาเปลี่ยนตรงนี้ด้วย */}
                <div className="flex items-center gap-2 px-2 bg-white border border-line-control rounded-xl text-sm text-slate-700 min-h-8">
                    <span className="text-slate-500 font-medium">{t.pagination.page}</span>
                    <select
                        value={currentPage}
                        onChange={(e) => onPageChange(Number(e.target.value))}
                        className="font-bold border-none bg-transparent outline-none cursor-pointer text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                    >
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <option key={page} value={page}>
                                {page}
                            </option>
                        ))}
                    </select>
                    <span className="text-slate-500 font-medium">{t.pagination.ofTotal(totalPages)}</span>
                </div>

                {/* Next Page */}
                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className={`${BUTTON_BASE} ${BUTTON_SIZE.sm} ${BUTTON_VARIANT.secondary}`}
                    title={t.pagination.nextPage}
                    aria-label={t.pagination.nextPage}
                >
                    <ChevronRight size={18} />
                </button>

                {/* Last Page */}
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className={`${BUTTON_BASE} ${BUTTON_SIZE.sm} ${BUTTON_VARIANT.secondary}`}
                    title={t.pagination.lastPage}
                    aria-label={t.pagination.lastPage}
                >
                    <ChevronsRight size={18} />
                </button>
            </div>
        </div>
    );
};
