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

// The scrapped footnote's two states. Complete class sets picked between by one
// ternary rather than a base plus an appended override: both carry the same
// properties (text colour, and the active one adds a border colour and a fill),
// and an appended class does not beat one already in the base string -- the
// winner is decided by the order of the built stylesheet. See Button.tsx:53-59.
//
// The active treatment is the same brand border + brand tint the four tiles
// above wear when selected (StatTile.tsx), so "this filter is on" looks the
// same whichever control turned it on.
const NOTE_ACTIVE =
    'inline-block rounded-xl border border-brand-500 bg-brand-50 px-2.5 py-1.5 ' +
    'text-xs leading-relaxed text-brand-800';
const NOTE_IDLE = 'text-xs leading-relaxed text-slate-500';

const NOTE_LINK_ACTIVE =
    'rounded-md font-semibold text-brand-700 underline underline-offset-2 ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';
const NOTE_LINK_IDLE =
    'rounded-md font-medium text-brand-700 underline-offset-2 hover:underline ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';

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

    // 'scrapped' is the one status with no tile of its own, so when it is the
    // active filter none of the four tiles is selected and the strip shows no
    // sign that anything is filtered at all. Worse, the row that leads here was
    // gated on `counts.scrapped > 0`, and that count is taken after the search
    // box is applied -- so searching for a term no scrapped pallet matches made
    // the last trace of the active filter disappear, leaving an empty table
    // with nothing on screen saying why. Rendering the row whenever the filter
    // is on, count or no count, is what closes that: at zero it reads
    // "0 pallets scrapped", which is the answer to the question the empty table
    // raises.
    const scrappedActive = statusFilter === 'scrapped';
    const showScrappedNote = counts.scrapped > 0 || scrappedActive;

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
                {showScrappedNote && (
                    <p className={scrappedActive ? NOTE_ACTIVE : NOTE_IDLE}>
                        {t.inventory.scrappedNote(counts.scrapped)}{' '}
                        {/* `aria-pressed` rather than a second sentence saying
                            "currently viewing": it is the same toggle contract
                            the four tiles above use, so the active state reaches
                            a screen reader without the visual treatment being
                            the only carrier of it. Pressing it while pressed
                            returns to 'all', which is the way back out of a
                            filter that has no tile to click again. */}
                        <button
                            type="button"
                            aria-pressed={scrappedActive}
                            onClick={() => onSelect(scrappedActive ? 'all' : 'scrapped')}
                            className={scrappedActive ? NOTE_LINK_ACTIVE : NOTE_LINK_IDLE}
                        >
                            {t.inventory.viewScrapped}
                        </button>
                    </p>
                )}
            </div>
        </div>
    );
};
