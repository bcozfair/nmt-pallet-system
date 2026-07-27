import React from 'react';
import { Activity, AlertTriangle, Boxes, CircleCheck } from 'lucide-react';
import { Skeleton, SkeletonTile, StatTile } from '../../ui';
import { useT } from '../../../hooks/useT';

export interface InventoryStatusStripProps {
    counts: { all: number; available: number; in_use: number; damaged: number; scrapped: number };
    statusFilter: string;
    onSelect: (status: string) => void;
    isLoading?: boolean;
}

// Same grid as the dashboard's KpiRow: 2 x 2 up to xl, because at 1024px the
// sidebar has already taken 256px and four-across would leave each tile too
// narrow for a two-line Thai label.
const GRID = 'grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4';

// The four working-fleet counts above the table, each one a filter switch:
// clicking a tile is the same action as picking that value in the status
// filter, and the tile shows exactly how many rows that click produces. See
// hooks/inventory/useInventoryFilters.ts -- these come from `statusCounts`,
// which is computed BEFORE the status filter is applied, so the unselected
// tiles keep their real numbers instead of collapsing to 0 once one is picked.
export const InventoryStatusStrip: React.FC<InventoryStatusStripProps> = ({
    counts,
    statusFilter,
    onSelect,
    isLoading = false,
}) => {
    const t = useT();

    if (isLoading) {
        return (
            <div>
                <div className={GRID}>
                    {/* Only the first placeholder announces itself. Four live
                        regions would have a screen reader say "loading" four
                        times for one row; the rest are decoration. */}
                    <SkeletonTile ariaLabel={t.common.loading} />
                    <SkeletonTile />
                    <SkeletonTile />
                    <SkeletonTile />
                </div>
                <div className="mt-3 min-h-4">
                    <Skeleton className="h-3 w-56 max-w-full" />
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className={GRID}>
                <StatTile
                    label={t.inventory.allActive}
                    value={counts.all}
                    icon={Boxes}
                    tone="brand"
                    onClick={() => onSelect('all')}
                    selected={statusFilter === 'all'}
                />
                <StatTile
                    label={t.status.available}
                    value={counts.available}
                    icon={CircleCheck}
                    tone="accent"
                    onClick={() => onSelect('available')}
                    selected={statusFilter === 'available'}
                />
                <StatTile
                    label={t.status.in_use}
                    value={counts.in_use}
                    icon={Activity}
                    tone="neutral"
                    onClick={() => onSelect('in_use')}
                    selected={statusFilter === 'in_use'}
                />
                <StatTile
                    label={t.status.damaged}
                    value={counts.damaged}
                    icon={AlertTriangle}
                    tone="warning"
                    onClick={() => onSelect('damaged')}
                    selected={statusFilter === 'damaged'}
                />
            </div>

            {/* Scrapped is a footnote and must never become a fifth tile. It is
                excluded from `statusCounts.all` and from every fleet total and
                utilisation divisor elsewhere in this codebase (see the 'all'
                comment in useInventoryFilters.ts), so a tile would give it the
                same visual weight as four numbers it is deliberately absent
                from -- and a reader would then try to make the four add up to
                a total that does not contain it. Same reasoning KpiRow.tsx
                records for the dashboard's version of this row. `min-h-4`
                reserves the line even when there is nothing to say, so the
                filters and table below do not jump once the count arrives. */}
            <div className="mt-3 min-h-4">
                {counts.scrapped > 0 && (
                    <p className="text-xs leading-relaxed text-slate-500">
                        {t.inventory.scrappedNote(counts.scrapped)}{' '}
                        <button
                            type="button"
                            onClick={() => onSelect('scrapped')}
                            className="rounded-md font-medium text-brand-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                        >
                            {t.inventory.viewScrapped}
                        </button>
                    </p>
                )}
            </div>
        </div>
    );
};
