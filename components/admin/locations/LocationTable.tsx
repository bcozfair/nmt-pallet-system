import React from 'react';
import { Department } from '../../../types';
import { Edit2, Trash2, Power, MapPin, MapPinned, Box, AlertTriangle, AlertOctagon, Save, X } from 'lucide-react';
import { Pagination } from '../common/Pagination';
import { formatDateTime } from '../common/AdminHelpers';
import { useT } from '../../../hooks/useT';
import { Button, DataTable, EmptyState, SortableTh, TextInput } from '../../ui';

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

    // Before this existed the first render showed "No locations found" while
    // the very first fetch was still in flight. See LocationView.tsx.
    isLoading: boolean;
}

// ชิปตัวเลขสามตัวกลางตาราง สีสื่อความหมายจึงเก็บไว้ (แบรนด์ = ปกติ, แดง = เกินกำหนด,
// ส้ม = ชำรุด) เปลี่ยนแค่ blue -> brand เพราะน้ำเงินของระบบใหม่คือสีแบรนด์
//
// `animate-pulse-slow` ที่เคยอยู่บนชิปเกินกำหนดถูกเอาออก: ตัวเลขที่กะพริบตลอดเวลาที่
// หน้าเปิดอยู่เป็นเสียงรบกวน ไม่ใช่การแจ้งเตือน -- สีแดงกับไอคอนสามเหลี่ยมบอกเรื่อง
// เดียวกันโดยไม่ต้องขยับ และการเคลื่อนไหวที่ไม่มีวันหยุดเป็นสิ่งที่ผู้ใช้ที่ตั้งค่า
// prefers-reduced-motion ขอไม่เห็นพอดี
const CHIP = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold';

// One string for the five icon buttons in the row -- see the same note in
// UserTable.tsx. Colour is appended per button, never layered.
const ROW_BUTTON =
    'rounded-full p-1.5 transition focus-visible:outline-2 focus-visible:outline-offset-2 ' +
    'focus-visible:outline-brand-500';

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
    onSort,
    isLoading,
}) => {
    const t = useT();

    return (
        <DataTable
            minWidth={880}
            isLoading={isLoading}
            loadingRows={10}
            loadingCols={8}
            loadingLabel={t.locations.loading}
            isEmpty={totalProcessedCount === 0}
            empty={
                <EmptyState
                    icon={MapPinned}
                    title={t.locations.noResults}
                    action={
                        <Button variant="secondary" onClick={onClearFilters}>
                            {t.common.clearFilters}
                        </Button>
                    }
                />
            }
            footer={
                totalProcessedCount > 0 ? (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={totalProcessedCount}
                        itemsPerPage={itemsPerPage}
                    />
                ) : undefined
            }
            head={
                <tr>
                    {/* เดิมเป็น "#" ซึ่ง screen reader อ่านว่า "number sign" และหัว
                        คอลัมน์นี้เคยเป็น cursor-pointer ทั้งที่กดแล้วไม่เรียงอะไร */}
                    <SortableTh<LocationSortKey> label={t.locations.rowNumber} sortConfig={sortConfig} align="center" className="w-16" />
                    <SortableTh<LocationSortKey> label={t.locations.locationName} sortKey="name" sortConfig={sortConfig} onSort={onSort} />
                    <SortableTh<LocationSortKey> label={t.common.total} sortKey="totalPallets" sortConfig={sortConfig} onSort={onSort} align="center" />
                    <SortableTh<LocationSortKey> label={t.locations.overdue} sortKey="overduePallets" sortConfig={sortConfig} onSort={onSort} align="center" />
                    <SortableTh<LocationSortKey> label={t.status.damaged} sortKey="damagedPallets" sortConfig={sortConfig} onSort={onSort} align="center" />
                    <SortableTh<LocationSortKey>
                        label={t.locations.lastUpdated}
                        sortKey="lastActivity"
                        sortConfig={sortConfig}
                        onSort={onSort}
                        className="hidden xl:table-cell"
                    />
                    <SortableTh<LocationSortKey> label={t.common.status} sortKey="is_active" sortConfig={sortConfig} onSort={onSort} align="center" />
                    <SortableTh<LocationSortKey> label={t.common.actions} sortConfig={sortConfig} align="right" />
                </tr>
            }
        >
            <tbody className="divide-y divide-slate-100">
                {paginatedDepartments.map((dept, index) => {
                    const stats = departmentStats[dept.name] || { totalPallets: 0, overduePallets: 0, damagedPallets: 0, lastActivity: null };
                    const isEditing = editingId === dept.id;

                    return (
                        <tr
                            key={dept.id}
                            className={isEditing ? 'bg-brand-50' : 'transition hover:bg-slate-50'}
                        >
                            <td className="px-3 py-1.5 text-center text-sm text-slate-400">
                                {(currentPage - 1) * itemsPerPage + index + 1}
                            </td>

                            <td className="px-3 py-1.5 font-medium text-slate-800">
                                {isEditing ? (
                                    <TextInput
                                        aria-label={t.locations.locationName}
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    />
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={
                                                'shrink-0 rounded-lg p-1.5 ' +
                                                (dept.is_active
                                                    ? 'bg-brand-50 text-brand-600'
                                                    : 'bg-slate-100 text-slate-400')
                                            }
                                            aria-hidden="true"
                                        >
                                            <MapPin size={16} />
                                        </span>
                                        <span className="font-semibold">{dept.name}</span>
                                    </div>
                                )}
                            </td>

                            <td className="px-3 py-1.5 text-center">
                                <span className={`${CHIP} ${stats.totalPallets > 0 ? 'bg-brand-50 text-brand-700' : 'text-slate-400'}`}>
                                    <Box size={14} aria-hidden="true" />
                                    {stats.totalPallets}
                                </span>
                            </td>

                            <td className="px-3 py-1.5 text-center">
                                {stats.overduePallets > 0 ? (
                                    <span className={`${CHIP} bg-red-50 text-red-600`}>
                                        <AlertTriangle size={14} aria-hidden="true" />
                                        {stats.overduePallets}
                                    </span>
                                ) : (
                                    <span className="text-slate-300">-</span>
                                )}
                            </td>

                            <td className="px-3 py-1.5 text-center">
                                {stats.damagedPallets > 0 ? (
                                    <span className={`${CHIP} bg-orange-50 text-orange-600`}>
                                        <AlertOctagon size={14} aria-hidden="true" />
                                        {stats.damagedPallets}
                                    </span>
                                ) : (
                                    <span className="text-slate-300">-</span>
                                )}
                            </td>

                            <td className="hidden px-3 py-1.5 text-sm text-slate-600 xl:table-cell">
                                {formatDateTime(stats.lastActivity)}
                            </td>

                            <td className="px-3 py-1.5 text-center">
                                <span
                                    className={
                                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ' +
                                        (dept.is_active
                                            ? 'border-green-200 bg-green-50 text-green-700'
                                            : 'border-slate-200 bg-slate-100 text-slate-500')
                                    }
                                >
                                    <span
                                        className={`h-1.5 w-1.5 rounded-full ${dept.is_active ? 'bg-green-600' : 'bg-slate-400'}`}
                                        aria-hidden="true"
                                    />
                                    {dept.is_active ? t.common.active : t.common.inactive}
                                </span>
                            </td>

                            <td className="px-3 py-1.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                    {isEditing ? (
                                        <>
                                            {/* Blank (or whitespace-only) names were
                                                saveable here, unlike in the add/edit
                                                modal which has always required one. */}
                                            <button
                                                onClick={() => onSave(dept.id)}
                                                disabled={!editForm.name.trim()}
                                                className={`${ROW_BUTTON} text-green-600 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
                                                title={editForm.name.trim() ? t.locations.saveChanges : t.locations.enterNameFirst}
                                                aria-label={t.locations.saveChanges}
                                            >
                                                <Save size={16} />
                                            </button>
                                            <button
                                                onClick={onCancelEdit}
                                                className={`${ROW_BUTTON} text-slate-500 hover:bg-slate-200 hover:text-slate-700`}
                                                title={t.locations.cancelEdit}
                                                aria-label={t.locations.cancelEdit}
                                            >
                                                <X size={16} />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => onToggleStatus(dept)}
                                                className={
                                                    `${ROW_BUTTON} ` +
                                                    (dept.is_active
                                                        ? 'text-green-600 hover:bg-green-100'
                                                        : 'text-slate-400 hover:bg-slate-200 hover:text-slate-600')
                                                }
                                                title={dept.is_active ? t.locations.deactivate : t.locations.activate}
                                                aria-label={dept.is_active ? t.locations.deactivate : t.locations.activate}
                                            >
                                                <Power size={16} />
                                            </button>
                                            <button
                                                onClick={() => onStartEdit(dept)}
                                                className={`${ROW_BUTTON} text-brand-400 hover:bg-brand-50 hover:text-brand-600`}
                                                title={t.locations.editName}
                                                aria-label={t.locations.editName}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => onDelete(dept.id)}
                                                className={`${ROW_BUTTON} text-red-400 hover:bg-red-50 hover:text-red-600`}
                                                title={t.locations.deleteLocation}
                                                aria-label={t.locations.deleteLocation}
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
        </DataTable>
    );
};
