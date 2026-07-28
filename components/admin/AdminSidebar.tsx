import React from 'react';
import { LayoutDashboard, Package, Users, Settings, LogOut, X, History, MapPinned } from 'lucide-react';
import { User } from '../../types';
import { useT } from '../../hooks/useT';
import { BrandMark } from '../auth/BrandMark';
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
            // The active state is the sign-in CTA's treatment (LoginPage.tsx:180)
            // -- same brand fill, same tinted shadow. It was already this shape,
            // only in an unrelated blue with a flat blue-200 shadow; a shadow
            // tinted from the element's own colour is what stops it reading as
            // grey haze under a saturated fill.
            //
            // focus-visible outline: every control in this sidebar was previously
            // invisible to the keyboard -- tabbing through the nav moved the focus
            // ring nowhere the eye could follow. brand-500 matches the rings on
            // the auth screens.
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${activeTab === id ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
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
            <div className={`
                fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col
                transition-transform duration-300 ease-in-out print:hidden
                lg:translate-x-0 lg:sticky lg:top-0 lg:h-dvh lg:shrink-0
                ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
            `}>
                <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-3">
                    {/* Was a blue rounded square with a letter "N" in it standing
                        in for a logo. This is the actual NMT wordmark, the same
                        component the sign-in card uses, drawn in brand-600 and
                        accent-500 -- so the mark an admin signs in under is the
                        mark they keep looking at. It carries the product name
                        itself, which is why the "NMT System" text next to it is
                        gone rather than duplicated. */}
                    <BrandMark className="h-5 w-auto shrink-0" />
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
                        <LanguageToggle />
                    </div>
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        aria-label={t.common.close}
                        className="lg:hidden text-slate-500 hover:text-slate-700 p-1 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 p-4 space-y-1 overflow-y-auto styled-scrollbar">
                    {/* `uppercase tracking-wider` dropped from these two headings:
                        uppercase does nothing to Thai, and the wide letter-spacing
                        pushes Thai vowels and tone marks off their base characters. */}
                    <p className="px-4 text-xs font-bold text-slate-400 mb-2 mt-2">{t.nav.menu}</p>
                    <NavItem id="dashboard" label={t.nav.dashboard} icon={<LayoutDashboard size={20} />} />
                    <NavItem id="inventory" label={t.nav.inventory} icon={<Package size={20} />} />
                    <NavItem id="transactions" label={t.nav.transactions} icon={<History size={20} />} />
                    <NavItem id="users" label={t.nav.users} icon={<Users size={20} />} />
                    <NavItem id="locations" label={t.nav.locations} icon={<MapPinned size={20} />} />

                    <div className="my-4 border-t border-slate-100"></div>
                    <p className="px-4 text-xs font-bold text-slate-400 mb-2">{t.nav.system}</p>
                    <NavItem id="settings" label={t.nav.settings} icon={<Settings size={20} />} />
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        {/* The indigo here belonged to no palette in the app; the
                            avatar is now the quietest tint of the brand. */}
                        <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-700 font-bold">
                            {currentUser?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{currentUser?.full_name || t.common.user}</p>
                            {/* Was currentUser.role raw, i.e. the literal "admin"/"staff"
                                enum value. It now goes through the role table. */}
                            <p className="text-xs text-slate-500 truncate">{currentUser ? t.role[currentUser.role] : '-'}</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                    >
                        <LogOut size={16} className="shrink-0" />
                        {/* Same reason as the nav labels: Thai breaks on
                            syllables, and "ออกจากระบบ" splitting into
                            "ออกจาก / ระบบ" turns one button into two lines of
                            fragments. */}
                        <span className="whitespace-nowrap">{t.nav.signOut}</span>
                    </button>
                </div>
            </div>
        </>
    );
};
