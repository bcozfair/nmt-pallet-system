import React from 'react';
import {
    ArrowUpDown, ArrowUp, ArrowDown, MapPin, User, Search, Image as ImageIcon, Edit2, Trash2, FileText
} from 'lucide-react';
import { Transaction } from '../../../types';
import { formatDateTime } from '../common/AdminHelpers';
import { Pagination } from '../common/Pagination';

export type TxSortConfig = { key: keyof Transaction, direction: 'asc' | 'desc' } | null;

interface TransactionTableProps {
    paginatedTransactions: Transaction[];
    totalProcessedCount: number;
    sortConfig: TxSortConfig;
    onSort: (key: keyof Transaction) => void;
    currentPage: number;
    itemsPerPage: number;
    totalPages: number;
    setCurrentPage: (page: number | ((prev: number) => number)) => void;
    userMap: Record<string, string>;
    onClearFilters: () => void;
    onViewImage: (url: string) => void;
    // Actions
    onEdit: (tx: Transaction) => void;
    onDelete: (id: string) => void;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
    paginatedTransactions,
    totalProcessedCount,
    sortConfig,
    onSort,
    currentPage,
    itemsPerPage,
    totalPages,
    setCurrentPage,
    userMap,
    onClearFilters,
    onViewImage,
    onEdit,
    onDelete
}) => {

    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig?.key !== column) return <ArrowUpDown size={14} className="text-gray-300" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} className="text-blue-500" />
            : <ArrowDown size={14} className="text-blue-500" />;
    };

    const Th = ({ label, sortKey, align = 'left' }: { label: string, sortKey?: keyof Transaction, align?: string }) => (
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

    const getActionBadge = (action: string) => {
        switch (action) {
            case 'check_out':
                return <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold border border-yellow-200">CHECK OUT</span>;
            case 'check_in':
                return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200">CHECK IN</span>;
            case 'report_damage':
                return <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">DAMAGE REPORT</span>;
            case 'repair':
                return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-200">REPAIRED</span>;
            default:
                return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold border border-gray-200">{action}</span>;
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[600px] lg:h-[calc(100vh-240px)] overflow-hidden">
            <div className="flex-1 overflow-auto relative styled-scrollbar">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead className="bg-gray-50 text-gray-500 text-sm font-semibold tracking-wide uppercase sticky top-0 z-10 shadow-sm">
                        <tr>
                            <Th label="Date & Time" sortKey="timestamp" />
                            <Th label="Pallet ID" sortKey="pallet_id" />
                            <Th label="Action" sortKey="action_type" />
                            <Th label="Performed By" sortKey="user_id" />
                            <Th label="Location" sortKey="department_dest" />
                            <th className="p-3 border-b w-48">Remark</th>
                            <th className="p-3 border-b w-24 text-center">Evidence</th>
                            <th className="p-3 border-b text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {paginatedTransactions.map(tx => (
                            <tr key={tx.id} className="hover:bg-blue-50 transition group">
                                <td className="p-3 text-sm text-gray-600">
                                    {formatDateTime(tx.timestamp)}
                                </td>
                                <td className="p-3 font-bold text-gray-700">
                                    {tx.pallet_id}
                                </td>
                                <td className="p-3">
                                    {getActionBadge(tx.action_type)}
                                </td>
                                <td className="p-3 text-sm text-gray-700">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold">
                                            {userMap[tx.user_id]?.charAt(0) || <User size={12} />}
                                        </div>
                                        {userMap[tx.user_id] || <span className="font-mono text-gray-400 text-xs">{tx.user_id.substring(0, 8)}...</span>}
                                    </div>
                                </td>
                                <td className="p-3 text-gray-600">
                                    {tx.department_dest ? (
                                        <div className="flex items-center gap-2">
                                            <MapPin size={14} className="text-gray-400" />
                                            {tx.department_dest}
                                        </div>
                                    ) : (
                                        <span className="text-gray-300">-</span>
                                    )}
                                </td>
                                <td className="p-3 text-sm text-gray-500 max-w-[200px] truncate" title={tx.transaction_remark}>
                                    {tx.transaction_remark ? (
                                        <div className="flex items-center gap-1.5">
                                            <FileText size={14} className="text-gray-400 shrink-0" />
                                            <span className="truncate">{tx.transaction_remark}</span>
                                        </div>
                                    ) : '-'}
                                </td>
                                <td className="p-3 text-center">
                                    {tx.evidence_image_url && tx.evidence_image_url !== 'image_deleted' ? (
                                        <button
                                            onClick={() => onViewImage(tx.evidence_image_url!)}
                                            className="inline-flex items-center justify-center p-2 bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-600 rounded-lg transition"
                                            title="View Evidence Image"
                                        >
                                            <ImageIcon size={16} />
                                        </button>
                                    ) : (
                                        <span className="text-gray-300 text-xs">-</span>
                                    )}
                                </td>
                                <td className="p-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <button
                                            onClick={() => onEdit(tx)}
                                            className="p-2 text-blue-400 hover:bg-blue-100 hover:text-blue-600 rounded-full transition"
                                            title="Edit Transaction"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => onDelete(tx.id)}
                                            className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-full transition"
                                            title="Delete Record"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {totalProcessedCount > 0 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={totalProcessedCount}
                    itemsPerPage={itemsPerPage}
                />
            )}

            {totalProcessedCount === 0 && (
                <div className="p-12 text-center flex flex-col items-center text-gray-400 gap-2 flex-1 justify-center">
                    <Search size={48} className="opacity-20" />
                    <p>No transactions found matching your filters.</p>
                    <button onClick={onClearFilters} className="text-blue-600 font-bold hover:underline">Clear Filters</button>
                </div>
            )}
        </div>
    );
};
