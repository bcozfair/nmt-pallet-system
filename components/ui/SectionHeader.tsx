import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    icon?: LucideIcon;
    /** Right-aligned slot: a segmented control, a count chip, a drill-down link. */
    action?: React.ReactNode;
    level?: 'h2' | 'h3';
}

// Title + optional subtitle + optional trailing control, at two sizes: `h2` for a
// region of the page, `h3` for a single card. Taking the level as a prop rather
// than hard-coding one keeps the heading outline of the page honest -- a card
// inside an `h2` region has to be an `h3`, and it is the caller that knows.
//
// Every string arrives as a prop. This file never imports the dictionary: the
// primitives stay presentational, and translation stays the caller's job.
export const SectionHeader: React.FC<SectionHeaderProps> = ({
    title,
    subtitle,
    icon: Icon,
    action,
    level = 'h2',
}) => {
    const Heading = level;

    // No `uppercase` and no positive tracking anywhere in here. Both are silent
    // one-language regressions: uppercase is a no-op on Thai, so the emphasis it
    // buys in English simply vanishes, and letter-spacing pushes Thai vowels and
    // tone marks off the base characters they belong to. `tracking-tight` is
    // safe -- it is only the positive direction that breaks the stacking.
    const headingClass =
        level === 'h2'
            ? 'text-xl font-semibold tracking-tight text-slate-900'
            : 'text-base font-semibold text-slate-900';

    return (
        // `items-start`, not `items-center`: a Thai title runs ~1.4-1.7x the
        // width of its English source and wraps to a second line, and centring
        // would then drag the action control down to the middle of the block.
        <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5">
                {Icon && (
                    <span className="mt-0.5 shrink-0 text-brand-600" aria-hidden="true">
                        <Icon size={18} />
                    </span>
                )}
                <div className="min-w-0">
                    <Heading className={headingClass}>{title}</Heading>
                    {subtitle && (
                        // Deliberately no tracking on the subtitle: it is the
                        // longest string in the block and so the most likely to
                        // be set in Thai at two lines.
                        <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
                    )}
                </div>
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
};
