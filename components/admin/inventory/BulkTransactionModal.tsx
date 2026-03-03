import React, { useState } from 'react';
import { X, CheckCircle, ArrowRightLeft } from 'lucide-react';
import { Department } from '../../../types';

interface BulkTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (
        action: 'check_out' | 'check_in',
        destination: string,
        remark: string,
        timestamp: string
    ) => Promise<void>;
    selectedCount: number;
    selectedIds: string[];
    departments: Department[];
}

export const BulkTransactionModal: React.FC<BulkTransactionModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    selectedCount,
    selectedIds,
    departments
}) => {
    const [action, setAction] = useState<'check_out' | 'check_in'>('check_out');
    const [destination, setDestination] = useState('');
    const [remark, setRemark] = useState('');
    const [showIds, setShowIds] = useState(false);

    // Split Date and Time for better UX and control
    const [dateStr, setDateStr] = useState(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });

    const [timeStr, setTimeStr] = useState(() => {
        const now = new Date();
        return now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    });

    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Construct timestamp from separate date/time inputs
            // We create a Date object in the browser's local timezone
            const combinedDate = new Date(`${dateStr}T${timeStr}`);
            // Convert to ISO string (UTC) to send to backend
            const isoTimestamp = combinedDate.toISOString();

            await onConfirm(action, destination, remark, isoTimestamp);
            onClose();
        } catch (error) {
            console.error("Bulk transaction failed", error);
            // Error handling usually done in parent via toast
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
                    <div>
                        <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                            <ArrowRightLeft className="text-blue-600" size={24} />
                            Create Transaction
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Processing <span className="font-bold text-blue-600">{selectedCount}</span> selected pallets.
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowIds(!showIds)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold mt-1 hover:underline focus:outline-none"
                        >
                            {showIds ? 'Hide IDs' : 'Show IDs'}
                        </button>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-2 hover:bg-gray-100 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                {showIds && (
                    <div className="px-6 py-2 bg-blue-50/50 border-b border-blue-100 overflow-y-auto max-h-32 shrink-0">
                        <div className="flex flex-wrap gap-2">
                            {[...selectedIds].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).map(id => (
                                <span key={id} className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded-md">
                                    {id}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-5 space-y-3 overflow-y-auto">
                    {/* Action & Destination Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Action</label>
                            <div className="flex bg-gray-100 p-0.5 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setAction('check_out')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${action === 'check_out' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Check Out
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAction('check_in')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${action === 'check_in' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Check In
                                </button>
                            </div>
                        </div>

                        {/* Destination (Only for Check Out, otherwise placeholder or empty) */}
                        <div className={action === 'check_out' ? 'animate-in fade-in zoom-in-95 duration-200' : 'invisible'}>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Destination <span className="text-red-500">*</span></label>
                            <select
                                value={destination}
                                onChange={(e) => setDestination(e.target.value)}
                                required={action === 'check_out'}
                                className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition font-medium text-sm"
                            >
                                <option value="">Select Location</option>
                                {departments.filter(d => d.is_active).map(d => (
                                    <option key={d.id} value={d.name}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Transaction Date & Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Date</label>
                            <div className="relative group/date">
                                <input
                                    type="text"
                                    readOnly
                                    className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition font-medium cursor-pointer text-sm"
                                    value={dateStr ? dateStr.split('-').reverse().join('/') : ''}
                                />
                                <input
                                    type="date"
                                    required
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                    value={dateStr}
                                    onChange={(e) => setDateStr(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Time</label>
                            <input
                                type="time"
                                required
                                value={timeStr}
                                onChange={(e) => setTimeStr(e.target.value)}
                                className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition font-medium text-sm"
                            />
                        </div>
                    </div>

                    {/* Remark */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Remark</label>
                        <textarea
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                            placeholder="Optional note..."
                            rows={2}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition font-medium resize-none text-sm"
                        />
                    </div>

                    <div className="pt-2 flex justify-end gap-3 border-t border-gray-100 mt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm transition text-sm ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <span className="animate-pulse">Processing...</span>
                            ) : (
                                <>
                                    <CheckCircle size={16} />
                                    Confirm
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
