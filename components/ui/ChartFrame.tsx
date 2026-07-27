import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ResponsiveContainer } from 'recharts';
import { Card } from './Card';
import { SectionHeader } from './SectionHeader';
import { SkeletonChart } from './Skeleton';

export interface ChartFrameProps {
    title: string;
    subtitle?: string;
    icon?: LucideIcon;
    action?: React.ReactNode;
    /** Plot aspect (width / height). Height is derived from measured width,
     *  so nothing in the tree carries a pixel height. */
    aspect?: number;
    /** Floor, so a 328px column never collapses the plot to a strip. */
    minPlotHeight?: number;
    /** For row-count-driven charts (e.g. a staff ranking) -- overrides `aspect`. */
    fixedPlotHeight?: number;
    isLoading?: boolean;
    isRefreshing?: boolean;
    isEmpty?: boolean;
    emptyState?: React.ReactNode;
    /** Legend + the <details> table view. See the note on <details> below. */
    footer?: React.ReactNode;
    children: React.ReactNode;
}

// The frame every chart on the dashboard sits in. It exists to fix a specific,
// reproducible layout defect: the cards it replaces each hard-coded their own
// plot height -- h-[320px], h-[450px], h-[420px] -- so the plot was a fixed
// number of pixels tall no matter how wide its column was, and every one of
// those numbers was tuned against a single viewport.
//
// ============================ SIZING RULES ============================
// These four are not style preferences. Each one is a way the plot silently
// renders at zero height, which looks identical to "the data failed to load".
//
// 1. NEVER pass height="100%" to ResponsiveContainer. It resolves a percentage
//    against the parent's height, and a flex or grid child has no definite
//    height to resolve against -- so it measures 0, renders nothing, and
//    reports no error. Use `aspect` (height derived from measured width) or an
//    explicit pixel height via `fixedPlotHeight`. Those are the only two safe
//    forms.
//
//    Note that `height` defaults to '100%' when omitted, so "just leave it out"
//    is NOT automatically safe -- it is safe here only because Recharts skips
//    that default when `aspect > 0` is set (see getDefaultWidthAndHeight in
//    recharts/component/responsiveContainerUtils). Passing both `aspect` and an
//    explicit `height` would put the default back in play. Pass exactly one.
//
// 2. Never put `h-full` anywhere on this container's ancestor chain, for the
//    same reason: it re-introduces exactly the percentage-height dependency
//    rule 1 avoids.
//
// 3. `minPlotHeight` is the floor. At `aspect` alone, a chart in a 328px
//    column on a phone would be 164px tall and flatten into an unreadable
//    strip. CAVEAT, verified against recharts 3.10.1: `minHeight` is only
//    written to the container div's CSS, and the SVG is still sized at
//    measured-width / aspect. So below the floor the box is reserved (no
//    layout shift, nothing overlaps) but the plot does not actually grow to
//    fill it -- it sits in the reserved space with slack underneath. If a
//    chart genuinely has to stay legible on a narrow column, give it a
//    `fixedPlotHeight` at that breakpoint rather than relying on this.
//
// 4. A chart inside a COLLAPSED <details> measures 0 and stays 0 -- Recharts
//    takes its measurement on mount, and a closed <details> has no layout, so
//    re-opening it does not re-measure. That is why `footer` is a separate slot:
//    the <details>/table view goes there, and the chart itself is always
//    rendered outside it.
// ======================================================================
export const ChartFrame: React.FC<ChartFrameProps> = ({
    title,
    subtitle,
    icon,
    action,
    aspect = 2,
    minPlotHeight = 200,
    fixedPlotHeight,
    isLoading = false,
    isRefreshing = false,
    isEmpty = false,
    emptyState,
    footer,
    children,
}) => {
    // Inline style rather than a `min-h-[...]` class: the value is a runtime
    // prop, and Tailwind can only generate a rule for a class it can read in
    // the source. A class name assembled from a variable compiles to nothing.
    const plotBox: React.CSSProperties = fixedPlotHeight
        ? { height: fixedPlotHeight }
        : { minHeight: minPlotHeight };

    const renderPlot = () => {
        // First load only. A skeleton at the same aspect, never a spinner: the
        // skeleton already occupies the plot's final box, so the card does not
        // resize when the data arrives.
        if (isLoading) {
            return <SkeletonChart aspect={aspect} height={fixedPlotHeight} />;
        }

        if (isEmpty) {
            return <div className="flex w-full flex-1 items-stretch">{emptyState}</div>;
        }

        return (
            // isRefreshing dims the EXISTING plot and leaves it mounted. It must
            // never swap in a skeleton: this app refetches on every realtime row
            // change, so a bulk check-out of 30 pallets would tear the chart down
            // and rebuild it 30 times and the page would strobe. The moving
            // hairline on the Card above is what actually communicates "working".
            <div className={`w-full ${isRefreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'}`}>
                <ResponsiveContainer
                    width="100%"
                    {...(fixedPlotHeight
                        ? { height: fixedPlotHeight }
                        : { aspect, minHeight: minPlotHeight })}
                >
                    {children}
                </ResponsiveContainer>
            </div>
        );
    };

    return (
        <Card accent busy={isRefreshing} as="section" className="animate-surface-in flex flex-col">
            <div className="flex flex-col p-5 sm:p-6">
                <SectionHeader level="h3" title={title} subtitle={subtitle} icon={icon} action={action} />

                {/* The plot wrapper: full width, a min-height floor, and no
                    height of its own. `flex` so an empty state can stretch to
                    the floor without needing h-full. */}
                <div className="mt-4 flex w-full flex-col" style={plotBox}>
                    {renderPlot()}
                </div>
            </div>

            {footer && (
                // Legend and the <details> table view live here -- outside the
                // measured plot box, per rule 4 above.
                <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3 sm:px-6">{footer}</div>
            )}
        </Card>
    );
};
