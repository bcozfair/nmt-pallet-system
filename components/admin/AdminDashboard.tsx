import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CircleAlert, Menu, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchPallets, subscribeToPallets } from '../../services/palletService';
import { supabase } from '../../services/supabase';
import { Pallet } from '../../types';
import { useT } from '../../hooks/useT';
import { BrandMark } from '../auth/BrandMark';
import { LanguageToggle } from '../LanguageToggle';
import { DashboardHome } from './dashboard/DashboardHome';
import { InventoryView } from './inventory/InventoryView';
import { TransactionView } from './transactions/TransactionView';
import { AdminSidebar } from './AdminSidebar';
import { UserView } from './users/UserView';
import { LocationView } from './locations/LocationView';
import SettingsView from './settings/SettingsView';
import { QRPrintModal } from './modals/QRPrintModal';
import { PalletDetailModal } from './modals/PalletDetailModal';

// Realtime fires once per changed row, not once per logical operation. A bulk
// check-out of 30 pallets through createBulkTransaction therefore arrives as 30
// separate callbacks within a few milliseconds, and each one used to trigger a
// full fetchPallets() -- 30 round trips to render one state change. Collapsing
// them into a single trailing refetch costs 300ms of staleness, which nobody can
// perceive, and saves 29 requests. The window has to outlast the gap between
// rows in one batch without being long enough to feel like lag on a single scan.
const REALTIME_REFETCH_DEBOUNCE_MS = 300;

const AdminDashboard = () => {
    const { user: currentUser, signOut } = useAuth();
    const t = useT();
    // Initialize state from URL
    const queryParams = new URLSearchParams(window.location.search);
    const initialTab = queryParams.get('tab') || 'dashboard';
    const initialFilter = queryParams.get('filter') || 'all';
    const initialLoc = 'all'; // Always start with 'all' on refresh/login as requested

    const [activeTab, setActiveTabState] = useState(initialTab);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [pallets, setPallets] = useState<Pallet[]>([]);
    // Starts true: the first fetch is already in flight by the time anything
    // paints, so the honest initial state is "loading", not "zero pallets".
    const [palletsLoading, setPalletsLoading] = useState(true);
    // A flag, not a message. Storing the translated string here would freeze it
    // in whatever language was active when the fetch failed -- the banner would
    // still be in Thai after the user switched to English, until the next retry
    // happened to rewrite it. Translating at render instead means a language
    // change re-renders the banner along with everything else.
    const [hasLoadError, setHasLoadError] = useState(false);
    const palletsError = hasLoadError ? t.errors.unknown : null;

    // States for inventory navigation
    const [inventoryFilter, setInventoryFilterState] = useState(initialFilter);
    const [inventoryLocation, setInventoryLocationState] = useState(initialLoc);

    // Helpers to sync state with URL
    const updateUrl = (tab: string, filter?: string, loc?: string) => {
        const params = new URLSearchParams();
        params.set('tab', tab);
        if (filter && filter !== 'all') params.set('filter', filter);
        if (loc && loc !== 'all') params.set('location', loc);

        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({}, '', newUrl);
    };

    const setActiveTab = (tab: string) => {
        setActiveTabState(tab);
        // Reset filters when switching main tabs unless going to inventory
        if (tab === 'inventory') {
            updateUrl(tab, inventoryFilter, inventoryLocation);
        } else {
            updateUrl(tab);
        }
    };

    const setInventoryFilter = (filter: string) => {
        setInventoryFilterState(filter);
        updateUrl('inventory', filter, inventoryLocation);
    };

    const setInventoryLocation = (loc: string) => {
        setInventoryLocationState(loc);
        updateUrl('inventory', inventoryFilter, loc);
    };

    // Modal states
    const [selectedPalletId, setSelectedPalletId] = useState<string | null>(null);
    const [qrToPrint, setQrToPrint] = useState<Pallet[] | null>(null);

    // `silent` is for refetches the user did not ask for -- the realtime
    // callback. Flipping palletsLoading back to true there would tear the whole
    // dashboard down to skeletons every time any row changes anywhere, so a
    // background sync would look identical to a page load. The visible result of
    // a silent refetch is only ever the new numbers appearing.
    const loadData = async (opts?: { silent?: boolean }) => {
        const silent = opts?.silent ?? false;
        if (!silent) {
            setPalletsLoading(true);
            setHasLoadError(false);
        }
        try {
            const data = await fetchPallets();
            setPallets(data);
            // Cleared on success even when silent: if a background retry gets
            // through, the banner from the failure before it is stale.
            setHasLoadError(false);
        } catch (err) {
            // The real error goes to the console for whoever is debugging; the
            // user gets the dictionary's generic message rather than a Supabase
            // string, which is the same trade services/appError.ts makes.
            console.error('Failed to load pallets', err);
            setHasLoadError(true);
        } finally {
            if (!silent) setPalletsLoading(false);
        }
    };

    // Holds the pending trailing-edge refetch so a burst of realtime events
    // collapses into one, and so an unmount can cancel it.
    const refetchTimer = useRef<number | null>(null);

    useEffect(() => {
        loadData();

        // Subscribe to Realtime Updates
        const subscription = subscribeToPallets(() => {
            if (refetchTimer.current !== null) window.clearTimeout(refetchTimer.current);
            refetchTimer.current = window.setTimeout(() => {
                refetchTimer.current = null;
                loadData({ silent: true });
            }, REALTIME_REFETCH_DEBOUNCE_MS);
        });

        return () => {
            // Cancel alongside removeChannel, not instead of it: dropping the
            // channel stops new events but leaves an already-scheduled timer
            // armed, and it would fire setState on an unmounted component.
            if (refetchTimer.current !== null) window.clearTimeout(refetchTimer.current);
            supabase.removeChannel(subscription);
        };
    }, []);

    const handleLogout = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    const selectedPallet = useMemo(() => {
        return pallets.find(p => p.pallet_id === selectedPalletId);
    }, [pallets, selectedPalletId]);

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <DashboardHome
                    pallets={pallets}
                    palletsLoading={palletsLoading}
                    palletsError={palletsError}
                    onNavigateToInventory={(filter, loc) => {
                        setActiveTabState('inventory');
                        setInventoryFilterState(filter);
                        setInventoryLocationState(loc || 'all');
                        updateUrl('inventory', filter, loc || 'all');
                    }}
                    // The dashboard's dormant and repeat-offender tables list
                    // pallet ids, and the detail modal is owned here, so the row
                    // click has to come back up to this state.
                    onSelectPallet={(id) => setSelectedPalletId(id)}
                />;
            case 'inventory':
                return <InventoryView
                    pallets={pallets}
                    // Wrapped rather than passed by reference: loadData now takes
                    // an options object, and handing it straight to a callback
                    // that is ever wired to onClick would pass a MouseEvent as
                    // `opts`.
                    onRefresh={() => loadData()}
                    onSelectPallet={(id) => setSelectedPalletId(id)}
                    onPrintQr={(items) => setQrToPrint(items)}
                    initialFilter={inventoryFilter}
                    initialLocation={inventoryLocation}
                    onLocationChange={(loc) => setInventoryLocation(loc)}
                    // Previously unwired, so the status strip and table had no
                    // way to know a fetch was in flight and read "No pallets
                    // found" for a moment on every first load.
                    isLoading={palletsLoading}
                />;
            case 'transactions':
                return <TransactionView />;
            case 'users':
                return <UserView />;
            case 'locations':
                return <LocationView />;
            case 'settings':
                return <SettingsView />;
            default:
                return <DashboardHome pallets={pallets} palletsLoading={palletsLoading} palletsError={palletsError} onNavigateToInventory={(filter, loc) => { setInventoryFilter(filter); setInventoryLocation(loc || 'all'); setActiveTab('inventory'); }} onSelectPallet={(id) => setSelectedPalletId(id)} />;
        }
    };

    return (
        // min-h-dvh, not min-h-screen: on mobile `100vh` is the viewport with the
        // browser chrome hidden, so the shell overhangs by the height of the URL
        // bar until you scroll. `dvh` tracks the chrome as it collapses. This
        // matters more than usual here because index.html pins
        // `maximum-scale=1.0, user-scalable=no`, so the user cannot zoom out of
        // the overhang.
        //
        // The breakpoint moves md -> lg throughout this file. At 768-1023 the old
        // md: shell had already committed 256px to a permanent sidebar while the
        // dashboard grid inside it was still stacking at one column, so that band
        // rendered a narrower content well (704px at 1024) than the drawer layout
        // gives at 768 (736px) -- full-width cards in a single file. Holding the
        // drawer until 1024 keeps the shell and the page breaking together.
        <div className="min-h-dvh app-canvas flex flex-col lg:flex-row font-sans text-slate-900 relative">

            <AdminSidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
                currentUser={currentUser}
                onLogout={handleLogout}
            />

            {/* No h-screen and no overflow here. There used to be three nested
                scroll containers -- this one, the dashboard's own
                h-[calc(100vh-70px)] box, and an overflow-y-auto inside that --
                which is why the scrollbar never lined up with the page and why
                the wheel would stop dead at a boundary. The document is now the
                only thing that scrolls. It is also the only arrangement that can
                print: a box clamped to 100vh has nothing below the fold to send
                to the printer, so a report would come out one screen long. */}
            {/* min-w-0 is load-bearing, not tidying. A flex item's min-width
                defaults to `auto`, which means it refuses to shrink below the
                intrinsic width of its own content -- so one wide table or one
                long button row anywhere inside pushes this column past the
                viewport, scrolls the page sideways, and squeezes the sidebar
                until its Thai labels break mid-word. The old `overflow-auto`
                on <main> used to mask this by making the column a scroll
                container; removing it to get a single document scroller is
                what exposed it. */}
            {/* xl:overflow-x-clip ตัดส่วนที่ StickyHeader ยืดพื้นหลังออกไปนอกจอ
                (ดู components/ui/StickyHeader.tsx) ถ้าไม่ตัด ::before ที่กว้าง
                100vw ทั้งสองข้างจะไปเพิ่มพื้นที่เลื่อนแนวนอนให้เอกสาร แล้วจะมี
                สกรอลล์บาร์ล่างโผล่มาทั้งแอป

                `clip` ไม่ใช่ `hidden` และไม่ใช่แค่ความชอบ: `hidden` สร้าง scroll
                container ขึ้นมา ทำให้ทั้ง StickyHeader และหัวตารางไปเกาะกับกล่องนี้
                แทน viewport แล้วก็เลิกเกาะได้เลย -- เหตุผลเดียวกับที่ DataTable.tsx
                เลือก overflow-clip ไว้ที่การ์ดตาราง (บรรทัด 101-105)

                วางไว้ที่คอลัมน์นี้ ไม่ใช่ที่ <main> เพราะ overflow ตัดที่ padding
                box ส่วน <main> มี lg:p-8 ช่องว่าง 32px ที่ต้องการให้พื้นหลังคลุม
                จึงจะโดนตัดทิ้งไปพอดี คอลัมน์นี้ไม่มี padding padding box จึงเท่ากับ
                ขอบคอลัมน์ -- พื้นหลังกินได้ตั้งแต่ขอบ sidebar ถึงขอบจอขวา */}
            <div className="flex-1 min-w-0 flex flex-col min-h-dvh xl:overflow-x-clip">
                {/* print:hidden for the same reason the sidebar is: chrome, not
                    content. */}
                <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between gap-3 sticky top-0 z-10 print:hidden">
                    <BrandMark className="h-5 w-auto" />
                    <div className="flex items-center gap-2">
                        {/* Was mounted only in AuthShell, so the language could be
                            chosen on the sign-in screen and never again -- an
                            admin who signed in was stuck with whatever they
                            picked. The sidebar footer carries the desktop copy. */}
                        <LanguageToggle />
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            aria-label={t.nav.menu}
                            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                        >
                            <Menu size={24} />
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-4 lg:p-8 relative">
                    <div className="max-w-7xl min-w-0 mx-auto">
                        {/* Sits in the shell rather than in DashboardHome because
                            `pallets` feeds inventory too: if the fetch failed,
                            every tab is showing an empty list, not just this one.
                            Same banner shape as the sign-in screen. */}
                        {palletsError && (
                            <div
                                role="alert"
                                className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700 animate-auth-banner-in mb-6"
                            >
                                <CircleAlert size={16} className="mt-0.5 shrink-0 text-red-500" />
                                <span className="flex-1">{palletsError}</span>
                                {/* A dead-end error banner leaves reloading the
                                    whole page as the only way out. */}
                                <button
                                    type="button"
                                    onClick={() => loadData()}
                                    disabled={palletsLoading}
                                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1 font-semibold text-red-700 transition hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <RefreshCw size={14} className={palletsLoading ? 'animate-spin' : ''} />
                                    {t.common.retry}
                                </button>
                            </div>
                        )}
                        {renderContent()}
                    </div>
                </main>
            </div>

            {qrToPrint && (
                <QRPrintModal
                    pallets={qrToPrint}
                    onClose={() => setQrToPrint(null)}
                />
            )}

            {selectedPallet && (
                <PalletDetailModal
                    pallet={selectedPallet}
                    onClose={() => setSelectedPalletId(null)}
                />
            )}
        </div>
    );
};

export default AdminDashboard;
