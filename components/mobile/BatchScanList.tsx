import React from 'react';
import { ScanLine, Trash2, Save, MapPin } from 'lucide-react';
import { StagedItem, MobileMode } from './MobileInterface';
import { Department, PalletStatus } from '../../types';
import { PALLET_STATUS_META } from '../admin/common/AdminHelpers';
import { useT } from '../../hooks/useT';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

// StagedItem.status widens to 'unknown', which has no entry in the table --
// fall back to a neutral chip rather than crashing on the lookup.
const chipClassFor = (status: PalletStatus | 'unknown') =>
    PALLET_STATUS_META[status as PalletStatus]?.chip ?? 'bg-slate-200 text-slate-600';

interface BatchScanListProps {
    mode: MobileMode;
    pendingScans: StagedItem[];
    selectedDept: Department | null;
    isSubmitting: boolean;
    onRemoveItem: (id: string) => void;
    onConfirm: () => void;
}

export const BatchScanList = ({
    mode,
    pendingScans,
    selectedDept,
    isSubmitting,
    onRemoveItem,
    onConfirm,
}: BatchScanListProps) => {
    const t = useT();

    return (
        // z-[60] คือชั้นที่สองของกองหน้าจอสแกน (กล้อง 50 / แผ่นนี้ 60 / ผลตอบกลับ 70)
        // ตรงกับบันไดที่ Modal.tsx:77-78 ใช้อยู่
        //
        // max-w-md mx-auto เพื่อให้แผ่นไม่ยืดเต็มจอกว้าง เหมือนหน้าอื่น ๆ
        <div
            className={
                'fixed inset-x-0 bottom-0 z-[60] mx-auto flex max-h-[40vh] w-full max-w-md ' +
                'flex-col rounded-t-3xl border-t border-slate-200 bg-white ' +
                'shadow-[0_-24px_60px_-24px_rgba(15,42,82,0.45)] animate-surface-in'
            }
        >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 pb-2 pt-3">
                <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-slate-900">
                        {mode === 'checkout_scanning' ? t.batch.checkOutList : t.batch.checkInList}
                    </h2>
                    <p className="truncate text-xs text-slate-500">
                        {mode === 'checkout_scanning'
                            ? t.batch.toDept(selectedDept?.name ?? '-')
                            : t.batch.returningToWarehouse}
                    </p>
                </div>
                <span className="shrink-0 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
                    {pendingScans.length}
                </span>
            </div>

            <div className="min-h-[150px] space-y-3 overflow-y-auto p-4">
                {pendingScans.length === 0 ? (
                    <EmptyState icon={ScanLine} title={t.batch.empty} />
                ) : (
                    pendingScans.map((item, i) => (
                        <div
                            key={item.id}
                            className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3"
                        >
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] font-bold text-slate-500">
                                    {pendingScans.length - i}
                                </span>
                                <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                                    <span className="whitespace-nowrap font-mono text-sm font-bold text-slate-900">
                                        {item.id}
                                    </span>
                                    <span className="text-slate-300">|</span>
                                    {/* ทุกสถานะมีชิปสีของตัวเอง -- ของเดิมใช้ ternary ที่
                                        else ครอบ damaged/scrapped/unknown ด้วยชิปเทาใบเดียว
                                        พาเลทที่ถูกตัดจำหน่ายจึงหน้าตาเหมือนพาเลทที่แค่ชำรุด */}
                                    <span
                                        className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold ${chipClassFor(item.status)}`}
                                    >
                                        {t.status[item.status]}
                                    </span>
                                    <span className="text-slate-300">|</span>
                                    <span className="flex min-w-0 items-center gap-1 truncate text-xs text-slate-500">
                                        <MapPin size={12} className="shrink-0" aria-hidden="true" />
                                        <span className="truncate">{item.location || '-'}</span>
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => onRemoveItem(item.id)}
                                aria-label={t.batch.removeItem(item.id)}
                                className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                            >
                                <Trash2 size={16} aria-hidden="true" />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* pb-8 กันพื้นที่ให้แถบท่าทางของ iOS ที่ทับขอบล่างจอ */}
            <div className="shrink-0 border-t border-slate-100 bg-slate-50 p-4 pb-8">
                <Button
                    variant="primary"
                    size="lg"
                    onClick={onConfirm}
                    disabled={pendingScans.length === 0 || isSubmitting}
                    iconRight={isSubmitting ? undefined : Save}
                    className="w-full"
                >
                    {isSubmitting ? t.batch.saving : t.batch.confirm}
                </Button>
            </div>
        </div>
    );
};
