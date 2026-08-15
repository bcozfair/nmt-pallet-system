import React from 'react';
import {
    MapPin, User, History, Image as ImageIcon, Edit2, Trash2, FileText
} from 'lucide-react';
import { Transaction } from '../../../types';
import { IMAGE_DELETED } from '../../../services/storageService';
import { formatDateTime } from '../common/AdminHelpers';
import { Pagination } from '../common/Pagination';
import { useT } from '../../../hooks/useT';
import { Button, DataTable, EmptyState, SortableTh } from '../../ui';

export type TxSortConfig = { key: keyof Transaction, direction: 'asc' | 'desc' } | null;

// The generic parameter SortableTh needs. A local alias rather than a second
// exported name for the same union -- `TxSortConfig` above is the one
// TransactionView already imports.
type TxSortKey = keyof Transaction;

// This table is a SCREEN table again.
//
// It used to render every row that passed the filters and hide the off-page ones
// with an inline `display: none`, so a `tr[data-print-row]` rule could bring them
// back for print. All of it is gone: the report is a separate document now
// (report/TransactionReport.tsx), built from the same `processedTransactions`
// array this screen already had. With a 2000-row fetch limit, what that removes
// is up to two thousand rows of DOM held permanently to fill a sheet nobody had
// asked for yet.
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
    /**
     * id ของแถว -> ค่า evidence_image_url ที่แถวนั้น "ยืม" มาแสดง
     *
     * มีเฉพาะแถวตัดออกจากระบบ ซึ่งไม่มีรูปเป็นของตัวเองแต่มีรายงานความเสียหาย
     * ก่อนหน้าที่เป็นเหตุผลของมันอยู่ -- ดู services/transactionEvidence.ts
     */
    inheritedEvidence: Record<string, string>;
    // Actions
    onEdit: (tx: Transaction) => void;
    onDelete: (id: string) => void;
    // Before this prop existed, TransactionView returned a full-page "Loading
    // transactions..." string instead of rendering at all, so the page header
    // and the filter bar arrived a whole fetch late. See TransactionView.tsx.
    isLoading: boolean;
}

// Row action buttons. One string, used four times, so the two icons that mean
// "act on this row" and the one that means "open the evidence photo" cannot
// drift apart on padding or focus treatment. Colour is appended per button
// because each one is a complete set of its own -- see the note in Button.tsx
// about why two classes setting the same property is a coin flip.
const ROW_BUTTON =
    'rounded-full p-1.5 transition focus-visible:outline-2 focus-visible:outline-offset-2 ' +
    'focus-visible:outline-brand-500';

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
    inheritedEvidence,
    onEdit,
    onDelete,
    isLoading,
}) => {
    const t = useT();

    // Colours stay here, wording comes from the shared action table -- the same
    // one the filter dropdown, the CSV export and the mobile history read.
    //
    // The five hues are deliberately NOT converted to brand tokens: they are
    // meaning shared with the rest of the app, the same reason the inventory
    // rework was told to leave StatusBadge alone. Only the neutral one moved
    // from `gray` to `slate`, so it sits on the same ramp as everything around it.
    const getActionBadge = (action: string) => {
        switch (action) {
            case 'check_out':
                return <span className="rounded-full border border-yellow-200 bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-700">{t.action.check_out}</span>;
            case 'check_in':
                return <span className="rounded-full border border-blue-200 bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">{t.action.check_in}</span>;
            case 'report_damage':
                return <span className="rounded-full border border-red-200 bg-red-100 px-2 py-1 text-xs font-bold text-red-700">{t.action.report_damage}</span>;
            case 'repair':
                return <span className="rounded-full border border-green-200 bg-green-100 px-2 py-1 text-xs font-bold text-green-700">{t.action.repair}</span>;
            case 'scrap':
                return <span className="rounded-full border border-slate-300 bg-slate-200 px-2 py-1 text-xs font-bold text-slate-700">{t.action.scrap}</span>;
            default:
                return <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{action}</span>;
        }
    };

    return (
        <DataTable
            minWidth={1000}
            isLoading={isLoading}
            loadingRows={10}
            loadingCols={9}
            // `t.transactions.loading` rather than the generic `t.common.loading`
            // the inventory table uses: this is the string the old full-page
            // loading screen announced, and it says which list is on its way.
            loadingLabel={t.transactions.loading}
            isEmpty={totalProcessedCount === 0}
            empty={
                <EmptyState
                    icon={History}
                    title={t.transactions.emptyFiltered}
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
                    <SortableTh<TxSortKey> label={t.transactions.colDateTime} sortKey="timestamp" sortConfig={sortConfig} onSort={onSort} />
                    <SortableTh<TxSortKey> label={t.common.palletId} sortKey="pallet_id" sortConfig={sortConfig} onSort={onSort} />
                    <SortableTh<TxSortKey> label={t.transactions.colAction} sortKey="action_type" sortConfig={sortConfig} onSort={onSort} />
                    <SortableTh<TxSortKey> label={t.transactions.colPerformedBy} sortKey="user_id" sortConfig={sortConfig} onSort={onSort} />
                    {/* สองคอลัมน์นี้คือครึ่งหนึ่งของการเคลื่อนย้ายหนึ่งครั้ง คนละครึ่ง
                        ของเดิมมีแต่ปลายทางภายใต้ป้ายกลาง ๆ ว่า "สถานที่" ซึ่งอ่านแล้ว
                        เหมือนเป็นคำตอบทั้งหมด ทั้งที่แถวรับคืนเขียน 'Warehouse' ทุกแถว
                        และแถวแจ้งชำรุด/ตัดออกไม่มีค่าเลย -- สามในห้าประเภทรายการจึงมี
                        คอลัมน์นี้เป็นที่ว่าง ทั้งที่ department_origin ถูกเก็บมาตั้งแต่
                        migration 01 แล้วและไม่มีใครฝั่งแอดมินอ่านมันเลย */}
                    <SortableTh<TxSortKey> label={t.transactions.colOrigin} sortKey="department_origin" sortConfig={sortConfig} onSort={onSort} />
                    <SortableTh<TxSortKey> label={t.transactions.colDest} sortKey="department_dest" sortConfig={sortConfig} onSort={onSort} />
                    {/* หมายเหตุยาวและไม่มีค่าเรียงลำดับ ซ่อนต่ำกว่า xl ให้เหลือ 7
                        คอลัมน์พอดีกับ minWidth ข้างบน ข้อความเต็มยังอ่านได้ครบใน
                        โมดัลแก้ไขและในไฟล์ CSV ที่ส่งออก -- เกณฑ์เดียวกับที่หน้า
                        คลังพาเลทซ่อนคอลัมน์หมายเหตุกับเบิกออกล่าสุด */}
                    {/* Dropped below `xl` and NOT brought back for print. The
                        report carries all seven columns and does not consult a
                        breakpoint to decide -- which is what the
                        `print:table-cell` that used to be here was compensating
                        for, since a print media query measures the paper and A4
                        is narrower than `xl`. */}
                    <SortableTh<TxSortKey> label={t.common.remark} sortConfig={sortConfig} className="hidden xl:table-cell" />
                    <SortableTh<TxSortKey> label={t.transactions.colEvidence} sortConfig={sortConfig} align="center" />
                    <SortableTh<TxSortKey> label={t.common.actions} sortConfig={sortConfig} align="right" />
                </tr>
            }
        >
            <tbody className="divide-y divide-slate-100">
                {/* One page of rows, which is now all this table ever renders --
                    see the note above the props for what used to be here. */}
                {paginatedTransactions.map(tx => (
                    // Body cells are `py-1.5`, the header `py-2.5` (DataTable's
                    // TH_BASE). Not drift: the row height decides how much
                    // history fits on one screen, and the header is one row that
                    // pays for itself by staying easy to hit and to read.
                    //
                    // The round action buttons came down from `p-2`/32px to
                    // `p-1.5`/28px in the same pass -- a row is as tall as its
                    // tallest cell, so without that the padding change would
                    // have shown up nowhere.
                    <tr
                        key={tx.id}
                        className="transition hover:bg-slate-50"
                    >
                        <td className="px-3 py-1.5 text-sm text-slate-600">
                            {formatDateTime(tx.timestamp)}
                        </td>
                        <td className="px-3 py-1.5 font-mono font-semibold text-slate-700">
                            {tx.pallet_id}
                        </td>
                        <td className="px-3 py-1.5">
                            {getActionBadge(tx.action_type)}
                        </td>
                        <td className="px-3 py-1.5 text-sm text-slate-700">
                            <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                                    {userMap[tx.user_id]?.charAt(0) || <User size={12} />}
                                </div>
                                {userMap[tx.user_id] || <span className="font-mono text-xs text-slate-400">{tx.user_id.substring(0, 8)}...</span>}
                            </div>
                        </td>
                        {/* หมุดปักที่ปลายทางอย่างเดียว ไม่ใช่ทั้งสองช่อง: หมุดสองอันติดกัน
                            ในแถวเดียวไม่ได้บอกอะไรเพิ่ม นอกจากกินความกว้าง อันเดียวที่
                            ปลายทางทำให้กวาดตาลงมาแล้วรู้ว่าของไปจบที่ไหน */}
                        <td className="px-3 py-1.5 text-sm text-slate-500">
                            {tx.department_origin || <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-3 py-1.5 text-slate-600">
                            {tx.department_dest ? (
                                <div className="flex items-center gap-2">
                                    <MapPin size={14} className="shrink-0 text-slate-400" />
                                    {tx.department_dest}
                                </div>
                            ) : (
                                <span className="text-slate-300">-</span>
                            )}
                        </td>
                        <td
                            className="hidden max-w-[200px] truncate px-3 py-1.5 text-sm text-slate-500 xl:table-cell"
                            title={tx.transaction_remark || ''}
                        >
                            {tx.transaction_remark ? (
                                <div className="flex items-center gap-1.5">
                                    <FileText size={14} className="shrink-0 text-slate-400" />
                                    <span className="truncate">{tx.transaction_remark}</span>
                                </div>
                            ) : (
                                <span className="text-slate-300">-</span>
                            )}
                        </td>
                        {/* ปุ่มนี้เป็นชิปมีพื้นสี ไม่ใช่ปุ่มกลมโปร่งเหมือนสามปุ่มข้าง ๆ
                            โดยตั้งใจ: สิ่งที่คอลัมน์นี้ทำจริงคือให้กวาดตาลงมาแล้วรู้
                            ทันทีว่าแถวไหนมีรูปหลักฐาน และพื้นสีคือสิ่งที่ทำให้กวาดตาได้
                            เปลี่ยนเป็นไอคอนเปล่าคือถอดความสามารถนั้นออกไปเงียบ ๆ */}
                        <td className="px-3 py-1.5 text-center">
                            {(() => {
                                const own =
                                    tx.evidence_image_url && tx.evidence_image_url !== IMAGE_DELETED
                                        ? tx.evidence_image_url
                                        : null;
                                // แถวตัดออกจากระบบไม่มีรูปเป็นของตัวเอง แต่รูปที่เป็น
                                // เหตุผลของมันยังอยู่ที่รายงานความเสียหายก่อนหน้า --
                                // ของเดิมช่องนี้จึงว่างเปล่าทั้งที่หลักฐานยังอยู่ครบ
                                const borrowed = own ? null : inheritedEvidence[tx.id];
                                const stored = own ?? borrowed;
                                if (!stored) return <span className="text-xs text-slate-300">-</span>;

                                // ชิปสีเดียวกันทั้งสองแบบโดยตั้งใจ -- งานจริงของคอลัมน์นี้คือ
                                // ให้กวาดตาลงมาแล้วรู้ว่าแถวไหนมีรูปให้เปิดดู ส่วนความต่างว่า
                                // รูปเป็นของแถวนี้เองหรือยืมมา อยู่ในป้ายชื่อของปุ่ม
                                const label = borrowed
                                    ? t.transactions.viewDamageEvidence
                                    : t.transactions.viewEvidence;
                                return (
                                    <button
                                        onClick={() => onViewImage(stored)}
                                        className={
                                            'inline-flex items-center justify-center rounded-lg bg-red-50 p-1.5 ' +
                                            'text-red-600 transition hover:bg-red-100 focus-visible:outline-2 ' +
                                            'focus-visible:outline-offset-2 focus-visible:outline-brand-500'
                                        }
                                        title={label}
                                        aria-label={label}
                                    >
                                        <ImageIcon size={16} />
                                    </button>
                                );
                            })()}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                                <button
                                    onClick={() => onEdit(tx)}
                                    className={`${ROW_BUTTON} text-brand-400 hover:bg-brand-50 hover:text-brand-600`}
                                    title={t.transactions.editTitle}
                                    aria-label={t.transactions.editTitle}
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => onDelete(tx.id)}
                                    className={`${ROW_BUTTON} text-red-400 hover:bg-red-50 hover:text-red-600`}
                                    title={t.transactions.deleteRecord}
                                    aria-label={t.transactions.deleteRecord}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </DataTable>
    );
};
