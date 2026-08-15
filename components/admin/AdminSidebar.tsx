import React from 'react';
import { LayoutDashboard, Package, Users, Settings, LogOut, X, History, MapPinned, User as UserIcon, Shield } from 'lucide-react';
import { User } from '../../types';
import { useT } from '../../hooks/useT';
import { LanguageToggle } from '../LanguageToggle';

interface AdminSidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (isOpen: boolean) => void;
    currentUser: User | null;
    onLogout: () => void;
}

export const AdminSidebar = ({
    activeTab,
    setActiveTab,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    currentUser,
    onLogout
}: AdminSidebarProps) => {
    const t = useT();

    const NavItem = ({ id, label, icon }: { id: string, label: string, icon: any }) => (
        <button
            onClick={() => {
                setActiveTab(id);
                setIsMobileMenuOpen(false);
            }}
            // ทั้งสองสถานะเป็นชุดสีสำหรับพื้นเข้ม -- แถบนี้เป็น `brand-900` แล้ว
            //
            // สถานะ active เคยเป็น `bg-brand-600` (ชุดเดียวกับปุ่ม CTA หน้าเข้าสู่ระบบ)
            // ซึ่งใช้ต่อไม่ได้: brand-600 วางบน brand-900 วัดได้ 1.87:1 เม็ดที่เลือกอยู่
            // จะอ่านเป็นรอยเปื้อนจาง ๆ ไม่ใช่สถานะ ตอนนี้เป็นเม็ดขาวทึบ (14.25:1) --
            // ชุดเดียวกับ variant `inverse` ใน Button.tsx และกับชิปที่เลือกอยู่ของ
            // LanguageToggle โหมดพื้นเข้ม ซึ่งนั่งอยู่หัวแถบเดียวกันนี้
            //
            // สถานะ idle ใช้ `text-white/70` = 7.69:1 ผ่านเกณฑ์ข้อความ 4.5:1 สบาย ๆ
            //
            // วงแหวนโฟกัสเปลี่ยนจาก `brand-500` เป็น `white` ด้วยเหตุผลเดียวกับสีเม็ด:
            // brand-500 บนพื้น brand-900 ได้ 2.55:1 วงแหวนที่มองไม่เห็นเท่ากับไม่มี --
            // กลไกเดียวกับที่ Button.tsx variant `inverseGhost` ใช้อยู่แล้ว
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${activeTab === id ? 'bg-white text-brand-900 font-bold shadow-lg shadow-black/20' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
        >
            {icon}
            {/* Thai has no inter-word spaces, so the browser breaks it with a
                syllable dictionary instead -- and "คลังพาเลท" splits happily
                into "คลังพา / เลท", which reads as two words that mean nothing.
                A nav label is one atom in any language; it must never wrap. */}
            <span className="whitespace-nowrap">{label}</span>
        </button>
    );

    return (
        <>
            {isMobileMenuOpen && (
                <div
                    // `animate-in fade-in duration-200` was doing nothing at all:
                    // those are tailwindcss-animate utilities and that plugin is
                    // not installed, so the classes generated no CSS and the scrim
                    // simply appeared. animate-pop-in is a real utility in
                    // index.css, and it respects prefers-reduced-motion.
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden animate-pop-in"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* lg: rather than md: -- see the note in AdminDashboard.tsx. Below
                1024 this is a drawer over the content; at 1024 it joins the flex
                row. `sticky top-0` with `h-dvh` keeps the nav in place while the
                document (now the only scroll container) scrolls past it; it is
                what `h-screen` on a non-scrolling parent used to fake. */}
            {/* พื้นแถบเป็น `brand-900` ไม่ใช่ `bg-white` อีกต่อไป
                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
                แถบสีขาวบนพื้นหน้าจอ `#f8fafc` ต่างกัน 1.05:1 -- ขอบเขตของแถบนำทาง
                จึงฝากไว้กับเส้น `border-slate-200` เส้นเดียว (1.23:1) ซึ่งในทางปฏิบัติ
                แปลว่ามองไม่เห็นว่าแถบเริ่มและจบตรงไหน

                ตอนนี้แถบห่างจากพื้นหน้าจอ 12.69:1 เส้นขอบขวาจึงถูกถอดออก ไม่ใช่ลืม:
                เมื่อสองพื้นผิวต่างกันขนาดนี้ เส้นคั่นระหว่างมันไม่มีหน้าที่อะไรเหลือ
                และเส้นสีเทาอ่อนบนพื้นน้ำเงินเข้มจะอ่านเป็นขอบที่หลุดมาจากธีมเดิม

                `brand-900` ไม่ใช่เทาเข้มหรือดำ -- เป็นพื้นแบรนด์ทึบที่แอปมีอยู่แล้วที่
                SelectionBar.tsx และหัวหน้าจอฝั่งพนักงาน (StaffHeader.tsx) ชุดสีบนพื้น
                เข้มทั้งหมดในไฟล์นี้จึงยกมาจากสองที่นั้น ไม่ได้คิดขึ้นใหม่ */}
            <div className={`
                fixed inset-y-0 left-0 z-40 w-64 bg-brand-900 flex flex-col
                transition-transform duration-300 ease-in-out print:hidden
                lg:translate-x-0 lg:sticky lg:top-0 lg:h-dvh lg:shrink-0
                ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
            `}>
                <div className="p-6 border-b border-white/10 flex items-center justify-between gap-3">
                    {/* โลโก้จริงจาก public/logo.png ไม่ใช่คอมโพเนนต์ BrandMark ที่วาดด้วย SVG
                        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
                        ไฟล์นี้เป็น PNG แบบ palette ที่ไม่มีช่องอัลฟาเลย (ไม่มีชังก์
                        tRNS) -- 80% ของภาพเป็นสีขาวทึบ วางลงบนแถบ brand-900 ตรง ๆ
                        จะได้สี่เหลี่ยมขาวหนึ่งใบ ไม่ใช่โลโก้ลอย แผ่นขาวใต้ภาพจึงไม่ใช่
                        การตกแต่ง แต่เป็นสิ่งที่ทำให้ไฟล์นี้ใช้บนพื้นเข้มได้เลย

                        กล่องครอบและ object-cover คือการครอบตัดในแนวตั้ง: ภาพต้นฉบับ
                        เป็นสี่เหลี่ยมจัตุรัส 447x447 แต่ตัวอักษรกินแค่แถบกลางที่ y
                        150-300 (33.6%-67.1%) ที่เหลือเป็นขอบขาวเปล่า ถ้าใส่ทั้งใบ
                        ที่ความสูง 20px ตัวอักษรจะเหลือแค่ ~7px -- อ่านไม่ออก
                        `aspect-[5/2]` เปิดหน้าต่างให้เห็น 40% กลางภาพ (30%-70%)
                        ซึ่งครอบแถบตัวอักษรพอดีและเหลือช่องว่างบนล่างนิดหน่อย

                        ถ้าเปลี่ยนไฟล์โลโก้เมื่อไหร่ ต้องวัดกรอบตัวอักษรใหม่แล้วแก้
                        สัดส่วนตรงนี้ ไม่งั้นตัวอักษรจะโดนตัดหัวหรือลอยไม่กลาง */}
                    <div className="shrink-0 rounded-lg bg-white px-2 py-1.5">
                        <div className="h-5 aspect-[5/2] overflow-hidden">
                            <img
                                src="/logo.png"
                                alt="NMT"
                                width={447}
                                height={447}
                                decoding="async"
                                className="h-full w-full object-cover object-center"
                            />
                        </div>
                    </div>
                    {/* The desktop half of the language control. A direct child
                        of the `justify-between` row, not tucked into the mark's
                        group: on desktop the close button beside it is
                        `lg:hidden`, so the row had only one child left and the
                        toggle sat glued to the wordmark on the left edge. As a
                        sibling it takes the right end of the row, which is where
                        the other two mounts of this control already sit -- the
                        sign-in card header (AuthShell.tsx) and the mobile top
                        bar (AdminDashboard.tsx).

                        hidden below lg because that mobile top bar carries the
                        other half -- the two must never be on screen at once, or
                        changing the language in one leaves the other looking
                        like a second, separate setting. */}
                    <div className="hidden lg:block">
                        {/* โหมดพื้นเข้มมีอยู่แล้วสำหรับหัวหน้าจอฝั่งพนักงาน ที่นี่เป็น
                            ผู้ใช้รายที่สองของโหมดนั้น ไม่ใช่โหมดที่เพิ่งเพิ่มเพื่อหน้านี้ */}
                        <LanguageToggle onColor />
                    </div>
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        aria-label={t.common.close}
                        className="lg:hidden text-white/70 hover:bg-white/10 hover:text-white p-1 rounded-lg transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 p-4 space-y-1 overflow-y-auto styled-scrollbar">
                    {/* `uppercase tracking-wider` dropped from these two headings:
                        uppercase does nothing to Thai, and the wide letter-spacing
                        pushes Thai vowels and tone marks off their base characters. */}
                    {/* `text-white/50` = 4.64:1 บนพื้นนี้ -- หัวข้อกลุ่มเป็นข้อความจริง
                        ไม่ใช่เส้นตกแต่ง จึงต้องผ่าน 4.5:1 อย่าลดลงกว่านี้เพราะรู้สึกว่า
                        "เด่นเกินไป" `slate-400` เดิมที่ยกมาตรง ๆ จะได้แค่ 2.2:1 */}
                    <p className="px-4 text-xs font-bold text-white/50 mb-2 mt-2">{t.nav.menu}</p>
                    <NavItem id="dashboard" label={t.nav.dashboard} icon={<LayoutDashboard size={20} />} />
                    <NavItem id="inventory" label={t.nav.inventory} icon={<Package size={20} />} />
                    <NavItem id="transactions" label={t.nav.transactions} icon={<History size={20} />} />
                    <NavItem id="users" label={t.nav.users} icon={<Users size={20} />} />
                    <NavItem id="locations" label={t.nav.locations} icon={<MapPinned size={20} />} />

                    <div className="my-4 border-t border-white/10"></div>
                    <p className="px-4 text-xs font-bold text-white/50 mb-2">{t.nav.system}</p>
                    <NavItem id="settings" label={t.nav.settings} icon={<Settings size={20} />} />
                </div>

                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* ยกมาจากกล่องไอคอนใน StaffHeader.tsx ตรง ๆ -- `bg-brand-50`
                                เดิมเป็นกล่องเกือบขาว ซึ่งบนพื้นนี้จะกลายเป็นจุดสว่างที่ดึงตา
                                ไปจากชื่อผู้ใช้ข้าง ๆ ทั้งที่มันเป็นแค่ไอคอนประกอบ */}
                            <div className="w-10 h-10 rounded-xl border border-white/20 bg-white/12 text-white flex items-center justify-center shrink-0">
                                <UserIcon size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">
                                    {currentUser?.full_name || t.common.user}
                                </p>
                                <div className="flex items-center gap-1 text-[11px] font-medium text-white/60 uppercase tracking-wider truncate mt-0.5">
                                    <Shield size={12} className="shrink-0 text-white/60" />
                                    <span className="truncate">
                                        {currentUser ? (t.role[currentUser.role] || currentUser.role).toUpperCase() : 'ADMIN'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onLogout}
                            aria-label={t.nav.signOut}
                            title={t.nav.signOut}
                            // แดงคู่สำหรับพื้นเข้ม ยกมาจาก variant `dangerGhostOnDark`
                            // ใน Button.tsx -- `text-red-600 hover:bg-red-50` เดิมเป็นแดง
                            // เข้มบนพื้นขาว ซึ่งบนพื้นนี้กลับหัวทั้งคู่: ตัวหนังสือจมหาย
                            // และพื้นตอน hover กลายเป็นแผ่นสว่างจ้า
                            className="p-2 text-white/60 hover:text-red-200 hover:bg-red-500/20 rounded-lg transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white shrink-0"
                        >
                            <LogOut size={20} className="shrink-0" />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};
