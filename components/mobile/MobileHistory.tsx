import React, { useEffect, useState, useMemo } from 'react';
import {
    Clock, ArrowRightCircle, ArrowLeftCircle, AlertTriangle, Wrench, Calendar, Filter, Ban, MapPin,
    ChevronDown,
} from 'lucide-react';
import { Transaction } from '../../types';
import { fetchUserTransactions, fetchUserTransactionDates } from '../../services/transactionService';
import { groupIntoBatches } from '../../services/transactionBatch';
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
    //
    // โหลดมาเพื่อทำ "ตัวเลือกวัน" ในเมนูเท่านั้น ไม่แตะ selectedDate -- ค่าเริ่มต้นของหน้านี้
    // คือ 50 รายการล่าสุด (selectedDate = '') ซึ่งข้ามวันได้ ไม่ใช่รายการของวันล่าสุดวันเดียว
    //
    // เดิมตั้งเป็น dates[0] แล้วเจอสองปัญหา: หน้าเปิดมาเห็นเฉพาะรายการของวันนั้นวันเดียว
    // ถ้าวันนี้เพิ่งสแกนไปรายการเดียวก็เห็นแค่รายการเดียว ต้องกดเปลี่ยนเป็น "ล่าสุด" เองทุกครั้ง
    // และยังยิง fetch ซ้ำสองรอบตอนเปิดหน้า (รอบแรก '' รอบสองหลังวันที่โหลดเสร็จ)
    useEffect(() => {
        const loadDates = async () => {
            try {
                const dates = await fetchUserTransactionDates(userId);
                setAvailableDates(dates);
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
                // selectedDate = '' -> 50 รายการล่าสุด (ค่าเริ่มต้น), มีค่า -> รายการทั้งวันนั้น
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
    //
    // ตัวกรองทำงานคนละระดับกัน: ประเภทรายการกับสถานที่เป็นคุณสมบัติของทั้งชุด (ทุกแถว
    // ในชุดมีค่าเดียวกัน) จึงคัดทั้งชุด ส่วนคำค้นอาจตรงกับพาเลทแค่บางส่วนในชุด ชุดนั้นจึง
    // ถูกเก็บไว้พร้อมสมาชิกเท่าที่ตรง โดย total ยังบอกขนาดจริงของชุดเหมือนเดิม
    //
    // จัดกลุ่มก่อนแล้วค่อยกรอง ไม่ใช่กรองแล้วค่อยจัดกลุ่ม -- ลำดับนี้เท่านั้นที่ทำให้การ์ด
    // พูดได้ว่า "1 จาก 12 พาเลท" ถ้ากรองก่อน ข้อมูลว่าชุดนั้นมี 12 พาเลทจะหายไปตั้งแต่ก่อนจัดกลุ่ม
    // เหลือแค่ "1 พาเลท" ซึ่งอ่านได้ว่าชุดนั้นมีพาเลทเดียว -- คนละเรื่องกัน
    const batches = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        const matchesSearch = (tx: Transaction) => {
            const matchesId = tx.pallet_id.toLowerCase().includes(query);
            const matchesDest = tx.department_dest?.toLowerCase().includes(query);
            const matchesRemark = tx.transaction_remark?.toLowerCase().includes(query);
            return matchesId || matchesDest || matchesRemark;
        };

        return groupIntoBatches(transactions)
            .filter((batch) => {
                // Action Filter
                if (filterAction !== 'all') {
                    if (filterAction === 'check_out' && batch.action_type !== 'check_out') return false;
                    if (filterAction === 'check_in' && batch.action_type !== 'check_in') return false;
                    if (filterAction === 'damage' && batch.action_type !== 'report_damage') return false;
                }

                // Location Filter
                if (selectedDept && batch.department_dest !== selectedDept) return false;

                return true;
            })
            // Search Filter -- ข้ามไปทั้งขั้นเมื่อไม่ได้ค้นหา จะได้ไม่ copy อ็อบเจกต์ทุกชุดทิ้งเปล่า ๆ
            .map((batch) => (query ? { ...batch, items: batch.items.filter(matchesSearch) } : batch))
            .filter((batch) => batch.items.length > 0);
    }, [transactions, filterAction, selectedDept, searchQuery]);

    /** จำนวนพาเลทที่แสดงอยู่จริง ไม่ใช่จำนวนชุด -- ใช้ที่บรรทัดสรุปท้ายรายการ */
    const shownItems = useMemo(
        () => batches.reduce((sum, batch) => sum + batch.items.length, 0),
        [batches]
    );

    // ---- การกาง/ยุบชุด ----
    //
    // เก็บเป็นรายชื่อ "ข้อยกเว้น" สองชุดที่ความหมายกลับด้านกัน ไม่ใช่ชุดเดียว เพราะโหมดปกติ
    // กับโหมดค้นหาต้องการค่าตั้งต้นคนละอย่าง:
    //
    // ปกติ -- ทุกชุดยุบอยู่ หน้าประวัติต้องเปิดมาแล้วเห็นว่า "วันนี้ทำอะไรไปกี่ครั้ง" ไม่ใช่
    // กำแพงรหัสพาเลท openKeys จึงแปลว่า "ชุดที่ผู้ใช้กดกางเอง"
    //
    // ระหว่างค้นหา -- ทุกชุดกางอยู่ ชุดที่ค้างอยู่บนจอคือชุดที่มีพาเลทตรงคำค้น ถ้ายังยุบอยู่
    // ผู้ใช้จะเห็นแค่การ์ดชุด ไม่เห็นพาเลทที่ตัวเองค้นหา ทั้งที่มันคือสิ่งเดียวที่พิมพ์ไปเพื่อหา
    // closedKeys จึงแปลว่า "ชุดที่ผู้ใช้กดยุบเอง"
    //
    // ทางเลือกที่ใช้ state เดียวแล้วมี useEffect คอยกางให้ตอนคำค้นเปลี่ยนใช้ไม่ได้: effect นั้น
    // จะยิงใหม่ทุกตัวอักษรที่พิมพ์ และกางชุดที่ผู้ใช้เพิ่งกดยุบไปกลับมาเองทุกครั้ง
    const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set());
    const [closedKeys, setClosedKeys] = useState<Set<string>>(() => new Set());
    const searching = searchQuery.trim() !== '';

    const isExpanded = (key: string) => (searching ? !closedKeys.has(key) : openKeys.has(key));

    const toggleBatch = (key: string) => {
        const flip = (prev: Set<string>) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        };
        if (searching) setClosedKeys(flip);
        else setOpenKeys(flip);
    };

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
                ) : batches.length === 0 ? (
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
                        {batches.map((batch, index) => {
                            // การ์ดที่กางได้คือการ์ดที่มีอะไรให้กาง -- ชุดที่มีพาเลทเดียวเอารหัสของมัน
                            // ขึ้นมาไว้บนหัวการ์ดเลย ไม่ต้องให้กดเพื่อดูสิ่งที่มีที่ว่างให้เห็นอยู่แล้ว
                            //
                            // วัดจาก total ไม่ใช่ items.length: ระหว่างค้นหา ชุด 12 พาเลทที่ตรงคำค้น
                            // แค่พาเลทเดียวก็ยังต้องกางได้ เพื่อให้เห็นว่าพาเลทไหนที่ตรง
                            const expandable = batch.total > 1;
                            const expanded = expandable && isExpanded(batch.key);
                            // ไล่ตามลำดับที่แสดง ไม่ใช่ batch.key -- key ประกอบจาก timestamp และ
                            // ชื่อสถานที่ซึ่งเป็นภาษาไทยได้ ไม่เหมาะกับ id ใน DOM
                            const panelId = `history-batch-${index}`;

                            const headerRows = (
                                <>
                                    {/* แถวที่ 1: ไอคอน + ชื่อการกระทำ + จำนวน/รหัสพาเลท (ซ้าย) / เวลา + เชฟรอน (ขวา) */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <span className="shrink-0 rounded-full bg-slate-50 p-1.5">
                                                {renderActionIcon(batch.action_type)}
                                            </span>
                                            <span className="truncate text-sm font-semibold text-slate-900">
                                                {t.action[batch.action_type as ActionType] ??
                                                    batch.action_type.replace('_', ' ')}
                                            </span>
                                            {/* ชุดพาเลทเดียวโชว์รหัส ชุดหลายพาเลทโชว์จำนวน และถ้าคำค้นกรอง
                                                สมาชิกออกไปบางส่วน ต้องบอกทั้งสองตัวเลข ไม่ใช่แค่ตัวที่เหลือ */}
                                            {batch.items.length < batch.total ? (
                                                <span className="shrink-0 rounded bg-brand-50 px-1.5 py-0.5 text-xs font-semibold text-brand-700">
                                                    {t.history.batchPartial(batch.items.length, batch.total)}
                                                </span>
                                            ) : batch.total > 1 ? (
                                                <span className="shrink-0 rounded bg-brand-50 px-1.5 py-0.5 text-xs font-semibold text-brand-700">
                                                    {t.history.batchCount(batch.total)}
                                                </span>
                                            ) : (
                                                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-600">
                                                    {batch.items[0].pallet_id}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1.5">
                                            <span className="text-[11px] font-medium text-slate-400">
                                                {formatDateTime(batch.timestamp)}
                                            </span>
                                            {expandable && (
                                                <ChevronDown
                                                    size={16}
                                                    className={`text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                                                    aria-hidden="true"
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* แถวที่ 2: ปลายทาง / หมายเหตุ (ถ้ามี) -- ทั้งคู่เป็นของทั้งชุด ไม่ใช่
                                        ของพาเลทใดพาเลทหนึ่ง จึงอยู่บนหัวการ์ด ไม่ใช่ในรายละเอียดที่ต้องกดกาง

                                        เรียงลงเป็นบรรทัด ไม่ใช่วางเรียงกันในแถวเดียว: ตอนที่ทั้งสองอย่าง
                                        แย่งพื้นที่บรรทัดเดียวกัน หมายเหตุเหลือที่ครึ่งเดียวแล้วโดน truncate
                                        ตัดทิ้ง -- และหมายเหตุคือเหตุผลที่พาเลทถูกแจ้งชำรุด ส่วนฝั่งพนักงาน
                                        ไม่มีหน้ารายละเอียดให้กดดูต่อ ข้อความที่ถูกตัดจึงหายไปเลย */}
                                    {(batch.department_dest || batch.remark) && (
                                        <div className="flex min-w-0 flex-col gap-0.5 pl-9 text-xs">
                                            {batch.department_dest && (
                                                <span className="truncate font-medium text-slate-700">
                                                    <span className="mr-1 text-slate-400">{t.history.to}</span>
                                                    {batch.department_dest}
                                                </span>
                                            )}
                                            {batch.remark && (
                                                <span className="italic leading-relaxed text-slate-500">
                                                    "{batch.remark}"
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </>
                            );

                            return (
                                <Card key={batch.key} className="p-3">
                                    {/* เป็นปุ่มก็ต่อเมื่อกดแล้วเกิดอะไรขึ้นจริง -- การ์ดของชุดพาเลทเดียวเป็น
                                        div เพราะปุ่มที่กดแล้วไม่มีอะไรเกิดขึ้นคือปุ่มที่หลอกทั้งคนที่เห็นจอ
                                        และ screen reader ซึ่งจะประกาศว่า "ปุ่ม, ยุบอยู่" ให้ทุกการ์ด */}
                                    {expandable ? (
                                        <button
                                            type="button"
                                            onClick={() => toggleBatch(batch.key)}
                                            aria-expanded={expanded}
                                            aria-controls={panelId}
                                            className="flex w-full flex-col gap-1.5 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                                        >
                                            {headerRows}
                                        </button>
                                    ) : (
                                        <div className="flex w-full flex-col gap-1.5">{headerRows}</div>
                                    )}

                                    {expanded && (
                                        <div id={panelId} className="mt-2.5 border-t border-slate-100 pt-2.5 pl-9">
                                            {/* สามคอลัมน์: รหัสพาเลทเป็นข้อความสั้น (P001) การเรียงลงเป็น
                                                แถวเดี่ยวจะทำให้ชุด 20 พาเลทยาวเกินหนึ่งหน้าจอ จนการยุบชุดไม่ได้
                                                ช่วยอะไรเลยเมื่อกางออกมาแล้ว */}
                                            <ul
                                                className="grid grid-cols-3 gap-1.5"
                                                aria-label={t.history.batchItemsAria(batch.items.length)}
                                            >
                                                {batch.items.map((tx) => (
                                                    <li
                                                        key={tx.id}
                                                        className="truncate rounded bg-slate-50 px-1.5 py-1 text-center font-mono text-xs font-semibold text-slate-600"
                                                    >
                                                        {tx.pallet_id}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </Card>
                            );
                        })}

                        {/* นับ "รายการ" เป็นชุด หน่วยเดียวกับที่เพดาน 50 ของโหมดล่าสุดนับ และเป็น
                            หน่วยเดียวกับที่ผู้ใช้นับได้เองบนจอ (การ์ดละหนึ่ง) ส่วนจำนวนพาเลทเป็นวงเล็บ
                            ต่อท้าย ถ้าทุกชุดมีพาเลทเดียว สองตัวเลขจะเท่ากันและวงเล็บนั้นก็ไม่ได้บอกอะไรเพิ่ม */}
                        <p className="py-3 text-center text-xs text-slate-400">
                            {shownItems === batches.length
                                ? t.history.showing(batches.length)
                                : t.history.showingGrouped(batches.length, shownItems)}
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
};
