import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useT } from '../../../hooks/useT';

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
        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between bg-gray-50 shrink-0 gap-4">
            {totalItems !== undefined && itemsPerPage !== undefined && (
                // One sentence from the dictionary instead of English fragments
                // stitched around bold <span>s. Thai puts those numbers in a
                // different order, which that markup could not express; the
                // emphasis is the price, and it was only decoration.
                <p className="text-sm text-gray-500 order-2 sm:order-1">
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
                    className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition text-gray-600"
                    title={t.pagination.firstPage}
                >
                    <ChevronsLeft size={18} />
                </button>

                {/* Previous Page */}
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition text-gray-600"
                    title={t.pagination.prevPage}
                >
                    <ChevronLeft size={18} />
                </button>

                {/* Page Dropdown */}
                <div className="flex items-center gap-2 px-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 h-[38px]">
                    <span className="text-gray-500 font-medium">{t.pagination.page}</span>
                    <select
                        value={currentPage}
                        onChange={(e) => onPageChange(Number(e.target.value))}
                        className="font-bold border-none bg-transparent outline-none cursor-pointer text-gray-900 py-1"
                    >
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <option key={page} value={page}>
                                {page}
                            </option>
                        ))}
                    </select>
                    <span className="text-gray-500 font-medium">{t.pagination.ofTotal(totalPages)}</span>
                </div>

                {/* Next Page */}
                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition text-gray-600"
                    title={t.pagination.nextPage}
                >
                    <ChevronRight size={18} />
                </button>

                {/* Last Page */}
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition text-gray-600"
                    title={t.pagination.lastPage}
                >
                    <ChevronsRight size={18} />
                </button>
            </div>
        </div>
    );
};
