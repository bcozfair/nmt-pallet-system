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
//
// Split into geometry and paint, then recombined, so the one consumer whose
// surface changes with state (StatTile's selected tile) can take the geometry
// without also taking the idle colours. Appending `border-brand-500` to a
// string that already contains `border-slate-200/80` puts two border-colour
// classes on one element, and the winner is decided by the order of the built
// stylesheet, not the order of the string -- see the note at Button.tsx:53-59
// for the case that established this. Composing here keeps one source of truth
// for the box while letting that caller swap the paint from a single ternary.
export const CARD_SHELL_SHAPE = 'rounded-3xl border shadow-[0_24px_60px_-32px_rgba(15,42,82,0.45)]';

/** The idle paint: border colour and fill. Swap it wholesale, never append to it. */
export const CARD_SURFACE = 'border-slate-200/80 bg-white';

export const CARD_SHELL = `${CARD_SHELL_SHAPE} ${CARD_SURFACE}`;

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
