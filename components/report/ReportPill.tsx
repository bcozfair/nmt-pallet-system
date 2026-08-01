import React from 'react';

// A status or action badge, sized for a 5mm row.
//
// NOT the screen's StatusBadge, and not the transaction table's action badge,
// even though it says the same words in the same colours. Those two are built
// for a 28px row: `px-2 py-1 text-xs rounded-full` comes to about 24px tall,
// which is taller than the entire printed row this has to sit inside. Reusing
// them would not have looked wrong -- it would have made every row that carries
// one three millimetres taller than the arithmetic that paginated the sheet, and
// the last row of every page would have fallen off the bottom.
//
// The COLOURS are the same values, on purpose. A damaged pallet is red on the
// screen and red on the sheet, or the two stop being the same fact.
export interface ReportPillProps {
    label: string;
    /** Tailwind text/border/background classes, e.g. the entries in STATUS_PILL. */
    tone: string;
}

export const ReportPill: React.FC<ReportPillProps> = ({ label, tone }) => (
    <span
        className={
            // `inline-block` with no vertical padding: the row's height is
            // declared, so the pill takes its height from its line-height alone
            // and cannot push against it.
            'inline-block max-w-full truncate rounded-sm border px-1 text-[8px] font-semibold leading-[1.45] ' +
            tone
        }
    >
        {label}
    </span>
);

/**
 * The four pallet statuses, in the same hues StatusBadge uses on screen.
 *
 * `scrapped` is slate rather than a colour: it is the one status that means the
 * pallet has left the fleet, and giving it a hue would put it in the same visual
 * class as the three that are still in service.
 */
export const STATUS_PILL: Record<string, string> = {
    available: 'border-green-300 bg-green-50 text-green-700',
    in_use: 'border-blue-300 bg-blue-50 text-blue-700',
    damaged: 'border-red-300 bg-red-50 text-red-700',
    scrapped: 'border-slate-300 bg-slate-100 text-slate-600',
};

/** The five transaction actions, matching TransactionTable's badges. */
export const ACTION_PILL: Record<string, string> = {
    check_out: 'border-yellow-300 bg-yellow-50 text-yellow-800',
    check_in: 'border-blue-300 bg-blue-50 text-blue-700',
    report_damage: 'border-red-300 bg-red-50 text-red-700',
    repair: 'border-green-300 bg-green-50 text-green-700',
    scrap: 'border-slate-300 bg-slate-200 text-slate-700',
};

/** The fallback for a value neither table above knows. */
export const NEUTRAL_PILL = 'border-slate-200 bg-slate-50 text-slate-700';
