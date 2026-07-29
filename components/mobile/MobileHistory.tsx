import React, { useEffect, useState, useMemo } from 'react';
import {
    Clock, ArrowRightCircle, ArrowLeftCircle, AlertTriangle, Wrench, Calendar, Filter, Ban, MapPin,
} from 'lucide-react';
import { Transaction } from '../../types';
import { fetchUserTransactions, fetchUserTransactionDates } from '../../services/transactionService';
import { formatDateTime } from '../admin/common/AdminHelpers';
import { useT } from '../../hooks/useT';
import { ActionType } from '../../types';
import { StaffHeader } from './StaffHeader';
import { SearchInput } from '../ui/SearchInput';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Menu } from '../ui/Menu';
import type { MenuItem } from '../ui/Menu';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { Button } from '../ui/Button';

/** ตัวกรองประเภทรายการ -- เลือกได้ทีละอัน จึงเป็นชนิด union ไม่ใช่ string เปล่า */
type HistoryFilter = 'all' | 'check_out' | 'check_in' | 'damage';

interface MobileHistoryProps {
    userId: string;
    onBack: () => void;
}

export const MobileHistory: React.FC<MobileHistoryProps> = ({ userId, onBack }) => {
    const t = useT();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [availableDates, setAvailableDates] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedDept, setSelectedDept] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterAction, setFilterAction] = useState<HistoryFilter>('all');

    // 1. Load Dates on Mount
    useEffect(() => {
        const loadDates = async () => {
            try {
                const dates = await fetchUserTransactionDates(userId);
                setAvailableDates(dates);
                if (dates.length > 0) {
                    setSelectedDate(dates[0]); // Default to latest
                } else {
                    // If no dates, maybe just load 'recent' (empty date)
                    setSelectedDate('');
                }
            } catch (error) {
                console.error("Failed to load dates", error);
            }
        };
        loadDates();
    }, [userId]);

    // 2. Load Transactions when Date Changes
    useEffect(() => {
        const loadHistory = async () => {
            setLoading(true);
            try {
                // If we have dates but none selected, wait? Or load recent?
                // Logic: If availableDates exist, use selectedDate. If availableDates empty, load recent.
                const data = await fetchUserTransactions(userId, selectedDate);
                setTransactions(data);
            } catch (error) {
                console.error("Failed to load history", error);
            } finally {
                setLoading(false);
            }
        };

        loadHistory();
    }, [userId, selectedDate]);

    // รายชื่อสถานที่ทั้งหมดที่มีในประวัติที่โหลดมา
    const availableDepts = useMemo(() => {
        const set = new Set<string>();
        transactions.forEach((tx) => {
            if (tx.department_dest) set.add(tx.department_dest);
        });
        return Array.from(set).sort();
    }, [transactions]);

    // ตัวกรองสถานที่ได้ตัวเลือกมาจากรายการที่โหลดอยู่ ซึ่งเปลี่ยนทุกครั้งที่เปลี่ยนวัน
    // ถ้าไม่ล้างค่าที่ค้างอยู่ จะเกิดทางตันที่ไม่มีทางออก: เลือกวัน A -> กรอง "คลังกลาง"
    // -> เปลี่ยนเป็นวัน B ที่ไม่มีรายการไปคลังกลาง -> หน้าขึ้น "ไม่พบรายการ" ทั้งที่วันนั้น
    // มีรายการอยู่ และตัวกรองที่เป็นต้นเหตุก็หายไปจากรายการในเมนูแล้ว เหลือแต่ป้ายบนปุ่ม
    //
    // เช็คว่า "ค่าที่เลือกยังมีอยู่ไหม" ไม่ใช่ "วันเปลี่ยนหรือยัง" -- ถ้าสถานที่นั้นยังมี
    // รายการในวันใหม่ด้วย ตัวกรองก็ควรอยู่ต่อ ไม่ใช่ถูกล้างทิ้งทุกครั้งที่เลื่อนวัน
    useEffect(() => {
        if (selectedDept && !availableDepts.includes(selectedDept)) {
            setSelectedDept('');
        }
    }, [availableDepts, selectedDept]);

    // 3. Client-side Filtering (Search, Location & Action)
    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            // Action Filter
            if (filterAction !== 'all') {
                if (filterAction === 'check_out' && tx.action_type !== 'check_out') return false;
                if (filterAction === 'check_in' && tx.action_type !== 'check_in') return false;
                if (filterAction === 'damage' && tx.action_type !== 'report_damage') return false;
            }

            // Location Filter
            if (selectedDept && tx.department_dest !== selectedDept) return false;

            // Search Filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesId = tx.pallet_id.toLowerCase().includes(query);
                const matchesDest = tx.department_dest?.toLowerCase().includes(query);
                const matchesRemark = tx.transaction_remark?.toLowerCase().includes(query);
                return matchesId || matchesDest || matchesRemark;
            }

            return true;
        });
    }, [transactions, filterAction, selectedDept, searchQuery]);

    // สีชุดเดียวกับกราฟของแอดมิน (--color-series-* ใน index.css) ประวัติของพนักงาน
    // กับกราฟของแอดมินจึงพูดสีเดียวกัน
    //
    // ปลอดภัยกับคนตาบอดสีเพราะแต่ละแถวมีทั้งไอคอนคนละรูปและป้ายข้อความกำกับ
    // สีจึงไม่ใช่ช่องทางเดียวที่แยกความต่าง -- เงื่อนไขที่ index.css:62-75 ระบุไว้
    const ACTION_ICON = {
        check_out: { Icon: ArrowRightCircle, color: 'text-[var(--color-series-checkout)]' },
        check_in: { Icon: ArrowLeftCircle, color: 'text-[var(--color-series-checkin)]' },
        report_damage: { Icon: AlertTriangle, color: 'text-[var(--color-series-damage)]' },
        repair: { Icon: Wrench, color: 'text-[var(--color-series-repair)]' },
        scrap: { Icon: Ban, color: 'text-[var(--color-series-scrap)]' },
    } as const;

    const renderActionIcon = (action: string) => {
        const entry = ACTION_ICON[action as keyof typeof ACTION_ICON];
        const Icon = entry?.Icon ?? Clock;
        return <Icon size={20} className={entry?.color ?? 'text-slate-400'} aria-hidden="true" />;
    };

    // Helper to format date for display in selector (e.g. "29-Jul").
    //
    // ปักหมุด 'en-GB' ไว้ ห้ามเปลี่ยนเป็น `undefined` เด็ดขาด -- `undefined` แปลว่า
    // "ใช้ locale ของเบราว์เซอร์" ซึ่งเคยเป็นบั๊กจริงมาแล้ว: มือถือที่ตั้งภาษาไทยจะ
    // แสดงวันที่ตรงนี้คนละฟอร์แมตกับวันที่ทุกที่ในแอป ทั้งแอปตั้งใจให้วันที่มีฟอร์แมต
    // เดียวไม่ว่าผู้ใช้ตั้งเครื่องไว้ยังไง (ดูหมายเหตุใน AdminHelpers.tsx)
    const formatDateChip = (dateStr: string) => {
        if (!dateStr) return t.history.recent;
        const date = new Date(dateStr);
        const day = date.toLocaleDateString('en-GB', { day: 'numeric' });
        const month = date.toLocaleDateString('en-GB', { month: 'short' });
        return `${day}-${month}`;
    };

    const dateItems: MenuItem[] = [
        {
            label: t.history.recentLast50,
            icon: Clock,
            tone: selectedDate === '' ? 'brand' : 'neutral',
            onClick: () => setSelectedDate(''),
        },
        ...availableDates.map((date) => ({
            label: formatDateChip(date),
            icon: Calendar,
            tone: (selectedDate === date ? 'brand' : 'neutral') as MenuItem['tone'],
            onClick: () => setSelectedDate(date),
        })),
    ];

    const deptItems: MenuItem[] = [
        {
            label: t.history.allLocations,
            icon: MapPin,
            tone: selectedDept === '' ? 'brand' : 'neutral',
            onClick: () => setSelectedDept(''),
        },
        ...availableDepts.map((dept) => ({
            label: dept,
            icon: MapPin,
            tone: (selectedDept === dept ? 'brand' : 'neutral') as MenuItem['tone'],
            onClick: () => setSelectedDept(dept),
        })),
    ];

    const filterOptions = [
        { value: 'all', label: t.history.filterAll },
        { value: 'check_out', label: t.history.filterOut },
        { value: 'check_in', label: t.history.filterIn },
        { value: 'damage', label: t.history.filterDamage },
    ] as const satisfies readonly { value: HistoryFilter; label: string }[];

    const hasFilters = searchQuery !== '' || filterAction !== 'all' || selectedDept !== '';

    return (
        <div className="app-canvas flex min-h-dvh flex-col">
            <StaffHeader title={t.history.title} onBack={onBack} />

            <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 p-4">
                {/* แถวที่ 1: ช่องค้นหา (ซ้าย) + ปุ่มเลือกสถานที่ (ขวา) */}
                <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder={t.history.searchPlaceholder}
                            ariaLabel={t.history.searchAria}
                            clearLabel={t.common.clearFilters}
                        />
                    </div>
                    <Menu
                        label={selectedDept ? selectedDept : t.history.allLocations}
                        items={deptItems}
                        icon={MapPin}
                        align="right"
                        variant="secondary"
                        className="w-36 shrink-0"
                        matchTriggerWidth
                    />
                </div>

                {/* แถวที่ 2: ปุ่มเลือกวันที่ (ซ้าย) + ปุ่มเลือกประเภทรายการ (ขวา) */}
                <div className="flex items-center gap-2">
                    <Menu
                        label={selectedDate ? formatDateChip(selectedDate) : t.history.recentOnly}
                        items={dateItems}
                        icon={Calendar}
                        align="left"
                        variant="secondary"
                        className="w-32 shrink-0"
                        matchTriggerWidth
                    />
                    <div className="min-w-0 flex-1 overflow-x-auto no-scrollbar">
                        <SegmentedControl
                            value={filterAction}
                            options={filterOptions}
                            onChange={setFilterAction}
                            ariaLabel={t.history.filterAria}
                            size="sm"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col gap-2" role="status" aria-label={t.history.loading}>
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-16 rounded-2xl" />
                        ))}
                    </div>
                ) : filteredTransactions.length === 0 ? (
                    <EmptyState
                        icon={Filter}
                        title={t.history.empty}
                        hint={t.history.emptyHint}
                        action={
                            hasFilters ? (
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setFilterAction('all');
                                        setSelectedDept('');
                                    }}
                                >
                                    {t.history.clearFilters}
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className="flex flex-col gap-2">
                        {filteredTransactions.map((tx) => (
                            <Card key={tx.id} className="flex flex-col gap-1.5 p-3">
                                {/* แถวที่ 1: ไอคอน + ชื่อการกระทำ + รหัสพาเลท (ซ้าย) / เวลา (ขวา) */}
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <span className="shrink-0 rounded-full bg-slate-50 p-1.5">
                                            {renderActionIcon(tx.action_type)}
                                        </span>
                                        <span className="truncate text-sm font-semibold text-slate-900">
                                            {t.action[tx.action_type as ActionType] ??
                                                tx.action_type.replace('_', ' ')}
                                        </span>
                                        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-600">
                                            {tx.pallet_id}
                                        </span>
                                    </div>
                                    <span className="shrink-0 text-[11px] font-medium text-slate-400">
                                        {formatDateTime(tx.timestamp)}
                                    </span>
                                </div>

                                {/* แถวที่ 2: ปลายทาง / หมายเหตุ (ถ้ามี)
                                    เรียงลงเป็นบรรทัด ไม่ใช่วางเรียงกันในแถวเดียว: ตอนที่
                                    ทั้งสองอย่างแย่งพื้นที่บรรทัดเดียวกัน หมายเหตุเหลือที่
                                    ครึ่งเดียวแล้วโดน truncate ตัดทิ้ง -- และหมายเหตุคือ
                                    เหตุผลที่พาเลทถูกแจ้งชำรุด ส่วนฝั่งพนักงานไม่มีหน้า
                                    รายละเอียดให้กดดูต่อ ข้อความที่ถูกตัดจึงหายไปเลย */}
                                {(tx.department_dest || tx.transaction_remark) && (
                                    <div className="flex min-w-0 flex-col gap-0.5 pl-9 text-xs">
                                        {tx.department_dest && (
                                            <span className="truncate font-medium text-slate-700">
                                                <span className="mr-1 text-slate-400">{t.history.to}</span>
                                                {tx.department_dest}
                                            </span>
                                        )}
                                        {tx.transaction_remark && (
                                            <span className="italic leading-relaxed text-slate-500">
                                                "{tx.transaction_remark}"
                                            </span>
                                        )}
                                    </div>
                                )}
                            </Card>
                        ))}

                        <p className="py-3 text-center text-xs text-slate-400">
                            {t.history.showing(filteredTransactions.length)}
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
};
