import React from 'react';
import { LogOut, ArrowRightCircle, ArrowLeftCircle, AlertTriangle, User as UserIcon, History } from 'lucide-react';
import { User } from '../../types';
import { MobileMode } from './MobileInterface';

interface MobileHomeProps {
    user: User;
    onLogout: () => void;
    onSetMode: (mode: MobileMode) => void;
}

export const MobileHome = ({ user, onLogout, onSetMode }: MobileHomeProps) => {
    return (
        <div className="flex flex-col h-[calc(100vh-56px)] bg-gray-100">
            {/* Header */}
            <div className="bg-white p-4 shadow-sm flex justify-between items-center z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 shadow-inner">
                        <UserIcon size={20} />
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-800 leading-tight">{user.full_name}</h2>
                        <span className="text-xs text-gray-500 uppercase tracking-wider">{user.department}</span>
                    </div>
                </div>
                <button onClick={onLogout} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition">
                    <LogOut size={24} />
                </button>
            </div>

            {/* Main Actions */}
            <div className="flex-1 p-6 flex flex-col justify-center gap-6 overflow-y-auto">

                {/* Check Out Card */}
                <button
                    onClick={() => onSetMode('checkout_select_dept')}
                    className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-200 p-6 flex flex-col items-center justify-center gap-4 hover:shadow-xl hover:border-blue-400 transition active:scale-95 group relative overflow-hidden min-h-[160px]"
                >
                    <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition duration-500"></div>
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition shadow-sm z-10">
                        <ArrowRightCircle size={40} />
                    </div>
                    <div className="text-center z-10">
                        <h3 className="text-2xl font-bold text-gray-800 mb-1">Check Out</h3>
                        <p className="text-sm text-gray-500 font-medium">To Department</p>
                    </div>
                </button>

                {/* Check In Card */}
                <button
                    onClick={() => onSetMode('checkin_scanning')}
                    className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-200 p-6 flex flex-col items-center justify-center gap-4 hover:shadow-xl hover:border-green-400 transition active:scale-95 group relative overflow-hidden min-h-[160px]"
                >
                    <div className="absolute inset-0 bg-green-50 opacity-0 group-hover:opacity-100 transition duration-500"></div>
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition shadow-sm z-10">
                        <ArrowLeftCircle size={40} />
                    </div>
                    <div className="text-center z-10">
                        <h3 className="text-2xl font-bold text-gray-800 mb-1">Check In</h3>
                        <p className="text-sm text-gray-500 font-medium">Return to Warehouse</p>
                    </div>
                </button>

                {/* My History Card */}
                <button
                    onClick={() => onSetMode('history')}
                    className="h-24 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-between px-8 hover:bg-indigo-100 hover:shadow-md active:scale-95 transition group shrink-0"
                >
                    <div className="flex flex-col text-left">
                        <span className="font-bold text-indigo-700 text-lg group-hover:text-indigo-800">My History</span>
                        <span className="text-xs text-indigo-500 group-hover:text-indigo-600 font-medium">View Recent Activity</span>
                    </div>
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-indigo-500">
                        <History size={24} />
                    </div>
                </button>

                {/* Damage Report Card */}
                <button
                    onClick={() => onSetMode('damage_scanning')}
                    className="h-24 bg-red-50 rounded-2xl border border-red-100 flex items-center justify-between px-8 hover:bg-red-100 hover:shadow-md active:scale-95 transition group shrink-0"
                >
                    <div className="flex flex-col text-left">
                        <span className="font-bold text-red-700 text-lg group-hover:text-red-800">Report Damage</span>
                        <span className="text-xs text-red-500 group-hover:text-red-600 font-medium">Scan & Upload Evidence</span>
                    </div>
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <AlertTriangle className="text-red-500" size={24} />
                    </div>
                </button>

            </div>

            <div className="p-4 text-center text-[10px] text-gray-400 uppercase tracking-widest font-semibold shrink-0">
                NMT Pallet System v1.1
            </div>
        </div>
    );
};
