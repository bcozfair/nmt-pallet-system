import React from 'react';
import { CircleCheckBig, QrCode, Trash2, Download, Plus, Package, ArrowRightLeft, Ban } from 'lucide-react';
import { useT } from '../../../hooks/useT';

interface InventoryHeaderProps {
    selectedCount: number;
    selectedIds?: string[];
    onClearSelection: () => void;
    onBulkRepair: () => void;
    onBulkScrap: () => void;
    onBulkDelete: () => void;
    onPrintQrSelected: () => void;
    onPrintQrAll: () => void;
    onExport: () => void;
    onAddPallet: () => void;
    onBulkTransaction: () => void;
    showRepairButton?: boolean;
    showTransactionButton?: boolean;
}


export const InventoryHeader: React.FC<InventoryHeaderProps> = ({
    selectedCount,
    selectedIds = [],
    onClearSelection,
    onBulkRepair,
    onBulkScrap,
    onBulkDelete,
    onPrintQrSelected,
    onPrintQrAll,
    onExport,
    onAddPallet,
    onBulkTransaction,
    showRepairButton = false,
    showTransactionButton = true
}) => {
    const t = useT();
    const [showIds, setShowIds] = React.useState(false);

    return (
        <div className="flex flex-col gap-4 min-h-[48px]">
            {selectedCount > 0 ? (
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col sm:flex-row items-center justify-between w-full bg-blue-50 p-2 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-2 gap-3 shadow-sm">
                        <div className="flex items-center gap-4 px-2">
                            <span className="font-bold text-blue-800 text-lg">{t.inventory.selectedCount(selectedCount)}</span>
                            <div className="flex gap-2">
                                <button onClick={onClearSelection} className="text-sm text-blue-600 hover:text-blue-800 font-semibold hover:underline bg-white/50 px-2 py-1 rounded">{t.common.cancel}</button>
                                <button
                                    onClick={() => setShowIds(!showIds)}
                                    className="text-sm text-blue-600 hover:text-blue-800 font-semibold hover:underline bg-white/50 px-2 py-1 rounded"
                                >
                                    {showIds ? t.inventory.hideIds : t.inventory.showIds}
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                            {/* Same condition gates both: the selection is all
                                damaged pallets, so either resolution applies. */}
                            {showRepairButton && (
                                <>
                                    <button onClick={onBulkRepair} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-bold shadow-sm transition whitespace-nowrap">
                                        <CircleCheckBig size={18} /> {t.action.repair}
                                    </button>
                                    <button onClick={onBulkScrap} className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 font-bold shadow-sm transition whitespace-nowrap">
                                        <Ban size={18} /> {t.inventory.scrap}
                                    </button>
                                </>
                            )}
                            {showTransactionButton && (
                                <button onClick={onBulkTransaction} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-bold shadow-sm transition whitespace-nowrap">
                                    <ArrowRightLeft size={18} /> {t.inventory.transaction}
                                </button>
                            )}
                            <button onClick={onPrintQrSelected} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm font-bold whitespace-nowrap">
                                <QrCode size={18} /> {t.inventory.printQr}
                            </button>
                            <button onClick={onBulkDelete} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-bold shadow-sm transition whitespace-nowrap">
                                <Trash2 size={18} /> {t.common.delete}
                            </button>
                        </div>
                    </div>
                    {showIds && selectedIds.length > 0 && (
                        <div className="bg-white border border-blue-100 rounded-lg p-3 shadow-sm animate-in fade-in slide-in-from-top-1">
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                {[...selectedIds].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).map(id => (
                                    <span key={id} className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                                        {id}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-gray-800 flex items-center gap-2"><Package className="text-blue-600" />{t.inventory.title}</h2>
                        <p className="text-gray-500 text-sm mt-1">{t.inventory.subtitle}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={onExport}
                            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm font-medium whitespace-nowrap"
                        >
                            <Download size={18} /> {t.inventory.exportList}
                        </button>
                        <button
                            onClick={onPrintQrAll}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm font-bold whitespace-nowrap"
                        >
                            <QrCode size={18} /> {t.inventory.printAllQr}
                        </button>

                        <button
                            onClick={onAddPallet}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm font-bold whitespace-nowrap"
                        >
                            <Plus size={18} /> {t.inventory.addPallet}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
