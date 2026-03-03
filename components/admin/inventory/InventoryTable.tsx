import React from 'react';
import {
    ArrowUpDown, ArrowUp, ArrowDown, CircleCheckBig, QrCode, Trash2,
    MapPin, AlertCircle, Clock, Search, Edit2, FileText
} from 'lucide-react';
import { Pallet } from '../../../types';
import { formatDateTime, StatusBadge } from '../common/AdminHelpers';
import { Pagination } from '../common/Pagination';

export type SortConfig = { key: keyof Pallet | 'days_overdue', direction: 'asc' | 'desc' } | null;

interface InventoryTableProps {
    paginatedPallets: Pallet[];
    // We need the full list count or "select all" state logic passed down
    totalProcessedCount: number;
    selectedIds: Set<string>;
    onSelectAll: () => void;
    onSelectRow: (id: string) => void;

    // Sort
    sortConfig: SortConfig;
    onSort: (key: keyof Pallet | 'days_overdue') => void;

    // Actions
    onSelectPallet: (id: string) => void;
    onRepairRow: (id: string) => void;
    onPrintQr: (pallets: Pallet[]) => void; // Expects an array, even if size 1
    onDeleteClick: (id: string, e: React.MouseEvent) => void;
    onEditRow?: (pallet: Pallet) => void; // Optional for now to avoid breaking parent immediately, but will implement

    // Config
    overdueThreshold: number;

    // Pagination
    currentPage: number;
    itemsPerPage: number;
    totalPages: number;
    setCurrentPage: (page: number | ((prev: number) => number)) => void;

    // Clear filters callback for "No results" empty state
    onClearFilters: () => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
    paginatedPallets,
    totalProcessedCount,
    selectedIds,
    onSelectAll,
    onSelectRow,
    sortConfig,
    onSort,
    onSelectPallet,
    onRepairRow,
    onPrintQr,
    onDeleteClick,
    overdueThreshold,
    currentPage,
    itemsPerPage,
    totalPages,
    setCurrentPage,
    onClearFilters,
    onEditRow
}) => {

    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig?.key !== column) return <ArrowUpDown size={14} className="text-gray-300" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} className="text-blue-500" />
            : <ArrowDown size={14} className="text-blue-500" />;
    };

    const Th = ({ label, sortKey, align = 'left' }: { label: string, sortKey?: keyof Pallet | 'days_overdue', align?: string }) => (
        <th
            className={`p-3 border-b cursor-pointer hover:bg-gray-100 transition select-none text-${align}`}
            onClick={() => sortKey && onSort(sortKey)}
        >
            <div className={`flex items-center gap-2 ${align === 'right' ? 'justify-end' : ''}`}>
                {label}
                {sortKey && <SortIcon column={sortKey} />}
            </div>
        </th>
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[600px] lg:h-[calc(100vh-240px)] overflow-hidden">
            <div className="flex-1 overflow-auto relative styled-scrollbar">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-gray-50 text-gray-500 text-sm font-semibold tracking-wide uppercase sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="p-2 border-b w-5 text-center bg-gray-100/50">
                                <input
                                    id="select-all-pallets"
                                    aria-label="Select all pallets"
                                    type="checkbox"
                                    onChange={onSelectAll}
                                    checked={selectedIds.size === totalProcessedCount && totalProcessedCount > 0}
                                    className="appearance-none w-4 h-4 rounded-full border-2 border-gray-300 bg-white checked:bg-blue-600 checked:border-blue-600 cursor-pointer transition-all relative checked:after:content-[''] checked:after:absolute checked:after:left-1/2 checked:after:top-1/2 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2 checked:after:w-3 checked:after:h-3 checked:after:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwb2x5bGluZSBwb2ludHM9IjIwIDYgOSAxNyA0IDEyIiAvPjwvc3ZnPg==')] checked:after:bg-center checked:after:bg-no-repeat checked:after:bg-contain"
                                />
                            </th>
                            <Th label="ID" sortKey="pallet_id" />
                            <Th label="Status" sortKey="status" />
                            <Th label="Last Updated" sortKey="last_transaction_date" />
                            <Th label="Location" sortKey="current_location" />
                            <Th label="Last Checkout" sortKey="last_checkout_date" />
                            <Th label="Overdue" sortKey="days_overdue" />
                            <Th label="Remark" sortKey="pallet_remark" />
                            <Th label="Actions" align="right" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {paginatedPallets.map(p => {
                            let isOverdue = false;
                            let days = 0;
                            if (p.status === 'in_use' && p.last_checkout_date) {
                                days = Math.floor((new Date().getTime() - new Date(p.last_checkout_date).getTime()) / (1000 * 3600 * 24));
                                isOverdue = days > overdueThreshold;
                            }

                            return (
                                <tr
                                    key={p.pallet_id}
                                    onClick={() => onSelectPallet(p.pallet_id)}
                                    className={`hover:bg-blue-50 cursor-pointer transition group ${isOverdue ? 'bg-yellow-200/30' : ''} ${selectedIds.has(p.pallet_id) ? 'bg-blue-50/80' : ''}`}
                                >
                                    <td className="p-2 w-5 text-center bg-gray-50/50" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(p.pallet_id)}
                                            onChange={() => onSelectRow(p.pallet_id)}
                                            className="appearance-none w-4 h-4 rounded-full border-2 border-gray-300 bg-white checked:bg-blue-600 checked:border-blue-600 cursor-pointer transition-all relative checked:after:content-[''] checked:after:absolute checked:after:left-1/2 checked:after:top-1/2 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2 checked:after:w-3 checked:after:h-3 checked:after:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiPjxwb2x5bGluZSBwb2ludHM9IjIwIDYgOSAxNyA0IDEyIiAvPjwvc3ZnPg==')] checked:after:bg-center checked:after:bg-no-repeat checked:after:bg-contain"
                                        />
                                    </td>
                                    <td className="p-3 font-mono font-bold text-gray-700">{p.pallet_id}</td>

                                    <td className="p-3">
                                        <StatusBadge status={p.status} />
                                    </td>
                                    <td className="p-3 w-40 text-sm text-gray-600">
                                        {p.last_transaction_date ? formatDateTime(p.last_transaction_date) : '-'}
                                    </td>
                                    <td className="p-3 text-gray-600 flex items-center gap-2">
                                        <MapPin size={14} className="text-gray-400" />
                                        {p.current_location}
                                    </td>

                                    <td className="p-3 text-sm text-gray-500">
                                        {formatDateTime(p.last_checkout_date)}
                                    </td>
                                    <td className="p-3 w-40">
                                        {/* Overdue logic */}
                                        {p.status === 'in_use' && p.last_checkout_date ? (
                                            <div className={`flex items-center gap-1 font-bold ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                                                <Clock size={14} />
                                                {days} Days
                                                {isOverdue && <AlertCircle size={14} className="ml-1 fill-red-600 text-white" />}
                                            </div>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-sm text-gray-500 max-w-[200px] truncate" title={p.pallet_remark || ''}>
                                        {p.pallet_remark ? (
                                            <div className="flex items-center gap-1.5">
                                                <FileText size={14} className="text-gray-400 shrink-0" />
                                                <span className="truncate">{p.pallet_remark}</span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="flex justify-end gap-1">
                                            {p.status === 'damaged' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onRepairRow(p.pallet_id); }}
                                                    className="p-2 text-green-600 hover:bg-green-100 rounded-full transition"
                                                    title="Mark as Repaired"
                                                >
                                                    <CircleCheckBig size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onPrintQr([p]); }}
                                                className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full transition"
                                                title="Print QR Code"
                                            >
                                                <QrCode size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onEditRow(p); }}
                                                className="p-2 text-blue-400 hover:bg-blue-100 hover:text-blue-600 rounded-full transition"
                                                title="Edit Transaction"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDeleteClick(p.pallet_id, e); }}
                                                className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-full transition"
                                                title="Delete Pallet"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>



            {
                totalProcessedCount > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={totalProcessedCount}
                        itemsPerPage={itemsPerPage}
                    />
                )
            }

            {
                totalProcessedCount === 0 && (
                    <div className="p-12 text-center flex flex-col items-center text-gray-400 gap-2 flex-1 justify-center">
                        <Search size={48} className="opacity-20" />
                        <p>No pallets found matching your filters.</p>
                        <button onClick={onClearFilters} className="text-blue-600 font-bold hover:underline">Clear Filters</button>
                    </div>
                )
            }
        </div >
    );
};
