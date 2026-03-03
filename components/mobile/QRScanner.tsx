import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Zap } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
  fps?: number;
  qrbox?: number;
}

const QRScanner: React.FC<QRScannerProps> = ({
  onScanSuccess,
  onClose,
  fps = 10,
  qrbox = 250
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanSuccessRef = useRef(onScanSuccess);
  const [scanError, setScanError] = useState<string | null>(null);
  const regionId = "html5-qrcode-reader";

  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
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
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              return {
                width: Math.floor(minEdge * 0.7),
                height: Math.floor(minEdge * 0.7)
              };
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
      } catch (err) {
        console.error("Error starting scanner", err);
        if (isMounted) {
          setScanError("Camera access denied or error starting scanner.");
        }
      }
    };

    const timer = setTimeout(() => startScanner(), 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(console.error);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-start">

      {/* 1. Minimalist Header */}
      <div className="absolute top-0 left-0 w-full pt-3 pl-6 pr-6 flex justify-between items-start z-50">
        {/* Status Pill */}
        <div className="bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-full pl-3 pr-4 py-2 flex items-center gap-3 shadow-lg">
          <div className="w-5 h-5 bg-black/50 rounded-full flex items-center justify-center border border-white/10 shadow-inner">
            <Camera className="w-5 h-5 text-green-400 animate-pulse" />
          </div>
          <span className="text-white text-sm font-semibold tracking-wide">Scanning...</span>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-10 h-10 bg-blue-600/80 hover:bg-blue-500 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 text-white transition shadow-lg"
        >
          <X size={20} />
        </button>
      </div>

      {/* Unified Scanner Wrapper */}
      <div className="relative mt-[-50px] w-full flex items-center justify-center">

        {/* The Library Video Div */}
        <div id={regionId} className="w-full overflow-hidden"></div>

        {/* Decorative Frame */}
        <div className="absolute z-10 w-64 h-64 border-2 border-white/20 rounded-xl pointer-events-none shadow-[0_0_100px_rgba(0,0,0,0.5)]">
          {/* Corners */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
          <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>

          {/* 2. Instructions: Centered inside the box */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black/40 backdrop-blur-sm border border-white/10 px-5 py-2.5 rounded-full flex items-center gap-2.5 shadow-2xl">
              <Zap size={14} className="text-yellow-400 fill-yellow-400 animate-pulse" />
              <span className="text-white font-bold text-xs tracking-[0.15em] uppercase">Align QR Code</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {scanError && (
        <div className="absolute bottom-32 left-6 right-6 px-6 py-4 bg-red-600/90 backdrop-blur text-white rounded-xl text-center shadow-lg font-medium z-50">
          {scanError}
        </div>
      )}
    </div>
  );
};

export default QRScanner;