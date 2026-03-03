import React from 'react';
import { LayoutDashboard, Package, Users, Settings, LogOut, X, History, MapPinned } from 'lucide-react';
import { User } from '../../types';

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

    const NavItem = ({ id, label, icon }: { id: string, label: string, icon: any }) => (
        <button
            onClick={() => {
                setActiveTab(id);
                setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${activeTab === id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
        >
            {icon}
            <span>{label}</span>
        </button>
    );

    return (
        <>
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden animate-in fade-in duration-200"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            <div className={`
                fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col 
                transition-transform duration-300 ease-in-out print:hidden
                md:translate-x-0 md:static md:h-screen
                ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
            `}>
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-blue-200">
                            N
                        </div>
                        <span className="font-bold text-xl tracking-tight text-gray-800">NMT System</span>
                    </div>
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="md:hidden text-gray-500 hover:text-gray-700 p-1"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 p-4 space-y-1 overflow-y-auto styled-scrollbar">
                    <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2">Menu</p>
                    <NavItem id="dashboard" label="Dashboard" icon={<LayoutDashboard size={20} />} />
                    <NavItem id="inventory" label="Inventory" icon={<Package size={20} />} />
                    <NavItem id="transactions" label="Transactions" icon={<History size={20} />} />
                    <NavItem id="users" label="Users" icon={<Users size={20} />} />
                    <NavItem id="locations" label="Locations" icon={<MapPinned size={20} />} />

                    <div className="my-4 border-t border-gray-100"></div>
                    <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">System</p>
                    <NavItem id="settings" label="Settings" icon={<Settings size={20} />} />
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                            {currentUser?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{currentUser?.full_name || 'User'}</p>
                            <p className="text-xs text-gray-500 truncate">{currentUser?.role || 'Role'}</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition text-sm font-bold"
                    >
                        <LogOut size={16} /> Sign Out
                    </button>
                </div>
            </div>
        </>
    );
};
