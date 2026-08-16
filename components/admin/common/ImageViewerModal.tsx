import React, { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-react';
import { useT } from '../../../hooks/useT';
import { Button, Modal } from '../../ui';

interface ImageViewerModalProps {
    src: string | null;
    onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ src, onClose }) => {
    // `Modal` เป็นตัวคุมว่าเรนเดอร์ไหมผ่าน isOpen={!!src} ข้างล่าง -- ไฟล์นี้เอง
    // ไม่มี early return ก่อนหน้านี้อีกแล้ว hook ทั้งหมดจึงเรียกลำดับเดิมทุกรอบ
    const t = useT();
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // Reset scale and position when opening a new image
    useEffect(() => {
        if (src) {
            setScale(1);
            setPosition({ x: 0, y: 0 });
        }
    }, [src]);

    const handleZoomIn = (e: React.MouseEvent) => {
        e.stopPropagation();
        setScale(prev => Math.min(prev + 0.25, 3));
    };

    const handleZoomOut = (e: React.MouseEvent) => {
        e.stopPropagation();
        setScale(prev => Math.max(prev - 0.25, 0.5));
    };

    const handleReset = (e: React.MouseEvent) => {
        e.stopPropagation();
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!src) return;

        try {
            const response = await fetch(src);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            // Extract filename from URL or default
            const filename = src.split('/').pop()?.split('?')[0] || 'evidence-image.jpg';
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
            // Fallback
            window.open(src, '_blank');
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        // stopPropagation เฉย ๆ ไม่เรียก preventDefault: React synthetic wheel event
        // เป็น passive listener จึง preventDefault ไม่มีผล (เบราว์เซอร์เตือนใน
        // console เฉย ๆ ถ้าเรียก) แต่ก็ไม่จำเป็นต้องกันจริง -- Modal ล็อก scroll
        // ของพื้นหลังเองอยู่แล้วผ่าน lockScroll/unlockScroll (Modal.tsx) ตอนกล่องนี้
        // เปิด ล้อเมาส์เหนือรูปจึงซูมภาพในนี้เท่านั้น ไม่มีอะไรให้เลื่อนอยู่ข้างหลัง
        e.stopPropagation();

        const delta = e.deltaY;
        if (delta < 0) {
            // Scroll Up -> Zoom In
            setScale(prev => Math.min(prev + 0.1, 3));
        } else {
            // Scroll Down -> Zoom Out
            setScale(prev => Math.max(prev - 0.1, 0.5));
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        e.stopPropagation();
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    return (
        <Modal
            isOpen={!!src}
            onClose={onClose}
            title={t.modals.previewAlt}
            size="square"
            // ชั้นสองจริง ๆ: กล่องนี้เปิดทับ PalletDetailModal เสมอ ค่านี้ทำให้มัน
            // ได้ z-[60] และเป็นตัวที่กิน Escape ก่อน ของเดิมไม่มี Escape เลย
            level={2}
            dismissOnBackdrop
            closeLabel={t.common.closeDialog}
            headerActions={
                <>
                    <Button
                        size="sm"
                        variant="secondary"
                        icon={ZoomOut}
                        onClick={handleZoomOut}
                        aria-label={t.modals.zoomOut}
                        disabled={scale <= 0.5}
                    />
                    {/* เลขนี้เปลี่ยนทุกครั้งที่ซูม -- เป็นตัวหนังสือในตัว span ตรง ๆ
                        ไม่ประกอบเข้าไปในคลาส เพดานความหนาคือ font-semibold
                        (ห้าม font-black) tabular-nums กันเลขสั่นตอนหลักเปลี่ยน */}
                    <span className="w-10 select-none text-center text-xs font-semibold tabular-nums text-slate-500">
                        {Math.round(scale * 100)}%
                    </span>
                    <Button
                        size="sm"
                        variant="secondary"
                        icon={ZoomIn}
                        onClick={handleZoomIn}
                        aria-label={t.modals.zoomIn}
                        disabled={scale >= 3}
                    />
                    <Button size="sm" variant="secondary" icon={RotateCcw} onClick={handleReset} aria-label={t.modals.resetZoom} />
                    <Button size="sm" variant="secondary" icon={Download} onClick={handleDownload} aria-label={t.modals.downloadImage} />
                </>
            }
        >
            {/* จัตุรัส 1:1 -- `aspect-square` คู่กับ size="square" ของ Modal: ตัวหลัง
                คุมความกว้างกล่องให้ไม่เกินความสูงที่จอเหลือ ตัวนี้จึงได้ความสูงเท่ากับ
                ความกว้างเสมอโดยไม่ทะลุ max-h-[90vh] ของ panel (ถ้าใช้ size="xl" เดิม
                กล่องจะกว้าง 896px แล้วจัตุรัสสูง 896px ไม่พอดีจอเตี้ย)

                ยังต้องเป็นความสูงที่ "ชี้ขาด" เหมือนตอนเป็น h-[70vh] ด้วยเหตุผลเดิม:
                `max-h-full` ของ <img> คิดจากความสูงของกล่องแม่ ถ้ากล่องแม่มีแค่ความสูง
                ขั้นต่ำ (min-h-*) เบราว์เซอร์ตีความ max-height เปอร์เซ็นต์เป็น none รูป
                จากมือถือที่สูง 3000px จะเรนเดอร์เต็มขนาดจริงแล้วถูก overflow-hidden ตัด
                หัวตัดท้าย -- aspect-square ให้ความสูงที่คำนวณจากความกว้าง จึงชี้ขาด
                เหมือนกัน max-h-full/max-w-full + object-contain ย่อรูปให้พอดีกรอบตั้งแต่
                scale 1 ค่าเริ่มต้นคือเห็นเต็มรูป ปุ่มขยายมีไว้ซูมดูรอยชำรุดทีหลัง */}
            <div
                className="-mx-5 -mb-5 flex aspect-square items-center justify-center overflow-hidden bg-slate-950"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <img
                    src={src as string}
                    alt={t.modals.evidenceAlt}
                    draggable={false}
                    // ค่าที่คำนวณตอนรันไทม์ต้องไปทาง style ไม่ใช่คลาสที่ประกอบเป็น
                    // สตริง -- Tailwind สแกนแต่ข้อความในซอร์ส
                    // ลำดับสำคัญ: translate มาก่อน scale
                    //
                    // ของเดิมเป็น scale() แล้วค่อย translate() ซึ่ง CSS อ่านจากขวาไปซ้าย
                    // -- ระยะเลื่อนจึงถูกคูณด้วยอัตราซูมไปด้วย ลากเมาส์ 100px ตอนซูม 300%
                    // รูปวิ่งไป 300px ยิ่งซูมเข้าไปดูรอยชำรุดใกล้ ๆ ยิ่งบังคับตำแหน่งไม่ได้
                    // สลับลำดับแล้วระยะที่ลากเท่ากับระยะที่รูปขยับเสมอ ไม่ว่าซูมเท่าไร
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        cursor: isDragging ? 'grabbing' : 'grab',
                    }}
                    className="max-h-full max-w-full object-contain transition-transform duration-100"
                />
            </div>
        </Modal>
    );
};
