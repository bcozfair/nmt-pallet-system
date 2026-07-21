import React from 'react';
import { CheckCircle, XCircle, ArrowRightCircle } from 'lucide-react';
import { useT } from '../../hooks/useT';

interface FeedbackOverlayProps {
    status: 'success' | 'error';
    /** Already-translated: a pallet id on success, a t.scanError.* string otherwise. */
    text: string;
    onDismiss?: () => void;
}

export const FeedbackOverlay: React.FC<FeedbackOverlayProps> = ({ status, text, onDismiss }) => {
    const t = useT();
    return (
        <div className={`fixed inset-0 z-[70] flex items-center justify-center ${status === 'error' ? 'pointer-events-auto bg-black/60 backdrop-blur-sm' : 'pointer-events-none'}`}>
            <div className={`
          px-10 py-8 rounded-3xl shadow-2xl transform transition-all scale-100 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-200
          min-w-[300px] max-w-sm text-center
          ${status === 'success' ? 'bg-green-600/95 text-white' : 'bg-red-600 text-white border-4 border-white/20'}
        `}>
                {status === 'success' ? <CheckCircle size={64} strokeWidth={3} /> : <XCircle size={64} strokeWidth={3} className="animate-bounce" />}
                <div className="text-center">
                    {/* Success shows a pallet id -- monospace-ish, wide tracking reads
                        well. Error shows a sentence, and in Thai wide tracking pushes
                        the combining vowels and tone marks away from their base
                        letters, so it gets normal spacing and a smaller size. */}
                    <span className={`block font-black break-words ${status === 'success' ? 'text-4xl tracking-widest' : 'text-2xl'}`}>
                        {text}
                    </span>
                    <span className="block text-sm font-bold mt-2 opacity-90">
                        {status === 'success' ? t.scanner.addedToList : t.scanner.actionFailed}
                    </span>
                </div>

                {/* Dismiss Button for Errors */}
                {status === 'error' && onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="mt-6 px-8 py-3 bg-white text-red-600 font-black text-lg rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center gap-2"
                    >
                        <ArrowRightCircle size={24} /> {t.scanner.continueScanning}
                    </button>
                )}
            </div>
        </div>
    );
};
