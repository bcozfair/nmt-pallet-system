import React from 'react';
import { Package, Activity, Zap, Clock } from 'lucide-react';
import { StatCard } from '../common/AdminHelpers';
import { useT } from '../../../hooks/useT';

interface DashboardStatsGridProps {
    stats: {
        total: number;
        utilizationRate: string;
        velocity7Days: number;
        overdueCount: number;
    };
    /** The same threshold overdueCount was computed against. Passed in rather
     *  than assumed: the caption used to hard-code "> 7 Days" while the number
     *  above it followed the configured value, so setting 14 made the card lie. */
    overdueThreshold: number;
}

export const DashboardStatsGrid: React.FC<DashboardStatsGridProps> = ({ stats, overdueThreshold }) => {
    const t = useT();

    return (
        <div className="grid grid-cols-2 gap-4 h-[320px]">
            <StatCard
                title={t.dashboard.totalFleetSize}
                value={stats.total}
                icon={<Package />}
                color="bg-purple-500"
                subtitle={t.dashboard.totalAssetUnits}
            />
            <StatCard
                title={t.dashboard.utilizationRate}
                value={`${stats.utilizationRate}%`}
                icon={<Activity />}
                color="bg-blue-500"
                trend={t.dashboard.utilizationTrend}
                subtitle={t.dashboard.utilizationSub}
            />
            <StatCard
                title={t.dashboard.velocity}
                value={stats.velocity7Days}
                icon={<Zap />}
                color="bg-amber-500"
                subtitle={t.dashboard.velocitySub}
                trend={t.dashboard.velocityTrend}
            />
            <StatCard
                title={t.dashboard.criticalOverdue}
                value={stats.overdueCount}
                icon={<Clock />}
                color="bg-red-500"
                subtitle={t.dashboard.criticalOverdueSub(overdueThreshold)}
                trend={t.dashboard.criticalOverdueTrend}
            />
        </div>
    );
};
