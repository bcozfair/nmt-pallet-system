import React from 'react';
import { Package, Activity, Zap, Clock } from 'lucide-react';
import { StatCard } from '../common/AdminHelpers';

interface DashboardStatsGridProps {
    stats: {
        total: number;
        utilizationRate: string;
        velocity7Days: number;
        overdueCount: number;
    };
}

export const DashboardStatsGrid: React.FC<DashboardStatsGridProps> = ({ stats }) => {
    return (
        <div className="grid grid-cols-2 gap-4 h-[320px]">
            <StatCard
                title="Total Fleet Size"
                value={stats.total}
                icon={<Package />}
                color="bg-purple-500"
                subtitle="Total Asset Units"
            />
            <StatCard
                title="Utilization Rate"
                value={`${stats.utilizationRate}%`}
                icon={<Activity />}
                color="bg-blue-500"
                trend="Efficiency"
                subtitle="Active / Total"
            />
            <StatCard
                title="7-Day Velocity"
                value={stats.velocity7Days}
                icon={<Zap />}
                color="bg-amber-500"
                subtitle="Checkouts / Week"
                trend="Throughput"
            />
            <StatCard
                title="Critical Overdue"
                value={stats.overdueCount}
                icon={<Clock />}
                color="bg-red-500"
                subtitle="> 7 Days Inactive"
                trend="Action Needed"
            />
        </div>
    );
};
