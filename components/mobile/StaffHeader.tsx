import React from 'react';
import { ArrowLeft, LogOut, User as UserIcon } from 'lucide-react';
import type { User } from '../../types';
import { useT } from '../../hooks/useT';
import { LanguageToggle } from '../LanguageToggle';
import { Button } from '../ui/Button';

export interface StaffHeaderProps {
    /** บล็อกผู้ใช้ (ชื่อ + แผนก + บทบาท) -- หน้าแรกเท่านั้น */
    user?: User;
    /** ชื่อหน้า -- อีกสามหน้า ใช้แทนบล็อกผู้ใช้ */
    title?: string;
    onBack?: () => void;
    onLogout?: () => void;
}

// แถบหัวตัวเดียวของทั้งฝั่งพนักงาน ก่อนหน้านี้สี่หน้าวาดหัวของตัวเองสามแบบ
// (ขาวสองแบบคนละสัดส่วน น้ำเงินขอบมนหนึ่ง แดงหนึ่ง)
//
// พื้นเป็น `brand-900` ซึ่งเป็นพื้นแบรนด์ทึบที่แอปมีอยู่แล้วที่ SelectionBar.tsx:115
// ไม่ใช่เฉดที่คิดขึ้นใหม่ -- และเพราะเป็นเฉดเดิม ปุ่มตระกูล `inverse*` ของ Button
// ที่เช็คคอนทราสต์มาแล้วสำหรับพื้นนั้นจึงใช้ได้ทันทีโดยไม่ต้องคิดสีใหม่
//
// z-10 ไม่ใช่ค่าที่สูงกว่านี้: กองหน้าจอสแกน (กล้อง 50 / แผ่นล่าง 60 / ผลตอบกลับ 70)
// ต้องทับมันได้
//
// แถบกินเต็มความกว้างจอ แต่เนื้อหาข้างในคุมด้วย max-w-md เท่ากับตัวหน้า -- บนมือถือ
// ไม่ต่างจากเดิม บนจอกว้างแถบยังเต็มขอบขณะที่คอลัมน์อยู่กลาง
export const StaffHeader: React.FC<StaffHeaderProps> = ({ user, title, onBack, onLogout }) => {
    const t = useT();

    return (
        <header className="sticky top-0 z-10 bg-brand-900 print:hidden">
            <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            aria-label={t.common.back}
                            className={
                                '-ml-1 shrink-0 rounded-lg p-1.5 text-white/80 transition ' +
                                'hover:bg-white/10 hover:text-white focus-visible:outline-2 ' +
                                'focus-visible:outline-offset-2 focus-visible:outline-white'
                            }
                        >
                            <ArrowLeft size={22} aria-hidden="true" />
                        </button>
                    )}

                    {user ? (
                        <>
                            <span
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/12 text-white"
                                aria-hidden="true"
                            >
                                <UserIcon size={20} />
                            </span>
                            <div className="min-w-0">
                                {/* h1 เพราะนี่คือหัวเรื่องระดับหน้า -- หน้าฝั่งพนักงาน
                                    ไม่มี h1 เลยสักหน้าก่อนหน้านี้ */}
                                <h1 className="truncate text-sm font-semibold text-white">
                                    {user.full_name}
                                </h1>
                                {/* ชื่อแผนกเป็นข้อมูลที่แอดมินพิมพ์เอง จึงเป็นภาษาไทยได้
                                    -- ห้ามใส่ tracking ค่าบวกตรงนี้เด็ดขาด */}
                                <p className="truncate text-xs text-white/70">
                                    {user.department} · {t.role[user.role]}
                                </p>
                            </div>
                        </>
                    ) : (
                        <h1 className="truncate text-base font-semibold text-white">{title}</h1>
                    )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <LanguageToggle onColor />
                    {onLogout && (
                        <Button
                            variant="inverseGhost"
                            icon={LogOut}
                            onClick={onLogout}
                            aria-label={t.nav.signOut}
                            className="px-2.5"
                        />
                    )}
                </div>
            </div>
        </header>
    );
};
