import React from 'react';

/**
 * A semicircular gauge: how much of the damage cohort has been closed.
 *
 * ========================= WHY THIS METRIC AND NO OTHER ====================
 *
 * A gauge needs a value with a KNOWN, MEANINGFUL CEILING, and this dashboard
 * has very few. The resolution rate is `(repaired + scrapped) / reported`,
 * which is bounded at 100% by construction and whose ceiling is a real target
 * -- every damage report should eventually close one way or the other. Median
 * dwell time, time-to-resolve, the trend series and the staff ranking have no
 * ceiling at all; overdue-as-a-share-of-in-use has one but reads backwards on a
 * gauge, where a full arc conventionally means "good".
 *
 * ============================ WHY HAND-ROLLED SVG =========================
 *
 * Recharts has no gauge primitive; the usual workaround is RadialBarChart with
 * a clipped angular domain, which drags in a ResponsiveContainer and with it
 * every sizing trap ChartFrame exists to document (measures 0 inside a flex
 * child, 0 inside `display:none`, 0 inside a collapsed <details>). Two arcs
 * with a `viewBox` measure nothing and cannot collapse. This is the same call
 * the damage funnel's split bar already made, and the card this renders in is
 * not a ChartFrame for exactly that reason.
 *
 * ============================== THE COLOURS ================================
 *
 * NOT a red/amber/green traffic light, which is what a gauge usually gets.
 * chartTheme.ts records the measurement: red against green is dE 5.9 under
 * simulated deuteranopia -- the same colour to roughly one man in twelve -- and
 * on an arc the two zones sit at opposite ends and never touch, so there is no
 * shared boundary to read them apart by. It fails the all-pairs test outright.
 *
 * The three colours here are the funnel's own ordinal ramp instead, passed in
 * from the caller (FUNNEL_RAMP, itself three steps of the validated single-hue
 * HEAT_SCALE). The filled arc is the two ways a report can CLOSE -- repaired,
 * then scrapped -- and the pale remainder is what is still open. So the gauge's
 * empty track is not decoration standing in for "not yet": it is a real
 * quantity, drawn in the same colour the legend gives it. That is also why this
 * replaced the horizontal split bar rather than joining it -- the two encoded
 * the same three numbers.
 *
 * ============================= ACCESSIBILITY ===============================
 *
 * `role="img"` with an `aria-label` on the whole figure: the arcs are geometry
 * and announce nothing on their own. The label is the caller's full sentence
 * ("75% resolved"), not the bare number in the middle. The exact counts are in
 * the legend beneath it and in the card's data table, so nothing here is the
 * only way to read a value.
 */

export interface GaugeSegment {
    key: string;
    /** Raw count. Angles are computed from these, never from a rounded percent. */
    value: number;
    color: string;
}

export interface ResolutionGaugeProps {
    /** In draw order, from the left end of the arc. */
    segments: readonly GaugeSegment[];
    /** The figure in the hole, already rounded by the caller. */
    percentLabel: string;
    /** The word under it. Short -- it sits inside the arc. */
    caption: string;
    /** The accessible name for the whole figure. A full sentence. */
    ariaLabel: string;
    /** Skips the sweep-in. Recharts is not involved, but CSS transitions still are. */
    reducedMotion?: boolean;
}

// --- GEOMETRY ---------------------------------------------------------------
//
// A 200 x 102 viewBox with `width: 100%`, so the gauge scales with its column
// and never needs measuring. Radius 80 about (100, 92): the arc runs from
// (20, 92) up over the top and down to (180, 92), and the 16px stroke pushes
// the topmost ink to y=4, which is why the box is 102 tall rather than 92.
const VIEW_W = 200;
const VIEW_H = 102;
const RADIUS = 80;
const STROKE = 16;
const ARC_PATH = `M ${100 - RADIUS} 92 A ${RADIUS} ${RADIUS} 0 0 1 ${100 + RADIUS} 92`;

/** Path length of a semicircle. Every dash offset below is measured against it. */
const ARC_LEN = Math.PI * RADIUS;

/**
 * The gap between touching segments, in path units (~3px at the drawn size).
 *
 * The same job the 2px `gap-0.5` did on the horizontal bar this replaces: two
 * adjacent steps of a single-hue ramp differ only in lightness, and a visible
 * gap is what stops them reading as one long arc.
 */
const SEGMENT_GAP = 3;

/**
 * The shortest arc a non-zero segment may draw.
 *
 * One scrapped pallet out of ninety is 1.1% of 251 path units -- under 3px, so
 * it would round away to nothing and the reader would count two outcomes where
 * there are three. Same guard, same reasoning, as the `minWidth: 3` on the
 * funnel's bar segments and the location risk bars. Applied only when the count
 * is genuinely non-zero: a floor on zero would draw an outcome that never
 * happened.
 */
const MIN_ARC = 4;

export const ResolutionGauge: React.FC<ResolutionGaugeProps> = ({
    segments,
    percentLabel,
    caption,
    ariaLabel,
    reducedMotion = false,
}) => {
    const total = segments.reduce((sum, s) => sum + s.value, 0);
    const drawable = segments.filter((s) => s.value > 0);

    // `cursor` walks the path in RAW units so the segments stay in their true
    // proportions; only the DRAWN length of each is shortened for the gap, and
    // only the drawn length is floored. Shortening the cursor as well would let
    // the rounding drift down the arc and leave a wedge of nothing at the end.
    let cursor = 0;

    return (
        // max-w, not a fixed width: at 200px wide the gauge is 102px tall, which
        // is roughly the slack this card has beside the 260px histogram next to
        // it. Letting it fill a 309px column would make it 158px tall and turn
        // the card into the tallest in the row.
        <div className="relative mx-auto w-full max-w-[13rem]">
            <svg
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                className="w-full"
                role="img"
                aria-label={ariaLabel}
            >
                {/* The track. Every segment is drawn over it, so it shows only
                    through the gaps -- which is what makes a gap read as a seam
                    rather than as a hole punched in the card.

                    `butt`, matching the segments. A round cap extends the stroke
                    half its own width PAST the endpoint, so a rounded track
                    under butt-capped segments puts an 8px pale nub off the left
                    tip of the arc, in front of where the first segment starts.
                    Flat ends on the diameter are what a gauge wants anyway. */}
                <path
                    d={ARC_PATH}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth={STROKE}
                    strokeLinecap="butt"
                />

                {drawable.map((segment, index) => {
                    const raw = total > 0 ? (segment.value / total) * ARC_LEN : 0;
                    const isLast = index === drawable.length - 1;
                    const drawn = Math.max(MIN_ARC, raw - (isLast ? 0 : SEGMENT_GAP));
                    const offset = -cursor;
                    cursor += raw;

                    return (
                        <path
                            key={segment.key}
                            d={ARC_PATH}
                            fill="none"
                            stroke={segment.color}
                            strokeWidth={STROKE}
                            // `butt`, not `round`. Round caps add half a stroke
                            // width of ink at BOTH ends of every segment, which
                            // on a 16px stroke is 8px of overlap into the
                            // neighbour -- it would swallow the 3px gap and put
                            // each segment's colour on top of the next one's
                            // edge. The rounded outer ends come from the track
                            // beneath instead.
                            strokeLinecap="butt"
                            strokeDasharray={`${drawn} ${ARC_LEN}`}
                            strokeDashoffset={offset}
                            style={
                                reducedMotion
                                    ? undefined
                                    : {
                                          // The sweep. Transitioning the dash
                                          // array rather than the offset means
                                          // the arc grows from its own start
                                          // point instead of sliding along the
                                          // path from somewhere else.
                                          transition:
                                              'stroke-dasharray 0.6s var(--ease-brand)',
                                      }
                            }
                        />
                    );
                })}
            </svg>

            {/* The figure, as HTML over the arc rather than as SVG <text>: SVG
                text would have to be sized by hand at every breakpoint, cannot
                be selected or copied, and does not inherit the Thai font stack.
                `justify-end` parks it at the bottom of the semicircle, which is
                where a gauge's readout belongs -- centring it vertically in the
                box would float it up into the empty middle of the arc.
                pointer-events-none so it never eats a click meant for the card. */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end">
                <p className="text-3xl leading-none font-semibold tracking-tight text-slate-900">
                    {percentLabel}
                </p>
                {/* whitespace-nowrap: Thai has no inter-word spaces, so the
                    browser breaks it on a syllable dictionary -- "จัดการแล้ว"
                    would come apart mid-word inside the arc. */}
                <p className="mt-1 text-xs font-medium whitespace-nowrap text-slate-500">
                    {caption}
                </p>
            </div>
        </div>
    );
};
