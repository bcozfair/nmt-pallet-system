import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    hint?: string;
    action?: React.ReactNode;
    /** `plot` fills a ChartFrame body; `card` sits inside a normal panel. */
    variant?: 'card' | 'plot';
}

// Styling follows the nicest empty state already in the repo, the "all systems
// normal" panel in components/admin/charts/LocationRiskMatrix.tsx: a dashed
// slate outline around a centred icon. Dashed rather than solid is the whole
// idea -- a solid border reads as a container that failed to fill, a dashed one
// reads as a space reserved for something that is legitimately not there.
//
// Converted from `gray` to `slate` on the way across. The repo runs two neutral
// ramps at once and they are visibly different temperatures side by side; slate
// is the one the auth screens and the new primitives use.
export const EmptyState: React.FC<EmptyStateProps> = ({
    icon: Icon,
    title,
    hint,
    action,
    variant = 'card',
}) => (
    // `flex-1` and never `h-full`: in the plot variant this sits inside a
    // ChartFrame body whose floor is a min-height, and h-full would resolve a
    // percentage against a parent with no definite height -- the same
    // collapse-to-zero trap documented in ChartFrame.tsx.
    <div
        className={
            'flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center ' +
            (variant === 'plot' ? 'flex-1 py-10' : 'py-10')
        }
    >
        {Icon && (
            <span className="mb-3 text-slate-300" aria-hidden="true">
                <Icon size={32} />
            </span>
        )}
        {/* text-slate-600 rather than the slate-400 the original used: at
            slate-400 this measures 2.56:1 on white, which is below the 4.5:1
            floor for body text -- and an empty state is the one message on the
            card that has to be read. */}
        <p className="text-sm font-medium text-slate-600">{title}</p>
        {hint && <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">{hint}</p>}
        {action && <div className="mt-4">{action}</div>}
    </div>
);
