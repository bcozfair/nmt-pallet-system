import React from 'react';
import { ArrowRightCircle, Trash2, Save, MapPin } from 'lucide-react';
import { StagedItem, MobileMode } from './MobileInterface';
import { Department } from '../../types';

interface BatchScanListProps {
    mode: MobileMode;
    pendingScans: StagedItem[];
    selectedDept: Department | null;
    isSubmitting: boolean;
    onRemoveItem: (id: string) => void;
    onConfirm: () => void;
}

export const BatchScanList = ({ mode, pendingScans, selectedDept, isSubmitting, onRemoveItem, onConfirm }: BatchScanListProps) => {
    return (
        <div className="fixed bottom-0 w-full bg-white rounded-t-3xl z-[60] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)] flex flex-col max-h-[40vh]">
            {/* Header */}
            <div className="pt-3 pb-2 px-5 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-3xl shrink-0">
                <div>
                    <h3 className="font-bold text-gray-800 text-lg">
                        {mode === 'checkout_scanning' ? 'Check Out List' : 'Check In List'}
                    </h3>
                    <p className="text-xs text-gray-400 font-medium">
                        {mode === 'checkout_scanning' ? `To: ${selectedDept?.name}` : 'Returning to Warehouse'}
                    </p>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 font-bold rounded-full text-sm">
                    {pendingScans.length}
                </span>
            </div>

            {/* List Area */}
            <div className="overflow-y-auto p-4 space-y-3 min-h-[150px]">
                {pendingScans.length === 0 ? (
                    <div className="text-center text-gray-400 py-8 flex flex-col items-center gap-2">
                        <div className="animate-pulse"><ArrowRightCircle size={32} /></div>
                        <span className="font-medium">Scan QR Codes to add items...</span>
                    </div>
                ) : (
                    pendingScans.map((item, i) => (
                        <div key={item.id} className="flex items-center justify-between px-3 bg-gray-50 rounded-xl border border-gray-100 animate-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center border border-gray-200 text-[10px] font-bold text-gray-500 shadow-sm shrink-0">
                                    {pendingScans.length - i}
                                </div>
                                <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                                    <span className="font-mono font-bold text-gray-800 text-sm whitespace-nowrap">{item.id}</span>
                                    <span className="text-gray-300">|</span>
                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${item.status === 'available' ? 'bg-green-100 text-green-700' :
                                        item.status === 'in_use' ? 'bg-orange-100 text-orange-700' :
                                            'bg-gray-200 text-gray-600'
                                        }`}>
                                        {item.status.replace('_', ' ')}
                                    </span>
                                    <span className="text-gray-300">|</span>
                                    <div className="flex items-center gap-1 text-xs text-gray-500 truncate min-w-0">
                                        <MapPin size={12} className="shrink-0" />
                                        <span className="truncate">{item.location || '-'}</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => onRemoveItem(item.id)} className="text-gray-400 hover:text-red-500 p-2 shrink-0">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Confirm Action */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 pb-8 shrink-0">
                <button
                    onClick={onConfirm}
                    disabled={pendingScans.length === 0 || isSubmitting}
                    className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 text-lg"
                >
                    {isSubmitting ? 'Saving...' : (
                        <>Confirm & Save <Save size={20} /></>
                    )}
                </button>
            </div>
        </div>
    );
};
