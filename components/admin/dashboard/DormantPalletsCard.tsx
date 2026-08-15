import React from 'react';
import { Moon } from 'lucide-react';

import { Card, EmptyState, SectionHeader, SkeletonRows } from '../../ui';
import { StatusBadge } from '../common/AdminHelpers';
import { AsOfNowChip } from './RangeMenu';
import { useT } from '../../../hooks/useT';
import type { DormantPallet } from '../../../services/analytics/dashboardAnalytics';

/**
 * Pallets nobody has touched, longest first.
 *
 * ============================ WHY IT LIVES HERE =============================
 *
 * It was the third card of LifecycleSection, whose header still describes the
 * trio it belonged to: how long a pallet stays out (dwell), how far past the
 * threshold the late ones are (overdue ageing), and which ones have had no
 * transaction at all (this). That grouping is sound and it is why this file
 * carries the note rather than deleting it.
 *
 * It moved because the SECTIONS ARE INVISIBLE TO THE READER. Nothing on screen
 * separates one from the next -- the deep-dive panel renders four sections as
 * one continuous list of cards with no headings between them -- so the section
 * boundary was doing no work for anyone except the file layout. What the reader
 * actually saw was this full-width table immediately followed by another
 * full-width chart, two heavy blocks stacked with a gap between them.
 *
 * Pairing it with the quality trend puts both on one row and, incidentally,
 * leaves LifecycleSection as exactly the two histograms that were built to
 * share a geometry and be compared by shape.
 *
 * It is its own file rather than a second copy inside QualitySection because it
 * is not a quality metric either. It belongs to neither section now, which is
 * the honest place for it.
 *
 * ============================== THE CHIP ====================================
 *
 * `AsOfNowChip`, and it is the only card in the quality grid that wears one --
 * dormancy is measured from `now` across the whole fleet and does not move with
 * the range selector every other card there carries. Sitting beside four
 * range-scoped cards is exactly the situation the two chips exist to make
 * legible.
 */

export interface DormantPalletsCardProps {
    rows: readonly DormantPallet[] | null;
    isLoading: boolean;
    isRefreshing?: boolean;
    onSelectPallet?: (palletId: string) => void;
}

// Cell padding is shared by the header and the body so the two cannot drift,
// and it is deliberately tight: SkeletonRows draws a ~35px row, and a real row
// here carries a StatusBadge (~24px), so py-1.5 keeps the placeholder and the
// loaded table within a couple of pixels of each other.
const CELL = 'border-b border-slate-100 px-3 py-1.5';

// พื้นและเส้นชุดเดียวกับหัวตารางใน DataTableView.tsx -- หัวที่เลื่อนตามจอต้อง
// แยกออกจากแถวข้อมูลที่มันทับอยู่
const HEAD_CELL =
    'sticky top-0 z-10 border-b border-line-band bg-surface-band px-3 py-2 text-xs font-bold text-slate-600';

export const DormantPalletsCard: React.FC<DormantPalletsCardProps> = ({
    rows,
    isLoading,
    isRefreshing = false,
    onSelectPallet,
}) => {
    const t = useT();
    const copy = t.dashboard.analytics;
    const selectable = Boolean(onSelectPallet);

    const body = () => {
        if (isLoading) {
            // First load only. Four columns, matching the table below.
            return <SkeletonRows rows={6} cols={4} ariaLabel={copy.dormant.title} />;
        }

        if (!rows || rows.length === 0) {
            return (
                <EmptyState
                    icon={Moon}
                    title={copy.chart.noDataInRange}
                    // No `widenRange` hint: dormancy is measured from `now`
                    // across the whole fleet and ignores the range selector
                    // entirely, so widening it cannot produce a row.
                />
            );
        }

        return (
            // The scroll lives here, not on the page: four columns of Thai in a
            // half-width card has to be able to move sideways on its own.
            //
            // 20rem, down from 26rem. This box is the tallest thing in its grid
            // row, and a grid row stretches every card in it to its tallest, so
            // this number was setting the height of the quality-trend card next
            // door too -- and that card has a fixed 240px plot, so everything it
            // was given above its own content came out as a band of white
            // between the plot and its footer strip. 20rem lands the two within
            // a line or two of each other. Fifteen rows still fit; ~8 of them
            // are visible and the rest are a scroll away, which is what a
            // longest-idle-first list is for.
            <div className="max-h-[20rem] overflow-auto styled-scrollbar">
                <table className="w-full border-collapse text-sm">
                    <caption className="sr-only">{copy.dormant.title}</caption>
                    <thead>
                        <tr>
                            {/* font-bold (700) is reserved for table headers and
                                is the heaviest weight actually served for Inter
                                and Noto Sans Thai. No uppercase, no tracking. */}
                            <th scope="col" className={`${HEAD_CELL} text-left`}>
                                {copy.dormant.palletId}
                            </th>
                            <th scope="col" className={`${HEAD_CELL} text-left`}>
                                {copy.dormant.status}
                            </th>
                            <th scope="col" className={`${HEAD_CELL} text-left`}>
                                {copy.dormant.location}
                            </th>
                            <th scope="col" className={`${HEAD_CELL} text-right`}>
                                {copy.dormant.daysIdle}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr
                                key={row.palletId}
                                onClick={onSelectPallet ? () => onSelectPallet(row.palletId) : undefined}
                                className={
                                    'even:bg-slate-50/60 ' +
                                    (selectable ? 'cursor-pointer transition-colors hover:bg-brand-50' : '')
                                }
                            >
                                <td className={`${CELL} whitespace-nowrap`}>
                                    {onSelectPallet ? (
                                        // A real <button> rather than role="button"
                                        // on the <tr>: that role would replace the
                                        // row's own semantics and take the cell
                                        // relationships with it. The row click is
                                        // pointer convenience; this is the keyboard
                                        // path. stopPropagation so the two never
                                        // both fire.
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onSelectPallet(row.palletId);
                                            }}
                                            className="rounded-md font-medium text-brand-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                                        >
                                            {row.palletId}
                                        </button>
                                    ) : (
                                        <span className="font-medium text-slate-700">{row.palletId}</span>
                                    )}
                                </td>
                                <td className={CELL}>
                                    <StatusBadge status={row.status} />
                                </td>
                                <td className={`${CELL} text-slate-700`}>{row.location}</td>
                                {/* tabular-nums because these figures ARE a column
                                    and have to line up digit over digit. Fixed to
                                    one decimal so 41 and 41.2 do not sit at
                                    different widths -- the reducer already rounds
                                    to 1dp, this only makes it visible. */}
                                <td className={`${CELL} whitespace-nowrap text-right tabular-nums text-slate-700`}>
                                    {row.daysIdle.toFixed(1)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        // No column span here: the card is layout-agnostic and the grid it sits
        // in owns its width, which is what let it move between two sections
        // without carrying the old grid's arithmetic along with it.
        //
        // `grow` on the body so the card's content fills a stretched grid row --
        // it now shares one with a 300px chart.
        <Card accent busy={isRefreshing} as="section" className="animate-surface-in flex flex-col">
            <div className="flex grow flex-col p-5 sm:p-6">
                <SectionHeader
                    level="h3"
                    title={copy.dormant.title}
                    subtitle={copy.dormant.subtitle}
                    icon={Moon}
                    action={<AsOfNowChip />}
                />
                {/* isRefreshing dims what is already there and never swaps in a
                    skeleton: this app refetches on every realtime row change, so
                    a bulk check-out of 30 pallets would tear the table down and
                    rebuild it 30 times and the panel would strobe. The hairline
                    on the Card above is what says "working". */}
                <div className={`mt-4 ${isRefreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'}`}>
                    {body()}
                </div>
            </div>
        </Card>
    );
};
