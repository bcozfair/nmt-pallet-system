import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle, X, Save, FileText, PackagePlus } from 'lucide-react';
import { createPallet } from '../../../services/palletService';
import { toast } from '../../../services/toast';

import { Department } from '../../../types';

interface AddPalletModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    departments: Department[];
}

export const AddPalletModal: React.FC<AddPalletModalProps> = ({ isOpen, onClose, onSuccess, departments }) => {
    const [newId, setNewId] = useState('');
    const [newLocation, setNewLocation] = useState('Warehouse');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAddPallet = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await createPallet(newId, newLocation);
            toast.success(`Pallet ${newId} created successfully.`);
            setNewId('');
            // Reset to default
            setNewLocation('Warehouse');
            onSuccess();
            onClose();
        } catch (error: any) {
            const msg = error instanceof Error ? error.message : "Error creating pallet. ID might already exist.";
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                        <PackagePlus className="text-blue-600" size={20} />Add New Pallet
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleAddPallet} className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Pallet ID (e.g., P105)</label>
                        <input
                            required
                            autoFocus
                            className="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm uppercase font-mono"
                            value={newId}
                            onChange={(e) => setNewId(e.target.value.toUpperCase())}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Initial Location</label>
                        <div className="relative">
                            <select
                                className="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white text-sm"
                                value={newLocation}
                                onChange={(e) => setNewLocation(e.target.value)}
                            >
                                <option value="Warehouse">Warehouse</option>
                                {departments
                                    .filter(d => d.name !== 'Warehouse')
                                    .map(d => (
                                        <option key={d.id} value={d.name}>{d.name}</option>
                                    ))
                                }
                            </select>
                        </div>
                    </div>
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Pallet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export type ConfirmActionType = {
    title: string;
    message: string;
    confirmLabel: string;
    isDestructive?: boolean;
    onConfirm: () => Promise<void>;
};

interface ConfirmModalProps {
    action: ConfirmActionType | null;
    onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ action, onClose }) => {
    if (!action) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200 overflow-hidden transform">
                <div className="p-6">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${action.isDestructive ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        {action.isDestructive ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{action.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                        {action.message}
                    </p>
                </div>
                <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white text-gray-700 font-bold rounded-lg hover:bg-gray-100 border border-gray-200 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={async () => {
                            await action.onConfirm();
                            onClose();
                        }}
                        className={`px-4 py-2 text-white font-bold rounded-lg shadow-sm transition ${action.isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {action.confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

interface EditPalletModalProps {
    isOpen: boolean;
    pallet: { id: string; remark: string };
    onClose: () => void;
    onSave: (id: string, updates: { pallet_id: string; pallet_remark: string }) => Promise<void>;
}

export const EditPalletModal: React.FC<EditPalletModalProps> = ({ isOpen, pallet, onClose, onSave }) => {
    const [id, setId] = useState(pallet.id);
    const [remark, setRemark] = useState(pallet.remark);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset state when pallet changes
    React.useEffect(() => {
        if (isOpen) {
            setId(pallet.id);
            setRemark(pallet.remark);
        }
    }, [isOpen, pallet]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSave(pallet.id, { pallet_id: id, pallet_remark: remark });
            onClose();
        } catch (error) {
            console.error(error);
            // Error handling usually done in parent
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <h3 className="font-bold text-gray-800 text-lg">Edit Pallet Details</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition text-gray-500 hover:text-gray-700">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            Pallet ID
                        </label>
                        <input
                            required
                            className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none uppercase font-mono bg-white text-gray-900 transition"
                            value={id}
                            onChange={(e) => setId(e.target.value.toUpperCase())}
                        />
                        <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                            <AlertTriangle size={12} />
                            Warning: Changing ID will update history references.
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <FileText size={16} className="text-orange-500" /> Remark
                        </label>
                        <textarea
                            rows={3}
                            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none bg-white text-gray-900 resize-none transition"
                            placeholder="Add notes about this pallet..."
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
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
        </div>,
        document.body
    );
};
