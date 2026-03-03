
import React, { useState, useEffect } from 'react';
import { BadgeCheck, BadgeAlert, BadgeInfo, X } from 'lucide-react';

interface ToastItem {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const id = Date.now();
      setToasts(prev => [...prev, { ...detail, id }]);

      // Auto dismiss
      setTimeout(() => removeToast(id), 4000);
    };

    window.addEventListener('nmt-toast', handleToast);
    return () => window.removeEventListener('nmt-toast', handleToast);
  }, []);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`
            pointer-events-auto flex items-center gap-3 p-4 rounded-xl shadow-lg border animate-toast-in
            ${t.type === 'success' ? 'bg-green-50 border-green-200 text-green-900 shadow-green-100' :
              t.type === 'error' ? 'bg-red-50 border-red-200 text-red-900 shadow-red-100' :
                'bg-blue-50 border-blue-200 text-blue-900 shadow-blue-100'}
          `}
        >
          <div className={`shrink-0 ${t.type === 'success' ? 'text-green-500' :
            t.type === 'error' ? 'text-red-500' : 'text-blue-500'
            }`}>
            {t.type === 'success' && <BadgeCheck size={24} fill="#ffffff" />}
            {t.type === 'error' && <BadgeAlert size={24} fill="#ffffff" />}
            {t.type === 'info' && <BadgeInfo size={24} fill="#ffffff" />}
          </div>
          <p className="font-semibold text-sm flex-1 leading-tight">{t.message}</p>
          <button onClick={() => removeToast(t.id)} className="text-gray-400 hover:text-gray-600 transition">
            <X size={18} />
          </button>
        </div>
      ))}
    </div>
  );
};
