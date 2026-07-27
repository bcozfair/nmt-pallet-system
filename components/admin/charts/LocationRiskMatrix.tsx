import React, { useMemo } from 'react';
import { Pallet } from '../../../types';
import { CircleCheck, ClockAlert, Hammer } from 'lucide-react';
import { useT } from '../../../hooks/useT';
import type { LocationRow } from '../../../services/analytics/dashboardAnalytics';

/**
 * Locations ranked by how much trouble they are in. A LIST, not a chart -- the
 * rows are drill-down targets, and the value of the thing is that you can click
 * one and land on the filtered inventory.
 *
 * The risk maths below is unchanged, deliberately and to the character:
 * `riskScore = overdue + damaged * 2`, sorted by ratio, and anything scoring
 * zero dropped. Damage is weighted double because a damaged pallet is a pallet
 * that has to be dealt with, whereas an overdue one may simply be in use; the
 * SORT is on the ratio rather than the score so a small department with two
 * problems out of three pallets outranks a large one with three out of ninety.
 *
 * TWO INPUTS, ONE CALCULATION. `rows` is the preferred path: pre-aggregated
 * LocationRow[] out of services/analytics/dashboardAnalytics.ts, which already
 * applies both of this component's exclusions ('Warehouse' is skipped at
 * dashboardAnalytics.ts:709, scrapped pallets at :667) and derives `overdue`
 * against an injected clock rather than an ambient `new Date()`. `pallets` is
 * the original path, kept working for the callers that have not moved yet.
 * Both converge on rankByRisk() below, so the ranking exists exactly once and
 * the two callers cannot drift into disagreeing about which zone is worst.
 */

interface RiskInput {
    name: string;
    total: number;
    overdue: number;
    damaged: number;
}

/** 'Warehouse' means "not out anywhere"; it is not a location. */
const WAREHOUSE = 'Warehouse';

const rankByRisk = (input: RiskInput[]) =>
    input
        .map((stats) => {
            const riskScore = stats.overdue + stats.damaged * 2;
            const riskRatio = stats.total > 0 ? (stats.overdue + stats.damaged) / stats.total : 0;
            return { ...stats, riskScore, riskRatio };
        })
        .sort((a, b) => b.riskRatio - a.riskRatio)
        .filter((l) => l.riskScore > 0);

export interface LocationRiskMatrixProps {
    /** Raw pallets, aggregated here. Supply this OR `rows`. */
    pallets?: Pallet[];
    /** Pre-aggregated holdings from dashboardAnalytics. Supply this OR `pallets`. */
    rows?: LocationRow[];
    /** The configured overdue threshold, in days. Used by the `pallets` path. */
    threshold: number;
    onLocationSelect: (loc: string) => void;
}

export const LocationRiskMatrix: React.FC<LocationRiskMatrixProps> = ({
    pallets,
    rows,
    threshold,
    onLocationSelect,
}) => {
    const t = useT();

    const locationData = useMemo(() => {
        if (rows) {
            return rankByRisk(
                rows.map((r) => ({ name: r.name, total: r.count, overdue: r.overdue, damaged: r.damaged })),
            );
        }

        const locs: Record<string, { total: number; overdue: number; damaged: number }> = {};

        (pallets ?? []).forEach((p) => {
            if (p.current_location === WAREHOUSE) return;
            // Scrapped pallets are out of the fleet and are not "at" a location
            // in any operational sense. Counting them would pad `total` and so
            // quietly dilute every risk ratio computed from it below.
            if (p.status === 'scrapped') return;
            if (!locs[p.current_location]) locs[p.current_location] = { total: 0, overdue: 0, damaged: 0 };

            locs[p.current_location].total++;
            if (p.status === 'damaged') locs[p.current_location].damaged++;

            if (p.status === 'in_use' && p.last_checkout_date) {
                const days =
                    (new Date().getTime() - new Date(p.last_checkout_date).getTime()) / (1000 * 3600 * 24);
                if (days > threshold) locs[p.current_location].overdue++;
            }
        });

        return rankByRisk(Object.entries(locs).map(([name, stats]) => ({ name, ...stats })));
    }, [pallets, rows, threshold]);

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {locationData.length === 0 ? (
                // The original empty state, kept: a dashed slate outline around a
                // green check. Dashed rather than solid because a solid border
                // reads as a container that failed to fill, a dashed one as a
                // space reserved for something legitimately absent.
                //
                // Two things changed. `gray-*` became `slate-*` -- the repo runs
                // two neutral ramps and they are visibly different temperatures
                // side by side. And `text-gray-400 italic` became
                // `text-slate-600`: slate-400 measures 2.56:1 on white, below the
                // 4.5:1 floor for body text, and there is no italic face loaded
                // for Noto Sans Thai, so `italic` had the browser synthesise a
                // slant that smears the tone marks.
                <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8">
                    <CircleCheck size={32} className="mb-2 text-green-500 opacity-50" aria-hidden="true" />
                    <span className="text-sm font-medium text-slate-600">{t.dashboard.allSystemsNormal}</span>
                </div>
            ) : (
                <ul className="styled-scrollbar -mr-2 h-full space-y-2 overflow-y-auto pr-2 pt-2">
                    {locationData.map((loc) => (
                        <li key={loc.name}>
                            {/* A real <button>, not a div with an onClick. The row
                                navigates, so it has to be reachable by keyboard,
                                announce itself as a control, and take the app's
                                focus ring. `text-left` because a button centres
                                its content by default. */}
                            <button
                                type="button"
                                onClick={() => onLocationSelect(loc.name)}
                                className="group relative w-full overflow-hidden rounded-lg border border-transparent bg-slate-50/40 p-3 text-left transition-all duration-200 hover:border-slate-200 hover:bg-brand-50/60 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                            >
                                <span
                                    className="absolute top-0 bottom-0 left-0 w-1 bg-brand-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                                    aria-hidden="true"
                                />

                                <span className="relative z-10 flex items-center justify-between gap-3">
                                    {/* Left: name, holdings, and the issue bar */}
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-baseline gap-2">
                                            <span className="truncate text-sm font-bold text-slate-800 transition-colors group-hover:text-brand-700">
                                                {loc.name}
                                            </span>
                                            <span className="text-[10px] whitespace-nowrap text-slate-500">
                                                ({t.dashboard.unitsCount(loc.total)})
                                            </span>
                                        </span>

                                        {/* The issue bar. Orange and red stay: they
                                            are status semantics, not neutrals.

                                            h-2 (8px), not h-1. This card used to
                                            run the full 1120px content width, and
                                            a 4px rule that long still read as a
                                            bar; at half width -- it now shares a
                                            row with the location chart -- the
                                            track is ~330px and 4px of it is a
                                            hairline. Height is also the only axis
                                            left to spend: the LENGTH of each
                                            segment is the data and cannot be
                                            touched.

                                            opacity-80 at rest rather than 60. The
                                            dim-until-hover was written for a bar
                                            that was decoration beside the counts
                                            on the right; it is the only part of
                                            the row that shows the MIX, so it has
                                            to be legible without a pointer -- and
                                            orange-400 at 60% on white is close to
                                            the slate track behind it. */}
                                        <span className="mt-1.5 flex h-2 w-full overflow-hidden rounded-full bg-slate-200 opacity-80 transition-opacity group-hover:opacity-100">
                                            <span
                                                className="h-full bg-orange-400"
                                                style={{
                                                    width: `${(loc.overdue / loc.total) * 100}%`,
                                                    // A floor, so one overdue pallet out of
                                                    // ninety draws a sliver rather than a
                                                    // sub-pixel nothing. Same guard, same
                                                    // 3px, as the damage funnel's segments.
                                                    // Only applied when the count is real:
                                                    // a floor on zero would invent an issue.
                                                    minWidth: loc.overdue > 0 ? 3 : undefined,
                                                }}
                                            />
                                            <span
                                                className="h-full bg-red-500"
                                                style={{
                                                    width: `${(loc.damaged / loc.total) * 100}%`,
                                                    minWidth: loc.damaged > 0 ? 3 : undefined,
                                                }}
                                            />
                                        </span>
                                    </span>

                                    {/* Right: the two counts and their total */}
                                    <span className="flex items-center gap-3">
                                        <span
                                            className={`flex items-center gap-1 ${loc.overdue > 0 ? 'opacity-100' : 'opacity-40'}`}
                                            title={t.dashboard.overdue}
                                        >
                                            <ClockAlert size={14} className="text-orange-500" aria-hidden="true" />
                                            <span
                                                className={`text-xs font-bold tabular-nums ${loc.overdue > 0 ? 'text-slate-700' : 'text-slate-500'}`}
                                            >
                                                {loc.overdue}
                                            </span>
                                        </span>

                                        <span
                                            className={`flex items-center gap-1 ${loc.damaged > 0 ? 'opacity-100' : 'opacity-40'}`}
                                            title={t.status.damaged}
                                        >
                                            <Hammer size={14} className="text-red-500" aria-hidden="true" />
                                            <span
                                                className={`text-xs font-bold tabular-nums ${loc.damaged > 0 ? 'text-slate-700' : 'text-slate-500'}`}
                                            >
                                                {loc.damaged}
                                            </span>
                                        </span>

                                        <span className="border-l border-slate-200 pl-2">
                                            {/* No `uppercase` and no positive
                                                tracking on this chip: both are
                                                silent one-language regressions --
                                                uppercase is a no-op on Thai, and
                                                letter-spacing lifts Thai tone
                                                marks off their base consonant. */}
                                            <span
                                                className={`rounded-md px-2 py-1 text-xs font-bold whitespace-nowrap ${loc.overdue + loc.damaged > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}
                                            >
                                                {loc.overdue + loc.damaged}{' '}
                                                <span className="ml-0.5 text-[9px] opacity-80">
                                                    {t.dashboard.issues}
                                                </span>
                                            </span>
                                        </span>
                                    </span>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
