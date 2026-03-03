import React, { useState, useEffect, useMemo } from 'react';
import { Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchPallets, subscribeToPallets } from '../../services/palletService';
import { supabase } from '../../services/supabase';
import { Pallet } from '../../types';
import { DashboardHome } from './dashboard/DashboardHome';
import { InventoryView } from './inventory/InventoryView';
import { TransactionView } from './transactions/TransactionView';
import { AdminSidebar } from './AdminSidebar';
import { UserView } from './users/UserView';
import { LocationView } from './locations/LocationView';
import SettingsView from './settings/SettingsView';
import { QRPrintModal } from './modals/QRPrintModal';
import { PalletDetailModal } from './modals/PalletDetailModal';

const AdminDashboard = () => {
    const { user: currentUser, signOut } = useAuth();
    // Initialize state from URL
    const queryParams = new URLSearchParams(window.location.search);
    const initialTab = queryParams.get('tab') || 'dashboard';
    const initialFilter = queryParams.get('filter') || 'all';
    const initialLoc = 'all'; // Always start with 'all' on refresh/login as requested

    const [activeTab, setActiveTabState] = useState(initialTab);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [pallets, setPallets] = useState<Pallet[]>([]);

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

    const loadData = async () => {
        const data = await fetchPallets();
        setPallets(data);
    };

    useEffect(() => {
        loadData();

        // Subscribe to Realtime Updates
        const subscription = subscribeToPallets(() => {
            loadData();
        });

        return () => {
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
                    onNavigateToInventory={(filter, loc) => {
                        setActiveTabState('inventory');
                        setInventoryFilterState(filter);
                        setInventoryLocationState(loc || 'all');
                        updateUrl('inventory', filter, loc || 'all');
                    }}
                />;
            case 'inventory':
                return <InventoryView
                    pallets={pallets}
                    onRefresh={loadData}
                    onSelectPallet={(id) => setSelectedPalletId(id)}
                    onPrintQr={(items) => setQrToPrint(items)}
                    initialFilter={inventoryFilter}
                    initialLocation={inventoryLocation}
                    onLocationChange={(loc) => setInventoryLocation(loc)}
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
                return <DashboardHome pallets={pallets} onNavigateToInventory={(filter, loc) => { setInventoryFilter(filter); setInventoryLocation(loc || 'all'); setActiveTab('inventory'); }} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans text-gray-900 relative">

            <AdminSidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
                currentUser={currentUser}
                onLogout={handleLogout}
            />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-10">
                    <span className="font-bold text-lg">NMT System</span>
                    <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                        <Menu size={24} />
                    </button>
                </header>

                <main className="flex-1 overflow-auto p-4 md:p-8 relative">
                    <div className="max-w-7xl mx-auto">
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
