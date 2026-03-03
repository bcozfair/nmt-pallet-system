import React, { useState, useEffect } from 'react';
import { X, Save, MapPinPlus } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface LocationModalProps extends ModalProps {
    initialValue?: string;
    onSave: (name: string) => Promise<void>;
    mode: 'add' | 'edit';
}

export const LocationModal: React.FC<LocationModalProps> = ({
    isOpen,
    onClose,
    initialValue = '',
    onSave,
    mode
}) => {
    const [name, setName] = useState(initialValue);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setName(initialValue);
    }, [initialValue, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        try {
            await onSave(name);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                        <MapPinPlus className="text-blue-600" size={20} />
                        {mode === 'add' ? 'Add Location' : 'Edit Location'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">
                            Location Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            autoFocus
                            type="text"
                            placeholder="e.g., Warehouse A"
                            className="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            Names must be unique and descriptive.
                        </p>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={!name.trim() || isSubmitting}
                            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            <Save size={18} />
                            {isSubmitting ? 'Saving...' : 'Save Location'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
