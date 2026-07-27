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
        <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between bg-slate-50 shrink-0 gap-4 min-h-10">
            {totalItems !== undefined && itemsPerPage !== undefined && (
                // One sentence from the dictionary instead of English fragments
                // stitched around bold <span>s. Thai puts those numbers in a
                // different order, which that markup could not express; the
                // emphasis is the price, and it was only decoration.
                <p className="text-sm text-slate-500 order-2 sm:order-1">
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
                <div className="flex items-center gap-2 px-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 min-h-10">
                    <span className="text-slate-500 font-medium">{t.pagination.page}</span>
                    <select
                        value={currentPage}
                        onChange={(e) => onPageChange(Number(e.target.value))}
                        className="font-bold border-none bg-transparent outline-none cursor-pointer text-slate-900 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
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
