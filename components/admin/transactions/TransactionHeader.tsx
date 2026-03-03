import React from 'react';
import { History, Trash2, Download } from 'lucide-react';

interface TransactionHeaderProps {
    onCleanup: () => void;
    onExport: () => void;
}

export const TransactionHeader: React.FC<TransactionHeaderProps> = ({
    onCleanup,
    onExport
}) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h2 className="text-3xl font-black text-gray-800 flex items-center gap-2 tracking-tight">
                    <History className="text-blue-600" /> Transaction Management
                </h2>
                <p className="text-gray-500 text-sm mt-1">View full history of check-ins, check-outs, and repairs.</p>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={onCleanup}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-bold shadow-sm transition"
                >
                    <Trash2 size={18} /> Cleanup Data
                </button>
                <button
                    onClick={onExport}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-bold shadow-sm transition"
                >
                    <Download size={18} /> Export CSV
                </button>
            </div>
        </div>
    );
};
