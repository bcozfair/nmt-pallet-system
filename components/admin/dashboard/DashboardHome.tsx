import React, { useState, useEffect, useMemo } from 'react';
import { Pallet, Transaction } from '../../../types';
import { fetchPalletHistory } from '../../../services/transactionService';
import { formatDateTime } from '../common/AdminHelpers';

// New Components
import { DashboardHeader } from './DashboardHeader';
import { DashboardStatsGrid } from './DashboardStatsGrid';
import { FleetHealthCard } from './FleetHealthCard';
import { ActivityTrendCard } from './ActivityTrendCard';
import { HighRiskZoneCard } from './HighRiskZoneCard';
import { LocationUsageCard } from './LocationUsageCard';

export const DashboardHome = ({ pallets, onNavigateToInventory }: { pallets: Pallet[], onNavigateToInventory: (filter: string, location?: string) => void }) => {
    const [overdueThreshold, setOverdueThreshold] = useState(7);
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        const setting = localStorage.getItem('nmt_setting_overdue_days');
        if (setting) setOverdueThreshold(parseInt(setting));

        fetchPalletHistory('').then(t => setTransactions(t));
    }, []);

    const stats = {
        total: pallets.length,
        available: pallets.filter(p => p.status === 'available').length,
        in_use: pallets.filter(p => p.status === 'in_use').length,
        damaged: pallets.filter(p => p.status === 'damaged').length,
    };

    const overdueCount = pallets.filter(p => {
        if (p.status !== 'in_use' || !p.last_checkout_date) return false;
        const days = (new Date().getTime() - new Date(p.last_checkout_date).getTime()) / (1000 * 3600 * 24);
        return days > overdueThreshold;
    }).length;

    const utilizationRate = stats.total > 0 ? ((stats.in_use / stats.total) * 100).toFixed(1) : "0";

    const velocity7Days = useMemo(() => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return transactions.filter(t =>
            t.action_type === 'check_out' && new Date(t.timestamp) >= weekAgo
        ).length;
    }, [transactions]);


    return (
        <div id="dashboard-printable-area" className="h-[calc(100vh-70px)] flex flex-col gap-6 overflow-hidden animate-in fade-in duration-500 pb-10">
            {/* 1. Header with Actions */}
            <div className="shrink-0">
                <DashboardHeader
                    stats={{
                        ...stats,
                        overdueCount,
                        utilizationRate,
                        velocity7Days
                    }}
                />
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-2 flex flex-col gap-6 styled-scrollbar">
                {/* 2. Top Stats Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <DashboardStatsGrid
                        stats={{
                            total: stats.total,
                            utilizationRate,
                            velocity7Days,
                            overdueCount
                        }}
                    />

                    <FleetHealthCard stats={stats} />
                </div>

                {/* 3. Middle Section: Activity & Risk */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <ActivityTrendCard
                        transactions={transactions}
                        pallets={pallets}
                    />

                    <HighRiskZoneCard
                        pallets={pallets}
                        overdueThreshold={overdueThreshold}
                        onNavigateToInventory={onNavigateToInventory}
                    />
                </div>

                {/* 4. Bottom Section: Location Usage */}
                <div className="grid grid-cols-1 gap-6">
                    <LocationUsageCard
                        pallets={pallets}
                        onNavigateToInventory={onNavigateToInventory}
                    />
                </div>

                <div className="hidden print:block text-center text-xs text-gray-400 mt-10">
                    Printed from NMT Pallet Management System on {formatDateTime(new Date())}
                </div>
            </div>
        </div>
    );
};

