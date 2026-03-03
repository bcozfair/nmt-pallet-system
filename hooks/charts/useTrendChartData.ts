
import { useMemo } from 'react';
import { Pallet, Transaction } from '../../types';

export const useTrendChartData = (
    transactions: Transaction[],
    pallets: Pallet[],
    period: 'day' | 'week' | 'month'
) => {
    return useMemo(() => {
        const now = new Date();
        const dataPoints: { label: string, checkOut: number, checkIn: number, damage: number, acquisition: number }[] = [];
        const daysToShow = period === 'day' ? 7 : period === 'week' ? 8 : 12;

        for (let i = daysToShow - 1; i >= 0; i--) {
            const date = new Date();
            let label = '';
            let filterFn = (dateStr: string) => false;

            if (period === 'day') {
                date.setDate(now.getDate() - i);
                label = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
                filterFn = (dateStr) => new Date(dateStr).toDateString() === date.toDateString();
            } else if (period === 'week') {
                date.setDate(now.getDate() - (i * 7));
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());

                const d = weekStart.getDate();
                const m = weekStart.getMonth() + 1;
                const w = Math.ceil(d / 7);
                label = `W${w}/${m}`;

                filterFn = (dateStr) => {
                    const tDate = new Date(dateStr);
                    const diff = Math.floor((tDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
                    return diff >= 0 && diff < 7;
                };
            } else {
                date.setMonth(now.getMonth() - i);
                label = date.toLocaleDateString('en-US', { month: 'short' });
                filterFn = (dateStr) => {
                    const tDate = new Date(dateStr);
                    return tDate.getMonth() === date.getMonth() && tDate.getFullYear() === date.getFullYear();
                };
            }

            const relevantTx = transactions.filter(t => filterFn(t.timestamp));
            const relevantAcq = pallets.filter(p => p.created_at ? filterFn(p.created_at) : false);

            dataPoints.push({
                label,
                checkOut: relevantTx.filter(t => t.action_type === 'check_out').length,
                checkIn: relevantTx.filter(t => t.action_type === 'check_in').length,
                damage: relevantTx.filter(t => t.action_type === 'report_damage').length,
                acquisition: relevantAcq.length
            });
        }
        return dataPoints;
    }, [transactions, pallets, period]);
};
