import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Zap } from 'lucide-react';
import { useT } from '../../hooks/useT';
import { dict } from '../../services/i18n';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
  fps?: number;
  /** แผ่นด้านล่าง (รายการสแกน / ช่องกรอกมือ) -- ต้องเป็นลูกของตัวนี้ ไม่ใช่
      พี่น้องแบบ fixed ไม่งั้นเวทีกล้องจะไม่รู้ว่าเหลือที่ว่างจริงเท่าไร */
  children?: React.ReactNode;
}

const QRScanner: React.FC<QRScannerProps> = ({
  onScanSuccess,
  onClose,
  fps = 10,
  children
}) => {
  const t = useT();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanSuccessRef = useRef(onScanSuccess);
  const stageRef = useRef<HTMLDivElement>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  // ขนาดกรอบตกแต่งมาจากขนาด qrbox จริงที่ไลบรารีใช้ถอดรหัส กรอบที่วาดจึงตรง
  // กับพื้นที่ที่สแกนได้จริงทุกจอ แทนที่จะเป็น w-64 h-64 ตายตัวเหมือนเดิม
  const [qrBoxSize, setQrBoxSize] = useState(0);
  // เพิ่มค่านี้เพื่อสั่งเปิดกล้องใหม่ ไลบรารีคำนวณพื้นที่ถอดรหัสเป็น px ครั้ง
  // เดียวตอนเปิดกล้อง (html5-qrcode.ts:1059-1082) แล้วอ้างอิงค่านั้นตลอด
  // การเปิดใหม่คือทางเดียวที่ทำให้มันวัดขนาดใหม่หลังจอเปลี่ยนขนาด
  const [restartKey, setRestartKey] = useState(0);
  // งาน start/stop ทุกชิ้นต่อคิวกันที่นี่ ไม่งั้นตอนรีสตาร์ท React จะเรียก
  // cleanup แล้วเริ่ม effect ใหม่ทันทีโดยไม่รอ stop() ที่เป็น async ให้จบ
  // -- จะได้กล้องสองตัวแย่งกัน append วิดีโอลง div เดียวกัน
  const opQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const regionId = "html5-qrcode-reader";

  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  // เฝ้าเฉพาะ "ความกว้าง" ของเวที เพราะความกว้างคือสิ่งเดียวที่กำหนดขนาด
  // วิดีโอ ส่วนความสูงเปลี่ยนบ่อยจากคีย์บอร์ดบนมือถือ ถ้ารีสตาร์ทตามความสูง
  // ด้วย กล้องจะดับ-ติดใหม่ทุกครั้งที่ผู้ใช้แตะช่องกรอกรหัส
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;

    // ตั้งค่าเริ่มต้นจากขนาดปัจจุบัน ไม่งั้น callback นัดแรกที่ ResizeObserver
    // ยิงทันทีที่ observe() จะถูกนับเป็น "ขนาดเปลี่ยน" และรีสตาร์ทฟรี ๆ หนึ่งรอบ
    let lastWidth = stage.clientWidth;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (Math.abs(width - lastWidth) < 1) return;
      lastWidth = width;
      // หน่วงไว้ให้การลากขอบหน้าต่าง/การหมุนจอนิ่งก่อน จะได้เปิดกล้องรอบเดียว
      clearTimeout(timer);
      timer = setTimeout(() => setRestartKey((k) => k + 1), 250);
    });

    observer.observe(stage);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
      if (!isMounted) return;
      try {
        const scanner = new Html5Qrcode(regionId, {
          verbose: false
        } as any);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: fps,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              // viewfinderHeight คือความสูงของ "วิดีโอทั้งใบ" ซึ่งอาจสูงเกิน
              // เวทีจนถูกครอบตัดบน-ล่าง วัดจากเวทีด้วยเพื่อไม่ให้กรอบล้น
              // ออกไปอยู่หลังแผ่นรายการหรือนอกจอ
              const stageHeight = stageRef.current?.clientHeight ?? viewfinderHeight;
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight, stageHeight);
              const edge = Math.floor(minEdge * 0.7);
              if (isMounted) setQrBoxSize(edge);
              return { width: edge, height: edge };
            },
          },
          (decodedText) => {
            if (isMounted && onScanSuccessRef.current) {
              console.log("Scanned:", decodedText);
              onScanSuccessRef.current(decodedText);
            }
          },
          (errorMessage) => {
          }
        );

        if (isMounted) setScanError(null);
      } catch (err) {
        console.error("Error starting scanner", err);
        if (isMounted) {
          // dict(), not the `t` above: this effect runs with a dependency list
          // that has no `t` in it, so a captured `t` would be a stale closure.
          setScanError(dict().scanner.cameraError);
        }
      }
    };

    const stopScanner = async () => {
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (!scanner || !scanner.isScanning) return;
      try {
        await scanner.stop();
        scanner.clear();
      } catch (err) {
        console.error("Error stopping scanner", err);
      }
    };

    // หน่วง 100ms ให้เลย์เอาต์นิ่งก่อน ไลบรารีอ่าน clientWidth ของ div ทันที
    // ที่เริ่ม ถ้าอ่านตอนเวทียังจัดขนาดไม่เสร็จ วิดีโอจะได้ความกว้างผิด
    const settleThenStart = () =>
      new Promise<void>((resolve) => setTimeout(resolve, 100)).then(startScanner);
    opQueueRef.current = opQueueRef.current.then(settleThenStart, settleThenStart);

    return () => {
      isMounted = false;
      opQueueRef.current = opQueueRef.current.then(stopScanner, stopScanner);
    };
  }, [restartKey]);

  return (
    // คอลัมน์เดียวจบ: เวที (flex-1) + แผ่นล่าง (children) แบ่งความสูงจอกันเอง
    // "กลางเวที" จึงเท่ากับ "กลางพื้นที่ดำที่เหลือ" ทุกขนาดหน้าจอ โดยไม่ต้อง
    // วัดความสูงแผ่นล่างด้วย JS และไม่ต้องมีระยะเยื้องคงที่แบบ mt-[-50px]
    <div className="fixed inset-0 z-50 flex flex-col bg-black">

      {/* 1. Minimalist Header -- ลอยทับเวที ไม่กินความสูงของคอลัมน์ */}
      <div className="absolute top-0 left-0 w-full pt-3 pl-6 pr-6 flex justify-between items-start z-50">
        {/* Status Pill */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-full pl-3 pr-4 py-2 flex items-center gap-3 shadow-lg">
          <div className="w-5 h-5 bg-black/50 rounded-full flex items-center justify-center border border-white/10 shadow-inner">
            <Camera className="w-5 h-5 text-green-400 animate-pulse" />
          </div>
          <span className="text-white text-sm font-semibold">{t.scanner.scanning}</span>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t.scanner.closeScanner}
          className="w-10 h-10 bg-brand-600/80 hover:bg-brand-500 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 text-white transition shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      {/* Stage: พื้นที่ดำที่เหลือหลังหักแผ่นล่างออกแล้ว */}
      <div
        ref={stageRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
      >
        {/* The Library Video Div -- ไลบรารีตั้งความกว้างวิดีโอเท่ากับ div นี้
            แล้วปล่อยความสูงตามอัตราส่วนภาพ จึงถูกจัดกึ่งกลางเวทีให้เอง */}
        <div id={regionId} className="w-full"></div>

        {/* Decorative Frame -- ซ่อนไว้จนกว่าจะรู้ขนาด qrbox จริง เพื่อไม่ให้
            กรอบกระโดดเปลี่ยนขนาดตอนกล้องติด */}
        {qrBoxSize > 0 && (
          <div
            style={{ width: qrBoxSize, height: qrBoxSize }}
            className="absolute z-10 border-2 border-white/20 rounded-xl pointer-events-none shadow-[0_0_100px_rgba(0,0,0,0.5)]"
          >
            {/* Corners */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-accent-400 rounded-tl-lg"></div>
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-accent-400 rounded-tr-lg"></div>
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-accent-400 rounded-bl-lg"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-accent-400 rounded-br-lg"></div>

            {/* 2. Instructions: Centered inside the box */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/40 backdrop-blur-sm border border-white/10 px-5 py-2.5 rounded-full flex items-center gap-2.5 shadow-2xl">
                <Zap size={14} className="text-yellow-400 fill-yellow-400 animate-pulse" />
                {/* No tracking/uppercase here any more: both are no-ops on Thai at
                    best, and the wide letter-spacing detaches its tone marks. */}
                <span className="text-white font-bold text-xs">{t.scanner.alignQr}</span>
              </div>
            </div>
          </div>
        )}

        {/* Error State -- อยู่ในเวที จึงไม่ถูกแผ่นล่างบัง */}
        {scanError && (
          <div
            role="alert"
            className="absolute bottom-6 left-6 right-6 px-6 py-4 bg-red-600/90 backdrop-blur text-white rounded-xl text-center shadow-lg font-medium z-50"
          >
            {scanError}
          </div>
        )}
      </div>

      {children}
    </div>
  );
};

export default QRScanner;
