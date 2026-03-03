import React, { useState } from 'react';
import { AlertTriangle, Upload, Info, Keyboard } from 'lucide-react';
import { reportDamage } from '../../services/transactionService';
import { toast } from '../../services/toast';
import { compressImage } from '../../utils/imageCompression';

interface DamageFormProps {
    palletId: string;
    userId: string;
    onSuccess: () => void;
    onCancel: () => void;
}

export const DamageForm = ({ palletId, userId, onSuccess, onCancel }: DamageFormProps) => {
    const [damageFile, setDamageFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const submitReports = async () => {
        if (!palletId) return;
        setIsSubmitting(true);
        try {
            await reportDamage(palletId, userId, damageFile);
            toast.success(`Damage reported for ${palletId}`);
            onSuccess();
        } catch (e) {
            toast.error('Failed to submit damage report');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 h-[100dvh] w-full bg-white flex flex-col overflow-hidden z-[100]">
            <div className="p-4 bg-red-600 text-white font-bold text-lg flex items-center gap-2 shrink-0 shadow-sm">
                <AlertTriangle /> Report Damage: {palletId}
            </div>

            <div className="flex-1 flex flex-col p-4 gap-4 min-h-0 overflow-hidden">
                <div className="flex-1 border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-gray-500 bg-gray-50 relative min-h-0 overflow-hidden">
                    {damageFile ? (
                        <div className="text-center w-full h-full flex flex-col items-center justify-center">
                            <div className="flex-1 w-full min-h-0 relative mb-4">
                                <img
                                    src={URL.createObjectURL(damageFile)}
                                    alt="Evidence"
                                    className="absolute inset-0 w-full h-full object-contain rounded shadow bg-black/5"
                                />
                            </div>
                            <button onClick={() => setDamageFile(null)} className="shrink-0 text-red-500 font-medium px-4 py-2 border border-red-200 rounded-lg bg-white hover:bg-red-50 transition">
                                Remove Photo
                            </button>
                        </div>
                    ) : (
                        <>
                            <Upload className="w-12 h-12 mb-2 text-gray-400" />
                            <p className="mb-4">Upload evidence photo</p>
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={async (e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        try {
                                            toast.success('Compressing image...');
                                            const compressed = await compressImage(e.target.files[0]);
                                            setDamageFile(compressed);
                                        } catch (err) {
                                            console.error("Compression failed", err);
                                            // Fallback to original
                                            setDamageFile(e.target.files[0]);
                                        }
                                    }
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold pointer-events-none">
                                Open Camera
                            </div>
                        </>
                    )}
                </div>

                <div className="flex flex-col gap-3 shrink-0">
                    <button
                        disabled={!damageFile || isSubmitting}
                        onClick={submitReports}
                        className="w-full py-4 bg-red-600 text-white rounded-xl font-bold text-lg shadow-lg disabled:opacity-50 disabled:shadow-none transition active:scale-[0.98]"
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Report'}
                    </button>
                    <button
                        onClick={onCancel}
                        className="w-full py-4 bg-gray-200 text-gray-700 rounded-xl font-bold active:scale-[0.98] transition"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

interface DamageManualEntryProps {
    onSubmit: (id: string) => void;
}

export const DamageManualEntry: React.FC<DamageManualEntryProps> = ({ onSubmit }) => {
    return (
        <div className="fixed bottom-0 w-full bg-white rounded-t-3xl z-[60] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)] p-6 pb-10 flex flex-col gap-4 animate-in slide-in-from-bottom-5 max-h-[50vh]">
            <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 shadow-sm shrink-0">
                    <AlertTriangle size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-gray-800 text-lg">Report Damage</h3>
                    <p className="text-sm text-gray-500">Scan QR code to identify pallet</p>
                </div>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3">
                <Info size={20} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 leading-snug">
                    If the QR code is damaged or unreadable, you can enter the ID manually below.
                </p>
            </div>

            <button
                onClick={() => {
                    const id = prompt("Enter Pallet ID Manually (e.g., P001):");
                    if (id && id.trim().length > 0) onSubmit(id.trim());
                }}
                className="w-full py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition flex items-center justify-center gap-2 active:scale-[0.98] mt-auto"
            >
                <Keyboard size={20} /> Enter ID Manually
            </button>
        </div>
    );
};
