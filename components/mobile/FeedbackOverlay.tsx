import React from 'react';
import { CheckCircle, XCircle, ArrowRightCircle } from 'lucide-react';

interface FeedbackOverlayProps {
    status: 'success' | 'error';
    text: string;
    onDismiss?: () => void;
}

export const FeedbackOverlay: React.FC<FeedbackOverlayProps> = ({ status, text, onDismiss }) => {
    return (
        <div className={`fixed inset-0 z-[70] flex items-center justify-center ${status === 'error' ? 'pointer-events-auto bg-black/60 backdrop-blur-sm' : 'pointer-events-none'}`}>
            <div className={`
          px-10 py-8 rounded-3xl shadow-2xl transform transition-all scale-100 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-200
          min-w-[300px] max-w-sm text-center
          ${status === 'success' ? 'bg-green-600/95 text-white' : 'bg-red-600 text-white border-4 border-white/20'}
        `}>
                {status === 'success' ? <CheckCircle size={64} strokeWidth={3} /> : <XCircle size={64} strokeWidth={3} className="animate-bounce" />}
                <div className="text-center">
                    <span className="block text-4xl font-black tracking-widest">{text}</span>
                    <span className="block text-sm uppercase font-bold mt-2 opacity-90 tracking-wide">
                        {status === 'success' ? 'Added to List' : 'Action Failed'}
                    </span>
                </div>

                {/* Dismiss Button for Errors */}
                {status === 'error' && onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="mt-6 px-8 py-3 bg-white text-red-600 font-black text-lg rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center gap-2"
                    >
                        <ArrowRightCircle size={24} /> CONTINUE SCANNING
                    </button>
                )}
            </div>
        </div>
    );
};
