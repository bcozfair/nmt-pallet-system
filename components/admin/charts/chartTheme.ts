import { ActionType, PalletStatus } from '../../../types';
import { PALLET_STATUS_META } from '../common/AdminHelpers';

// The one place a chart turns a number into a colour.
//
// It sits next to the charts rather than in the root `constants.ts` for the same
// reason PALLET_STATUS_META sits in AdminHelpers: that file is Supabase config
// and session policy, and a hue does not belong there. Status colours are NOT
// duplicated here -- they are re-exported from PALLET_STATUS_META below, so a
// legend, a badge and a pie slice can never drift apart.
//
// Every hex in this file was checked against four gates on a #ffffff surface:
// a lightness band, a chroma floor, a CIE dE separation under simulated
// deuteranopia/protanopia, and a >=3:1 contrast ratio for the mark itself.
// The recorded numbers below are the measured results, not estimates.
//
// ---------------------------------------------------------------------------
// MIRRORED IN index.css. The same values exist as --color-series-*,
// --color-heat-* and --color-chart-* in the @theme block there.
//
// The duplication is deliberate. Recharts paints through `fill`/`stroke`
// PROPS, not classes, so a chart needs these as JavaScript strings; reading
// them back with getComputedStyle would work only in a browser, only after
// paint, and would return "" -- painting the mark black with no error -- for
// any token Tailwind decided to prune. This file is the authority for anything
// drawn by JS; the CSS tokens exist for anything drawn by a class.
//
// If you change a hex, change it in BOTH places. And note that index.css uses
// `@theme static` precisely so those tokens survive tree-shaking -- do not
// revert that keyword.
// ---------------------------------------------------------------------------

// --- CATEGORICAL: the five action types -------------------------------------
//
// Slots 1 and 2 are the brand and accent hues the NMT wordmark is drawn in
// (brand-500 and accent-600); the other three are third hues stepped into the
// same lightness band so no series reads as louder than another.
//
//   slot 1  check_out      #2365c7  5.59:1   brand-500
//   slot 2  check_in       #029796  3.58:1   accent-600
//   slot 3  report_damage  #d94b46  3.76:1
//   slot 4  scrap          #6d4bc4  6.08:1
//   slot 5  repair         #1a8f4c  4.14:1
//
// Adjacent-pair results (lines, grouped bars, stacked segments):
//   lightness band       all five inside L 0.43-0.77          PASS
//   chroma floor         all five >= 0.1                      PASS
//   CVD separation       worst #d94b46 <-> #029796  dE 12.6   PASS  (deutan)
//   normal vision        worst #029796 <-> #2365c7  dE 17.9   PASS
//   contrast vs surface  all five >= 3:1                      PASS
//
// ============================ READ THIS BEFORE REORDERING ===================
// The ORDER is a safety mechanism, not a style choice.
//
// Under the stricter all-pairs test -- the one that applies when ANY two marks
// can touch, as in a scatter, a bubble chart or small multiples -- slot 4
// (violet #6d4bc4) and slot 1 (blue #2365c7) collapse to **dE 0.6 under
// deuteranopia**. They are the same colour to roughly one man in twelve.
//
// The order below keeps them non-adjacent, which is why the following rules
// hold and must be preserved:
//
//   * All five series may appear together ONLY in adjacent forms -- a stacked
//     bar. NEVER as five co-plotted lines.
//   * The movement chart uses slots 1-2 only. That pair passes all-pairs
//     (CVD dE 17.5, normal dE 17.9), so it is safe as two free lines.
//   * The quality chart stacks slots 3 -> 4 -> 5 in exactly that order
//     (adjacent CVD dE 22.6, normal dE 27.9). As three free-floating lines it
//     would FAIL: red vs green measures dE 5.9 under deuteranopia.
//
// If a future chart needs violet and blue on the same plot, re-run the
// validator and pick new hexes. Do not just reorder this object.
// ============================================================================

export const SERIES_COLORS: Record<ActionType, string> = {
    check_out: '#2365c7',
    check_in: '#029796',
    report_damage: '#d94b46',
    scrap: '#6d4bc4',
    repair: '#1a8f4c',
};

// Fixed order for legends, stack order and tooltip rows. Movement first (the
// high-volume pair), then the quality trio in their validated stacking order.
export const SERIES_ORDER: ActionType[] = [
    'check_out',
    'check_in',
    'report_damage',
    'scrap',
    'repair',
];

// The two subsets that are safe as free-standing lines, named so a chart
// declares its intent rather than slicing SERIES_ORDER by index.
export const MOVEMENT_SERIES: ActionType[] = ['check_out', 'check_in'];
export const QUALITY_STACK: ActionType[] = ['report_damage', 'scrap', 'repair'];

// --- ACQUISITION: the one series that is not an ActionType ------------------
//
// `TrendPoint.acquisition` counts pallets ADDED to the fleet. It is not a
// transaction anybody performs, which is why it has no slot in SERIES_COLORS.
//
// Achromatic on purpose, and it is the safest thing this file can do. The five
// categorical slots are already packed into one lightness band with a chroma
// floor, so a sixth chromatic hue would have to thread between them and would
// fail the all-pairs CVD test against at least one -- the orange region, the
// only real gap left, collapses into #d94b46 under deuteranopia. A neutral has
// no hue to confuse: it is separable from all five under every simulated
// deficiency, because CHROMA is what distinguishes it rather than hue.
//
//   #334155  slate-700   10.4:1 on white   chroma ~0.02
//
// Darker than every chrome value in this file (#e2e8f0 / #cbd5e1 / #64748b /
// #475569), so it cannot be mistaken for a gridline or an axis.
export const ACQUISITION_COLOR = '#334155';

/** Every series the movement trend can draw. `acquisition` is not an ActionType. */
export type TrendSeriesKey = ActionType | 'acquisition';

/**
 * The movement chart's series, in legend and tooltip order.
 *
 * The order is doing the same job SERIES_ORDER does: it keeps slot 1 (blue
 * `check_out`) and slot 4 (violet `scrap`) at opposite ends, which is the pair
 * that measures dE 0.6 under deuteranopia. `repair` is deliberately absent --
 * the quality section already stacks it, and a sixth line would add nothing the
 * stacked chart does not say better.
 */
export const TREND_SERIES: TrendSeriesKey[] = [
    'check_out',
    'check_in',
    'acquisition',
    'report_damage',
    'scrap',
];

export const TREND_COLORS: Record<TrendSeriesKey, string> = {
    ...SERIES_COLORS,
    acquisition: ACQUISITION_COLOR,
};

// A note on what is deliberately NOT here: there is no per-series dash table.
//
// One existed briefly, when the movement chart drew all five as co-plotted
// lines and needed a non-colour channel to carry identity past the blue/violet
// collapse. That chart is now five separate strips (TrendStrips.tsx), one
// series each -- and two marks can only be confused if they share a plot. The
// constraint dissolved rather than being paid for, so the dashes went with it.
//
// If a future chart does co-plot these as lines, it needs that second channel
// back. Dashes are the cheapest one; they are not optional.

// --- DISTRIBUTIONS: one hue, always -----------------------------------------
//
// Histograms (dwell time, days overdue, time to resolve), location bars and
// staff totals all use this single colour for every bar.
//
// Colouring a distribution's bars darker-where-taller double-encodes bar
// length: the reader already has the height, and the ramp adds a second signal
// carrying the same information while breaking the categorical gates by
// construction. One hue is both simpler and more correct.
export const DISTRIBUTION_COLOR = '#2365c7';

// The single sanctioned exception: buckets that breach the configured overdue
// threshold take the damaged red. One hue plus one status highlight -- and it
// is always shipped with an icon and a label, never colour alone.
export const BREACH_COLOR = PALLET_STATUS_META.damaged.stroke;

// --- SEQUENTIAL: the hour x weekday heatmap ---------------------------------
//
//   lightness monotone   steps read light -> dark          PASS
//   adjacent dL          every gap >= 0.06                 PASS
//   light-end contrast   #81abea at 2.35:1 vs surface      PASS
//   single hue           hue spread 0 degrees              PASS
//
// The obvious brand-100 -> brand-700 ramp FAILS both ends: brand-100 measures
// 1.27:1 (invisible on white) and brand-600 <-> brand-700 differ by only
// dL 0.052 (indistinguishable). Four steps that skip brand-600 is the shape
// that passes.
export const HEAT_SCALE = ['#81abea', '#4b85dd', '#2365c7', '#154489'] as const;

// A zero-count cell is NOT a fifth colour. It is the surface plus a hairline,
// so "no activity" reads as absence rather than as the lowest of five levels.
export const HEAT_EMPTY_CLASS = 'bg-white border border-slate-100';

/**
 * Maps a count onto HEAT_SCALE, or `null` for an empty cell.
 *
 * Bucketing is relative to `max` rather than absolute, because a quiet week and
 * a busy week should both produce a readable heatmap. `max` of 0 means the
 * whole grid is empty.
 */
export const heatColor = (count: number, max: number): string | null => {
    if (count <= 0 || max <= 0) return null;
    const step = Math.ceil((count / max) * HEAT_SCALE.length);
    return HEAT_SCALE[Math.min(step, HEAT_SCALE.length) - 1];
};

// --- CHROME -----------------------------------------------------------------
//
// Deliberately recessive: the data is meant to be the only loud thing on the
// card. Note `tick` is the lightest value here that is still legal as text --
// slate-400 (#94a3b8) measures 2.56:1 and is decoration only. The charts being
// replaced used `fill-gray-400` for their axis labels, which is exactly that
// failure.
export const CHART_CHROME = {
    /** Hairline gridlines. Solid -- never dashed; dashes add texture that
     *  competes with the data for attention at small sizes. */
    grid: '#e2e8f0',   // slate-200
    axis: '#cbd5e1',   // slate-300
    tick: '#64748b',   // slate-500, 4.76:1 on white
    label: '#475569',  // slate-600
    surface: '#ffffff',
} as const;

// The gap that separates touching marks -- pie slices, stacked bar segments.
// It is drawn as a stroke in the surface colour rather than a border, so the
// segments stay flush and the gap is genuinely transparent to the card beneath.
export const SEGMENT_GAP = { stroke: CHART_CHROME.surface, strokeWidth: 2 } as const;

// --- STATUS: re-exported, not redefined -------------------------------------
//
// PALLET_STATUS_META is the single source of status colour for badges, chips,
// dropdowns and legends across all six admin tabs. A chart imports the two
// helpers below so it never has to reach past this module -- and so a change to
// a status hue lands everywhere at once.
export const statusColor = (status: PalletStatus): string =>
    PALLET_STATUS_META[status].stroke;

/** The status colour at ~12% alpha, for area washes under a line. */
export const statusFill = (status: PalletStatus): string =>
    PALLET_STATUS_META[status].fill;

// --- SHARED RECHARTS PROPS --------------------------------------------------
//
// Spread these so every chart on the dashboard shares one axis treatment. Font
// size is set here rather than by a Tailwind class because Recharts renders SVG
// <text>, which does not inherit from a className on the container.
//
// No letterSpacing anywhere: positive tracking pushes Thai vowels and tone
// marks off their base characters, and every axis on this dashboard can carry
// Thai (department names, staff names, weekday labels).
export const AXIS_TICK_PROPS = {
    fill: CHART_CHROME.tick,
    fontSize: 12,
} as const;

export const AXIS_PROPS = {
    stroke: CHART_CHROME.axis,
    tickLine: false,
    tick: AXIS_TICK_PROPS,
} as const;

export const GRID_PROPS = {
    stroke: CHART_CHROME.grid,
    strokeDasharray: undefined,
    vertical: false,
} as const;

// --- HEIGHT FOR A CATEGORY-COUNT CHART --------------------------------------
//
// Every horizontal bar chart on this dashboard is sized by how many CATEGORIES
// it has, not by how wide its column is: six dwell bands, six resolution bands,
// seven weekdays, N staff. ChartFrame's `aspect` cannot express that -- eleven
// bars in a 328px column at aspect 2 would be 15px apart -- so each of those
// charts passes `fixedPlotHeight`, and each one used to carry its own hand-tuned
// number: 264 here, 260 there, 34+56 in two more. Four numbers for one rule.
//
// This is the rule. `bands * PITCH + CHROME`:
//
//   PITCH is one band's share of the plot. Bars are drawn at up to ~18-20px and
//   the tick beside them has a 12px line box (AXIS_TICK_PROPS), so 30px is the
//   bar plus a clear gap above and below it -- tight, but never touching. The
//   numbers it replaces ran 34-44px per band, which is where the white space in
//   the deep-dive cards came from: a 6-band chart was reserving 264px to draw
//   108px of bars.
//
//   CHROME is everything that is not a band: the value axis (Recharts gives an
//   XAxis 30px by default) plus the plot's own top margin, which the charts here
//   set at 4-8px.
//
// Deliberately NOT responsive. A chart whose height changed at a breakpoint
// would reflow the grid row it sits in, and the two lifecycle histograms are
// meant to be compared by shape -- which only works while they are the same
// size as each other on every screen.
export const BAND_PITCH_PX = 30;
export const PLOT_CHROME_PX = 40;

/** Plot height for a chart with `bands` categories on its category axis. */
export const bandPlotHeight = (bands: number): number =>
    bands * BAND_PITCH_PX + PLOT_CHROME_PX;
