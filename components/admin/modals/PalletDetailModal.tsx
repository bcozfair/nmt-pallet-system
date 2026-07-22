import React, { useEffect, useState } from 'react';

import { Pallet, Transaction } from '../../../types';
import { fetchUsers } from '../../../services/userService';
import { fetchPalletHistory } from '../../../services/transactionService';
import { formatDate, formatDateTime, StatusBadge } from '../common/AdminHelpers';
import { X, MapPin, Clock, History } from 'lucide-react';
import { ImageViewerModal } from '../common/ImageViewerModal';
import { getEvidenceSignedUrlMap, IMAGE_DELETED } from '../../../services/storageService';
import { useT } from '../../../hooks/useT';

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col relative z-10 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50 rounded-t-2xl">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-mono font-bold text-gray-800 tracking-tight">{pallet.pallet_id}</h2>
                            <StatusBadge status={pallet.status} />
                        </div>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                            {t.modals.addedOn(formatDate(pallet.created_at))}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-full border border-gray-200 transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="overflow-y-auto p-6 space-y-8 styled-scrollbar">
                    {/* Key Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                            <p className="text-xs font-bold text-blue-400 mb-1">{t.modals.currentLocation}</p>
                            <div className="flex items-center gap-2 text-blue-900 font-bold text-lg">
                                <MapPin size={20} className="text-blue-500" />
                                {pallet.current_location}
                            </div>
                        </div>
                        <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                            <p className="text-xs font-bold text-purple-400 mb-1">{t.modals.lastInteraction}</p>
                            <div className="flex items-center gap-2 text-purple-900 font-bold text-lg">
                                <Clock size={20} className="text-purple-500" />
                                {pallet.last_checkout_date ? formatDate(pallet.last_checkout_date) : t.modals.never}
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div>
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <History size={18} /> {t.modals.activityHistory}
                        </h3>

                        {loading ? (
                            <div className="text-center py-8 text-gray-400">{t.modals.loadingHistory}</div>
                        ) : history.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 italic bg-gray-50 rounded-xl">{t.modals.noHistory}</div>
                        ) : (
                            <div className="relative border-l-2 border-gray-100 ml-3 space-y-6 pb-2">
                                {history.map((tx, idx) => (
                                    <div key={tx.id} className="relative pl-6">
                                        {/* Dot */}
                                        {/* 'scrap' needs its own arm here. The final
                                            `else` means "damage report", so without it
                                            a scrap row took the damage colour -- the
                                            timeline would show two damage reports and
                                            no sign the pallet had been written off at
                                            all. The label below used to repeat this
                                            same chain and carried the same bug; it now
                                            reads `action` from the dictionary, which is
                                            `satisfies Record<ActionType, string>` and
                                            so cannot miss a case by construction. */}
                                        <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${tx.action_type === 'check_out' ? 'bg-blue-500' :
                                            tx.action_type === 'check_in' || tx.action_type === 'repair' ? 'bg-green-500' :
                                                tx.action_type === 'scrap' ? 'bg-gray-500' :
                                                    'bg-red-500'
                                            }`}></div>

                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-gray-800 text-sm">
                                                    {t.action[tx.action_type]}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {t.modals.by} <span className="font-medium text-gray-700">{userMap[tx.user_id] || t.modals.unknownUser(tx.user_id)}</span>
                                                    {tx.department_dest && <span> • {t.modals.toDest} <span className="font-medium text-gray-700">{tx.department_dest}</span></span>}
                                                </p>
                                                {tx.transaction_remark && (
                                                    <div className="mt-1.5 p-2 bg-gray-50 rounded-lg text-xs text-gray-600 border border-gray-100 italic">
                                                        "{tx.transaction_remark}"
                                                    </div>
                                                )}

                                                {/* Evidence Image */}
                                                {tx.evidence_image_url && tx.evidence_image_url !== IMAGE_DELETED && evidenceUrls[tx.evidence_image_url] && (
                                                    <div className="mt-2">
                                                        <img
                                                            src={evidenceUrls[tx.evidence_image_url]}
                                                            alt={t.modals.evidenceAlt}
                                                            className="h-20 w-auto rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:scale-105 transition"
                                                            onClick={() => setPreviewImage(evidenceUrls[tx.evidence_image_url!])}
                                                        />
                                                    </div>
                                                )}
                                                {tx.evidence_image_url === IMAGE_DELETED && (
                                                    <div className="mt-2 text-xs text-gray-400 italic flex items-center gap-1">
                                                        {t.modals.evidenceDeleted}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-xs font-mono text-gray-400 whitespace-nowrap">
                                                {formatDateTime(tx.timestamp)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-white border border-gray-300 shadow-sm text-gray-700 font-bold rounded-lg hover:bg-gray-100 transition">
                        {t.common.close}
                    </button>
                </div>
            </div>

            {/* Image Preview Modal */}
            <ImageViewerModal
                src={previewImage}
                onClose={() => setPreviewImage(null)}
            />
        </div>
    );
};
