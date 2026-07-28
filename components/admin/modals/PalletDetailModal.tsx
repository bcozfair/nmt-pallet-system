import React, { useEffect, useState } from 'react';

import { ActionType, Pallet, Transaction } from '../../../types';
import { fetchUsers } from '../../../services/userService';
import { fetchPalletHistory } from '../../../services/transactionService';
import { formatDate, formatDateTime, StatusBadge } from '../common/AdminHelpers';
import { Clock, History, MapPin, PackageSearch } from 'lucide-react';
import { ImageViewerModal } from '../common/ImageViewerModal';
import { getEvidenceSignedUrlMap, IMAGE_DELETED } from '../../../services/storageService';
import { useT } from '../../../hooks/useT';
import { Button, Modal, StatTile } from '../../ui';

// จุดบนไทม์ไลน์ใช้ token ชุดเดียวกับกราฟบนแดชบอร์ด "เบิกออก" จึงเป็นน้ำเงินเฉด
// เดียวกันทุกที่ในแอป แทนสีดิบ blue/green/gray/red ที่ไฟล์นี้เคยประกอบเอง
//
// กฎ CVD ที่ index.css:62-75 ตั้งไว้ไม่ถูกละเมิด: กฎนั้นห้าม co-plot ทั้งห้าสีโดยมี
// สีเป็นตัวแยกอย่างเดียว แต่ทุกแถวบนไทม์ไลน์มีป้ายข้อความกำกับ (t.action[...])
// สีจึงไม่ได้แบกความหมายลำพัง
//
// `satisfies Record<ActionType, string>` เป็นตัวกันไม่ให้ตกเคส -- ของเดิมเป็นโซ่
// ternary ที่ else สุดท้ายแปลว่า "รายงานความเสียหาย" ทำให้ 'scrap' ถูกทาสีเป็น
// damage อยู่พักหนึ่ง ไทม์ไลน์จึงแสดงรายงานความเสียหายสองครั้งโดยไม่มีร่องรอยว่า
// พาเลทถูกตัดออกจากระบบไปแล้ว
const DOT_COLOR = {
    check_out: 'bg-[var(--color-series-checkout)]',
    check_in: 'bg-[var(--color-series-checkin)]',
    repair: 'bg-[var(--color-series-repair)]',
    scrap: 'bg-[var(--color-series-scrap)]',
    // ชื่อ action คือ `report_damage` (types.ts:39) ส่วน token คือ `series-damage`
    // -- สองชื่อนี้ไม่ตรงกันโดยธรรมชาติ อย่า "แก้" ให้เหมือนกัน
    report_damage: 'bg-[var(--color-series-damage)]',
} satisfies Record<ActionType, string>;

export const PalletDetailModal = ({ pallet, onClose }: { pallet: Pallet, onClose: () => void }) => {
    const t = useT();
    const [history, setHistory] = useState<Transaction[]>([]);
    const [userMap, setUserMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    // The damage_reports bucket is private, so stored values are object names,
    // not renderable URLs. Sign them once per load rather than per <img>.
    const [evidenceUrls, setEvidenceUrls] = useState<Record<string, string>>({});

    useEffect(() => {
        let active = true;

        const loadData = async () => {
            try {
                const [hist, users] = await Promise.all([
                    fetchPalletHistory(pallet.pallet_id),
                    fetchUsers()
                ]);
                if (active) {
                    const map: Record<string, string> = {};
                    users.forEach(u => map[u.id] = u.full_name);
                    setUserMap(map);
                    setHistory(hist);
                    setLoading(false);
                }

                const signed = await getEvidenceSignedUrlMap(hist.map(t => t.evidence_image_url));
                if (active) setEvidenceUrls(signed);
            } catch (e) {
                console.error("Failed to load details", e);
                if (active) setLoading(false);
            }
        };

        loadData();
        return () => { active = false; };
    }, [pallet.pallet_id]);

    const lastTouch = pallet.last_transaction_date || pallet.last_checkout_date;

    return (
        <>
            <Modal
                isOpen
                onClose={onClose}
                // หัวเรื่องเป็นรหัสพาเลท จึงเป็นโมโนและไม่แปล
                title={pallet.pallet_id}
                icon={PackageSearch}
                size="lg"
                dismissOnBackdrop
                busy={loading}
                closeLabel={t.common.closeDialog}
                subtitle={
                    <span className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={pallet.status} />
                        <span>{t.modals.addedOn(formatDate(pallet.created_at))}</span>
                    </span>
                }
                footer={
                    <Button variant="secondary" onClick={onClose}>
                        {t.common.close}
                    </Button>
                }
            >
                <div className="space-y-6">
                    {/* StatTile แทนกล่องที่ไฟล์นี้เคยประกอบเอง -- กล่องขวาของเดิมใช้
                        purple-50/purple-900 ซึ่งเป็นสีที่ไม่มีอยู่ใน @theme ของแอปเลย

                        size="text" ไม่ใช่ค่า default: สองไทล์นี้เป็นข้อความ (ชื่อสถานที่,
                        วันที่, "ไม่เคยใช้งาน") ไม่ใช่ตัวเลขแสดงผล เลย์เอาต์ตัวเลขจะวางค่า
                        ไว้แถวเดียวกับป้ายแบบ shrink-0 คอลัมน์ป้ายจึงยุบจนป้ายไทยล้นออกมา
                        ทับตัวค่า -- ดูคอมเมนต์ของ prop `size` ใน StatTile.tsx */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <StatTile
                            label={t.modals.currentLocation}
                            value={pallet.current_location}
                            icon={MapPin}
                            tone="brand"
                            size="text"
                        />
                        {/* last_transaction_date ไม่ใช่ last_checkout_date: ทุกทางเขียนที่
                            ไม่ใช่การเบิกออกจะล้าง last_checkout_date เป็น null
                            (transactionService.ts:229, 344, 410, 517) พาเลทที่รับคืนแล้ว
                            จึงขึ้นว่า "ไม่เคยใช้งาน" ทั้งที่ไทม์ไลน์ข้างล่างมีรายการเต็มไปหมด
                            ป้ายคือ "ทำรายการล่าสุด" ฟิลด์ที่ตรงกับป้ายจึงเป็นตัวแรก

                            ยังกลับไปอ่าน last_checkout_date ต่อ (สำนวนเดียวกับ
                            dashboardAnalytics.ts:691) เพราะแถวที่สร้างก่อนจะมีคอลัมน์
                            last_transaction_date จะไม่มีค่าในคอลัมน์นั้น แต่ไม่ตกไปถึง
                            created_at -- วันที่สร้างอยู่บนหัวโมดัลอยู่แล้ว การเอามาใส่ตรงนี้
                            จะกลายเป็นพาเลทที่ไม่เคยถูกใช้เลยดูเหมือนเพิ่งทำรายการไป */}
                        <StatTile
                            label={t.modals.lastInteraction}
                            value={lastTouch ? formatDate(lastTouch) : t.modals.never}
                            icon={Clock}
                            tone="accent"
                            size="text"
                        />
                    </div>

                    <div>
                        <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
                            <History size={18} aria-hidden="true" /> {t.modals.activityHistory}
                        </h3>

                        {loading ? (
                            <div className="py-8 text-center text-slate-400">{t.modals.loadingHistory}</div>
                        ) : history.length === 0 ? (
                            <div className="rounded-xl bg-slate-50 py-8 text-center italic text-slate-400">
                                {t.modals.noHistory}
                            </div>
                        ) : (
                            <div className="relative ml-3 space-y-6 border-l-2 border-slate-100 pb-2">
                                {history.map((tx) => (
                                    <div key={tx.id} className="relative pl-6">
                                        <div
                                            data-testid="timeline-dot"
                                            className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white shadow-sm ${DOT_COLOR[tx.action_type]}`}
                                            aria-hidden="true"
                                        />

                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-800">
                                                    {t.action[tx.action_type]}
                                                </p>
                                                <p className="mt-0.5 text-xs text-slate-500">
                                                    {t.modals.by}{' '}
                                                    <span className="font-medium text-slate-700">
                                                        {userMap[tx.user_id] || t.modals.unknownUser(tx.user_id)}
                                                    </span>
                                                    {tx.department_dest && (
                                                        <span>
                                                            {' '}• {t.modals.toDest}{' '}
                                                            <span className="font-medium text-slate-700">
                                                                {tx.department_dest}
                                                            </span>
                                                        </span>
                                                    )}
                                                </p>
                                                {tx.transaction_remark && (
                                                    <div className="mt-1.5 rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs italic text-slate-600">
                                                        "{tx.transaction_remark}"
                                                    </div>
                                                )}

                                                {tx.evidence_image_url &&
                                                    tx.evidence_image_url !== IMAGE_DELETED &&
                                                    evidenceUrls[tx.evidence_image_url] && (
                                                        <div className="mt-2">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setPreviewImage(evidenceUrls[tx.evidence_image_url!])
                                                                }
                                                                className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                                                            >
                                                                {/* ปุ่มจริง ไม่ใช่ <img onClick> -- ของเดิมกดได้ด้วย
                                                                    เมาส์อย่างเดียว คีย์บอร์ดเข้าไม่ถึงรูปหลักฐานเลย */}
                                                                <img
                                                                    src={evidenceUrls[tx.evidence_image_url]}
                                                                    alt={t.modals.evidenceAlt}
                                                                    className="h-20 w-auto rounded-lg border border-slate-200 shadow-sm transition hover:scale-105"
                                                                />
                                                            </button>
                                                        </div>
                                                    )}
                                                {tx.evidence_image_url === IMAGE_DELETED && (
                                                    <div className="mt-2 flex items-center gap-1 text-xs italic text-slate-400">
                                                        {t.modals.evidenceDeleted}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="shrink-0 whitespace-nowrap font-mono text-xs text-slate-400">
                                                {formatDateTime(tx.timestamp)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* นอก <Modal> ข้างบน ไม่ใช่ข้างใน: มันเป็นโมดัลของตัวเอง ที่ portal ไป
                document.body เหมือนกัน การซ้อนมันไว้ในเนื้อจะทำให้ focus trap ของ
                ตัวนอกนับปุ่มในตัวในเป็นของตัวเองด้วย */}
            <ImageViewerModal
                src={previewImage}
                onClose={() => setPreviewImage(null)}
            />
        </>
    );
};
