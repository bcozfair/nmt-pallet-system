import React from 'react';
import { AlarmClock, Boxes, Gauge, Wrench } from 'lucide-react';
import { Skeleton, SkeletonTile, StatTile } from '../../../ui';
import { useT } from '../../../../hooks/useT';
import type { FleetStats } from '../../../../services/analytics/dashboardAnalytics';

export interface KpiRowProps {
    fleet: FleetStats | null;
    overdueDays: number;
    isLoading: boolean;
    isRefreshing?: boolean;
    onNavigate: (filter: string, location?: string) => void;
}

// The four current-state figures at the top of the dashboard, plus the one figure
// that is deliberately not among them.
//
// Four tiles, not six. `available` and `in_use` were dropped when the fleet-health
// donut was kept: the donut already carries those two as PROPORTIONS of the whole,
// which is the reading that matters ("most of the fleet is sitting idle"), and a
// bare count of the same thing two cards apart just makes the reader check whether
// the numbers agree. What is left is the four figures that prompt an action.
//
// 2 x 2 up to xl. At 1024px the content column is only 704px wide -- narrower than
// at 768px, because the sidebar starts taking 256px at lg -- so four across would
// give each tile 176px, which a two-line Thai label does not fit.
//
// `print-paper-tiles` is the paper's own answer to the same question, and it has
// to be a separate class from the one the chart grids use: a tile is a label and
// a figure, so four fit across a landscape sheet where two chart cards is the
// limit. Without it the printed row was whatever `xl:` happened to say about the
// reader's window -- two enormous tiles across a landscape page, or four squeezed
// into 175px each on a portrait one. See the block in index.css.
const GRID = 'print-paper-tiles grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4';

// What a figure reads as when there is no snapshot to read it from. Never `0`:
// zero is a measurement, and painting one for "we do not know yet" is the exact
// bug this row replaces -- the old dashboard rendered a full grid of zeros on
// every mount and then swapped in the real numbers a moment later, which looks
// identical to a warehouse that has just lost its entire fleet.
const NO_VALUE = '—';

export const KpiRow: React.FC<KpiRowProps> = ({
    fleet,
    overdueDays,
    isLoading,
    isRefreshing = false,
    onNavigate,
}) => {
    const t = useT();
    const kpi = t.dashboard.analytics.kpi;

    if (isLoading) {
        // The identical grid string, and SkeletonTile shares STAT_TILE_BOX with
        // the real tile, so the loaded row lands in exactly the pixels the
        // placeholder occupied and nothing below it moves.
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

    // Clamped, because the bar is a picture of the percentage and a picture
    // cannot be 103% long. The number in the tile stays whatever it is.
    const utilisation = fleet ? Math.min(100, Math.max(0, fleet.utilisationPct)) : 0;

    return (
        // Dimmed, not replaced. This app re-fetches on every realtime pallet row
        // change, so a 30-pallet bulk check-out arrives as a burst of updates --
        // swapping in skeletons would strobe the whole row thirty times. Holding
        // the previous frame at reduced opacity shows the same numbers, slightly
        // greyed, until the new ones replace them in place.
        <div
            className={`transition-opacity duration-200 ${isRefreshing ? 'opacity-60' : ''}`}
            aria-busy={isRefreshing}
        >
            <div className={GRID}>
                {/* 1. The hero. `size` is a real prop now: the wrapper used to
                    carry `[&>div>p]:text-4xl`, which reached through StatTile's
                    own markup from the outside and would have silently stopped
                    working the day that markup changed. */}
                <StatTile
                    label={kpi.totalFleet}
                    value={fleet ? fleet.total : NO_VALUE}
                    caption={kpi.totalFleetCaption}
                    icon={Boxes}
                    tone="brand"
                    size="hero"
                />
                {/* 2. Utilisation, with the meter drawn inside the tile.
                    The bar carries no ARIA: the percentage it draws is already
                    the tile's value, and a progressbar role would make a screen
                    reader announce the same figure twice. */}
                <StatTile
                    label={kpi.utilisation}
                    value={fleet ? `${fleet.utilisationPct}%` : NO_VALUE}
                    caption={kpi.utilisationCaption}
                    icon={Gauge}
                    tone="brand"
                    meterPct={utilisation}
                />

                {/* 3. The caption states the configured threshold rather than
                    saying "the configured threshold", because a count of late
                    pallets means nothing without the number it is late against
                    -- and that number is an admin setting, not a constant.
                    See the note at the foot of this file on where the string
                    comes from. */}
                <StatTile
                    label={kpi.overdue}
                    value={fleet ? fleet.overdue : NO_VALUE}
                    caption={kpi.overdueCaption(overdueDays)}
                    icon={AlarmClock}
                    tone="critical"
                    onClick={() => onNavigate('overdue')}
                />

                {/* 4. Amber, not red. Overdue is the figure that needs someone to
                    act today; damaged is a queue. Two reds would say they are
                    equally urgent. */}
                <StatTile
                    label={kpi.damaged}
                    value={fleet ? fleet.damaged : NO_VALUE}
                    caption={kpi.damagedCaption}
                    icon={Wrench}
                    tone="warning"
                    onClick={() => onNavigate('damaged')}
                />
            </div>

            {/* Scrapped is a footnote and must never become a fifth tile.
                It is excluded from `fleet.total` and from the utilisation
                divisor everywhere in this codebase, so a tile would give it the
                same visual weight as four numbers it is deliberately absent from
                -- and a reader would then try to make the four add up to a total
                that does not contain it. The line is reserved (min-h-4) even
                when there is nothing to say, so the panels below it do not jump
                when the snapshot lands. */}
            <div className="mt-3 min-h-4">
                {fleet && (
                    <p className="text-xs leading-relaxed text-slate-500">{kpi.scrappedNote(fleet.scrapped)}</p>
                )}
            </div>
        </div>
    );
};

// Note on the overdue caption: `kpi.overdueCaption` takes the threshold as an
// argument rather than saying "the configured threshold" in the abstract. The
// number is the point of the tile -- an admin who has just changed it in
// Settings needs to see this count move with it -- and writing it as a function
// rather than concatenating a bare number onto a translated sentence is what
// lets Thai put the unit where Thai puts it.
