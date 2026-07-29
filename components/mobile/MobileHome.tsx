import React from 'react';
import { ArrowRightCircle, ArrowLeftCircle, AlertTriangle, History } from 'lucide-react';
import { User } from '../../types';
import { MobileMode } from './MobileInterface';
import { useT } from '../../hooks/useT';
import { StaffHeader } from './StaffHeader';
import { ActionTile } from './ActionTile';

interface MobileHomeProps {
    user: User;
    onLogout: () => void;
    onSetMode: (mode: MobileMode) => void;
}

export const MobileHome = ({ user, onLogout, onSetMode }: MobileHomeProps) => {
    const t = useT();

    return (
        // `min-h-dvh` ไม่ใช่ `h-[calc(100vh-56px)]` ของเดิม: 56px นั้นหักให้แถบที่
        // ไม่มีอยู่จริง -- App.tsx เรนเดอร์ MobileInterface ตรง ๆ ไม่มี chrome อะไร
        // อยู่เหนือมัน ที่ผ่านมาจึงมีที่ว่างตาย 56px ก้นจอทุกครั้งที่เปิดหน้านี้
        //
        // และ `dvh` ไม่ใช่ `vh` เพราะ 100vh บนมือถือรวมพื้นที่แถบ URL เข้าไปด้วย
        <div className="app-canvas flex min-h-dvh flex-col">
            <StaffHeader user={user} onLogout={onLogout} />

            {/* max-w-md เพราะหน้านี้ถูกเลือกจาก role ไม่ใช่จากขนาดจอ (App.tsx:43)
                เปิดบนโน้ตบุ๊กแล้วเลย์เอาต์มือถือเคยยืดเต็ม 1920px */}
            <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 p-4">
                <ActionTile
                    icon={ArrowRightCircle}
                    title={t.mobileHome.checkOut}
                    subtitle={t.mobileHome.checkOutSub}
                    tone="brand"
                    layout="stack"
                    className="flex-1"
                    onClick={() => onSetMode('checkout_select_dept')}
                />
                <ActionTile
                    icon={ArrowLeftCircle}
                    title={t.mobileHome.checkIn}
                    subtitle={t.mobileHome.checkInSub}
                    tone="accent"
                    layout="stack"
                    className="flex-1"
                    onClick={() => onSetMode('checkin_scanning')}
                />
                <ActionTile
                    icon={History}
                    title={t.mobileHome.myHistory}
                    subtitle={t.mobileHome.myHistorySub}
                    tone="neutral"
                    layout="row"
                    onClick={() => onSetMode('history')}
                />
                <ActionTile
                    icon={AlertTriangle}
                    title={t.mobileHome.reportDamage}
                    subtitle={t.mobileHome.reportDamageSub}
                    tone="danger"
                    layout="row"
                    onClick={() => onSetMode('damage_scanning')}
                />
            </main>

            {/* uppercase + tracking-widest ของเดิมหายไป: uppercase ไม่มีผลกับภาษาไทย
                และ letter-spacing ค่าบวกดันวรรณยุกต์ออกจากตัวอักษรฐาน */}
            <p className="shrink-0 p-4 text-center text-[10px] font-semibold text-slate-400">
                Pallet Management System v1.1
            </p>
        </div>
    );
};
