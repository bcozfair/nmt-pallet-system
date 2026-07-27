import React from 'react';

export interface CardProps {
    children: React.ReactNode;
    className?: string;
    /** Renders the 3px brand hairline across the top edge. */
    accent?: boolean;
    /** Sweeps the hairline while a request is in flight. Requires `accent`. */
    busy?: boolean;
    as?: 'div' | 'section' | 'article';
}

// The surface every dashboard panel sits on, lifted verbatim from the card in
// components/auth/AuthShell.tsx so the two halves of the app cannot drift apart
// the way they did before the sign-in screens were unified.
//
// Exported separately because StatTile and the skeletons need the exact same box
// without also needing the hairline or the element-type switch. Sharing the
// string is what guarantees a skeleton occupies the same pixels as the thing it
// stands in for -- if this ever changes, every consumer changes with it.
export const CARD_SHELL =
    'rounded-3xl border border-slate-200/80 bg-white shadow-[0_24px_60px_-32px_rgba(15,42,82,0.45)]';

export const Card: React.FC<CardProps> = ({
    children,
    className = '',
    accent = false,
    busy = false,
    as: Tag = 'div',
}) => (
    // `overflow-hidden` is load-bearing, not tidiness: the hairline is a square
    // 3px bar, so without it the gradient pokes out past the rounded-3xl corners
    // and the top of the card reads as a rendering artefact.
    <Tag className={`${CARD_SHELL} overflow-hidden ${className}`}>
        {accent && (
            // The brand hairline doubles as this app's only progress indicator:
            // the gradient is laid out at twice the bar's width and slid
            // leftwards while a request is in flight. One element, two jobs --
            // which is exactly why the sign-in and reset screens carry no
            // separate spinner, and why the dashboard should not grow one
            // either. A refetch tints the plot and moves this line; nothing
            // unmounts, so nothing strobes.
            <div
                className={
                    'h-[3px] w-full bg-linear-to-r from-brand-600 via-accent-500 to-brand-600 bg-[length:200%_100%] ' +
                    (busy ? 'animate-brand-sweep' : '')
                }
                aria-hidden="true"
            />
        )}
        {children}
    </Tag>
);
