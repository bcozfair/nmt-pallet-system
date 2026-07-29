import React from 'react';
import { CheckCircle, XCircle, ArrowRightCircle } from 'lucide-react';
import { useT } from '../../hooks/useT';
import { Button } from '../ui/Button';

interface FeedbackOverlayProps {
    status: 'success' | 'error';
    /** Already-translated: a pallet id on success, a t.scanError.* string otherwise. */
    text: string;
    onDismiss?: () => void;
}

export const FeedbackOverlay: React.FC<FeedbackOverlayProps> = ({ status, text, onDismiss }) => {
    const t = useT();
    const isError = status === 'error';

    return (
        <div
            // z-[70] คือชั้นบนสุดของกองหน้าจอสแกน (กล้อง 50 / แผ่นล่าง 60 / ตัวนี้ 70)
            className={
                'fixed inset-0 z-[70] flex items-center justify-center ' +
                (isError ? 'pointer-events-auto bg-black/60 backdrop-blur-sm' : 'pointer-events-none')
            }
        >
            <div
                // role และ aria-live: ก่อนหน้านี้ผลการสแกนเป็นข้อความที่โผล่มาเฉย ๆ
                // screen reader ไม่ได้ยินอะไรเลยไม่ว่าสแกนติดหรือพลาด
                // alert = ขัดจังหวะทันที (ความผิดพลาดต้องหยุดมือคนสแกน)
                // status = รอจังหวะว่าง (สำเร็จไม่ต้องขัด)
                role={isError ? 'alert' : 'status'}
                aria-live={isError ? 'assertive' : 'polite'}
                className={
                    'flex min-w-[300px] max-w-sm flex-col items-center gap-4 rounded-3xl px-10 py-8 ' +
                    'text-center shadow-2xl animate-pop-in ' +
                    (isError
                        ? 'border-4 border-white/20 bg-red-600 text-white'
                        : 'bg-green-600/95 text-white')
                }
            >
                {isError ? (
                    <XCircle size={64} strokeWidth={3} aria-hidden="true" />
                ) : (
                    <CheckCircle size={64} strokeWidth={3} aria-hidden="true" />
                )}

                <div className="text-center">
                    {/* สำเร็จแสดงรหัสพาเลท -- ตัวโต ระยะห่างกว้าง อ่านง่ายในระยะแขน
                        ผิดพลาดแสดงประโยค และ tracking กว้างในภาษาไทยจะดันสระกับ
                        วรรณยุกต์ออกจากตัวอักษรฐาน จึงได้ระยะห่างปกติและขนาดเล็กกว่า */}
                    <span
                        className={
                            'block break-words font-black ' +
                            (isError ? 'text-2xl' : 'text-4xl tracking-widest')
                        }
                    >
                        {text}
                    </span>
                    <span className="mt-2 block text-sm font-bold opacity-90">
                        {isError ? t.scanner.actionFailed : t.scanner.addedToList}
                    </span>
                </div>

                {isError && onDismiss && (
                    <Button
                        variant="inverse"
                        size="lg"
                        icon={ArrowRightCircle}
                        onClick={onDismiss}
                        className="mt-2 rounded-full text-red-600"
                    >
                        {t.scanner.continueScanning}
                    </Button>
                )}
            </div>
        </div>
    );
};
