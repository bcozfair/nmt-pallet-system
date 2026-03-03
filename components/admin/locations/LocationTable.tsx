import React from 'react';
import { Department } from '../../../types';
import { Edit2, Trash2, Power, MapPin, Search, Box, AlertTriangle, AlertOctagon, Save, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Pagination } from '../common/Pagination';
import { formatDateTime } from '../common/AdminHelpers';

export interface LocationStats {
    totalPallets: number;
    overduePallets: number;
    damagedPallets: number;
    lastActivity: string | null;
}

export type LocationSortKey = keyof Department | keyof LocationStats;
export type LocationSortConfig = { key: LocationSortKey; direction: 'asc' | 'desc' } | null;

interface LocationTableProps {
    paginatedDepartments: Department[];
    departmentStats: Record<string, LocationStats>;
    totalProcessedCount: number;
    currentPage: number;
    itemsPerPage: number;
    totalPages: number;
    setCurrentPage: (page: number) => void;

    // Inline Edit Props
    editingId: string | null;
    editForm: { name: string };
    setEditForm: (form: { name: string }) => void;
    onStartEdit: (dept: Department) => void;
    onSave: (id: string) => void;
    onCancelEdit: () => void;

    // Actions
    onToggleStatus: (dept: Department) => void;
    onDelete: (id: string) => void;
    // Empty state
    onClearFilters: () => void;

    // Sort
    sortConfig: LocationSortConfig;
    onSort: (key: LocationSortKey) => void;
}

export const LocationTable: React.FC<LocationTableProps> = ({
    paginatedDepartments,
    departmentStats,
    totalProcessedCount,
    currentPage,
    itemsPerPage,
    totalPages,
    setCurrentPage,

    editingId,
    editForm,
    setEditForm,
    onStartEdit,
    onSave,
    onCancelEdit,

    onToggleStatus,
    onDelete,
    onClearFilters,
    sortConfig,
    onSort
}) => {

    const SortIcon = ({ column }: { column: LocationSortKey }) => {
        if (sortConfig?.key !== column) return <ArrowUpDown size={14} className="text-gray-300" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} className="text-blue-500" />
            : <ArrowDown size={14} className="text-blue-500" />;
    };

    const Th = ({ label, sortKey, width, align = 'left', centered = false }: { label: string, sortKey?: LocationSortKey, width?: string, align?: string, centered?: boolean }) => (
        <th
            className={`p-3 border-b cursor-pointer hover:bg-gray-100 transition select-none text-${align} ${width || ''}`}
            onClick={() => sortKey && onSort(sortKey)}
        >
            <div className={`flex items-center gap-2 ${centered ? 'justify-center' : (align === 'right' ? 'justify-end' : '')}`}>
                {label}
                {sortKey && <SortIcon column={sortKey} />}
            </div>
        </th>
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[600px] lg:h-[calc(100vh-280px)] overflow-hidden animate-in fade-in duration-500">
            <div className="flex-1 overflow-auto relative styled-scrollbar">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead className="bg-gray-50 text-gray-500 text-sm font-semibold tracking-wide uppercase sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="p-3 border-b w-16 text-center">#</th>
                            <Th label="Location Name" sortKey="name" />
                            <Th label="Total" sortKey="totalPallets" width="w-28" centered />
                            <Th label="Overdue" sortKey="overduePallets" width="w-28" centered />
                            <Th label="Damaged" sortKey="damagedPallets" width="w-28" centered />
                            <Th label="Last Updated" sortKey="lastActivity" width="w-40" />
                            <Th label="Status" sortKey="is_active" width="w-32" centered />
                            <th className="p-3 border-b text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {paginatedDepartments.map((dept, index) => {
                            const stats = departmentStats[dept.name] || { totalPallets: 0, overduePallets: 0, damagedPallets: 0, lastActivity: null };

                            return (
                                <tr key={dept.id} className="hover:bg-blue-50 transition group">
                                    <td className="p-3 text-center text-gray-400 text-sm">
                                        {(currentPage - 1) * itemsPerPage + index + 1}
                                    </td>

                                    {/* Name */}
                                    {/* Name */}
                                    <td className="p-3 font-medium text-gray-800">
                                        {editingId === dept.id ? (
                                            <input
                                                className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                                                value={editForm.name}
                                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                autoFocus
                                            />
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${dept.is_active ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                                                    <MapPin size={16} />
                                                </div>
                                                <div>
                                                    <div className="font-bold">{dept.name}</div>
                                                </div>
                                            </div>
                                        )}
                                    </td>

                                    {/* Total Pallets */}
                                    <td className="p-3 text-center">
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-sm ${stats.totalPallets > 0 ? 'bg-blue-50 text-blue-700' : 'text-gray-400'}`}>
                                            <Box size={14} />
                                            {stats.totalPallets}
                                        </div>
                                    </td>

                                    {/* Overdue */}
                                    <td className="p-3 text-center">
                                        {stats.overduePallets > 0 ? (
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 font-bold text-sm animate-pulse-slow">
                                                <AlertTriangle size={14} />
                                                {stats.overduePallets}
                                            </div>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>

                                    {/* Damaged */}
                                    <td className="p-3 text-center">
                                        {stats.damagedPallets > 0 ? (
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-600 font-bold text-sm">
                                                <AlertOctagon size={14} />
                                                {stats.damagedPallets}
                                            </div>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>

                                    {/* Last Activity */}
                                    <td className="p-3 text-sm text-gray-600">
                                        {formatDateTime(stats.lastActivity)}
                                    </td>

                                    {/* Status */}
                                    <td className="p-3 text-center">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${dept.is_active
                                            ? 'bg-green-50 text-green-700 border-green-200'
                                            : 'bg-gray-100 text-gray-500 border-gray-200'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${dept.is_active ? 'bg-green-600' : 'bg-gray-400'}`} />
                                            {dept.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>

                                    {/* Actions */}
                                    <td className="p-3 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                            {editingId === dept.id ? (
                                                <>
                                                    <button
                                                        onClick={() => onSave(dept.id)}
                                                        className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-full transition"
                                                        title="Save Changes"
                                                    >
                                                        <Save size={18} />
                                                    </button>
                                                    <button
                                                        onClick={onCancelEdit}
                                                        className="p-2 bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-full transition"
                                                        title="Cancel Edit"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => onToggleStatus(dept)}
                                                        className={`p-2 rounded-full transition ${dept.is_active
                                                            ? 'text-green-600 hover:bg-green-100'
                                                            : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                                                            }`}
                                                        title={dept.is_active ? "Deactivate" : "Activate"}
                                                    >
                                                        <Power size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => onStartEdit(dept)}
                                                        className="p-2 text-blue-400 hover:bg-blue-100 hover:text-blue-600 rounded-full transition"
                                                        title="Edit Name"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => onDelete(dept.id)}
                                                        className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-full transition"
                                                        title="Delete Location"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
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
                <div className="p-12 text-center flex flex-col items-center text-gray-400 gap-3 flex-1 justify-center">
                    <Search size={48} className="opacity-20" />
                    <p className="text-gray-500 font-medium">No locations found matching your criteria.</p>
                    <button onClick={onClearFilters} className="text-blue-600 font-bold hover:underline">Clear Filters</button>
                </div>
            )}
        </div>
    );
};
