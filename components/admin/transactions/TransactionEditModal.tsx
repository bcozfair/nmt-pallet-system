import React, { useState, useEffect } from 'react';
import { X, Save, MapPin, FileText, Calendar } from 'lucide-react';
import { Transaction, Department } from '../../../types';
import { formatDateTime } from '../common/AdminHelpers';

interface TransactionEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string, updates: { department_dest?: string, transaction_remark?: string }) => Promise<void>;
    transaction: Transaction | null;
    departments: Department[];
}

export const TransactionEditModal: React.FC<TransactionEditModalProps> = ({
    isOpen,
    onClose,
    onSave,
    transaction,
    departments
}) => {
    const [location, setLocation] = useState('');
    const [remark, setRemark] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (transaction) {
            setLocation(transaction.department_dest || '');
            setRemark(transaction.transaction_remark || '');
        }
    }, [transaction]);

    if (!isOpen || !transaction) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSave(transaction.id, {
                department_dest: location,
                transaction_remark: remark
            });
            onClose();
        } catch (error) {
            console.error("Failed to update transaction", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <h3 className="font-bold text-gray-800 text-lg">Edit Transaction</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition text-gray-500 hover:text-gray-700">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Read-Only Info */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <span className="text-xs text-gray-400 font-bold uppercase block mb-1">Pallet ID</span>
                            <span className="font-mono font-bold text-gray-700">{transaction.pallet_id}</span>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <span className="text-xs text-gray-400 font-bold uppercase block mb-1">Date (Read Only)</span>
                            <div className="flex items-center gap-1 text-sm font-medium text-gray-600">
                                <Calendar size={14} />
                                {formatDateTime(transaction.timestamp)}
                            </div>
                        </div>
                    </div>

                    {/* Location Edit */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <MapPin size={16} className="text-blue-500" /> Location / Destination
                        </label>
                        <select
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition bg-white"
                        >
                            <option value="">(No Location)</option>
                            {departments.map(d => (
                                <option key={d.id} value={d.name}>{d.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-blue-500/80 mt-1 pl-1">
                            * Note: Updating the latest transaction will verify & sync the Pallet's location.
                        </p>
                    </div>

                    {/* Remarks Edit */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <FileText size={16} className="text-orange-500" /> Remarks / Notes
                        </label>
                        <textarea
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                            placeholder="Add reason for edit or extra details..."
                            className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-100 focus:border-orange-400 outline-none transition min-h-[100px] text-sm"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            <Save size={18} />
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
