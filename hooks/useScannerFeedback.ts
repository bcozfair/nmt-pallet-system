import { useRef, useEffect } from 'react';

export const useScannerFeedback = () => {
    const audioCtxRef = useRef<AudioContext | null>(null);
    const vibrationIntervalRef = useRef<number | null>(null);
    const hasActiveVibration = useRef(false);

    const initAudio = () => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    };

    const playSound = (type: 'success' | 'error') => {
        initAudio(); // This might also warn if no interaction, but less severe usually
        const ctx = audioCtxRef.current;
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;

        if (type === 'success') {
            // High pitch "Ping"
            osc.timeout = 0.15; // helper
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else {
            // Low pitch "Buzz"
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.4);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
        }
    };

    const stopFeedback = () => {
        if (vibrationIntervalRef.current) {
            window.clearInterval(vibrationIntervalRef.current);
            vibrationIntervalRef.current = null;
        }
        // Only stop if we actually flagged as active, to avoid "Intervention" errors on mount/unmount
        if (navigator.vibrate && hasActiveVibration.current) {
            try {
                navigator.vibrate(0);
                hasActiveVibration.current = false;
            } catch (e) {
                // ignore
            }
        }
    };

    const triggerFeedback = (status: 'success' | 'error') => {
        // We can try/catch playSound as well if needed
        try { playSound(status); } catch (e) { }

        if (status === 'success') {
            stopFeedback();
            if (navigator.vibrate) {
                hasActiveVibration.current = true;
                navigator.vibrate(150);
            }
        } else {
            // Error: Continuous Vibration
            stopFeedback();
            if (navigator.vibrate) {
                hasActiveVibration.current = true;
                navigator.vibrate([500, 200]);
                vibrationIntervalRef.current = window.setInterval(() => {
                    if (navigator.vibrate) navigator.vibrate([500, 200]);
                }, 700);
            }
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => stopFeedback();
    }, []);

    return { triggerFeedback, stopFeedback };
};
