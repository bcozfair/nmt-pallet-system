import React from 'react';

export type CardTone = 'default' | 'danger';

export interface CardProps {
    children: React.ReactNode;
    className?: string;
    /** Renders the 3px brand hairline across the top edge. */
    accent?: boolean;
    /** Sweeps the hairline while a request is in flight. Requires `accent`. */
    busy?: boolean;
    /**
     * Swaps the surface paint wholesale. `danger` is for a panel whose contents
     * are irreversible and affect somebody other than the person clicking --
     * the admin-email migration on the settings screen is the only one so far.
     * Not a decoration: reach for it when the card's contents are dangerous,
     * never to draw attention to something merely important.
     */
    tone?: CardTone;
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

/**
 * The danger paint. A full replacement for CARD_SURFACE, which is the whole
 * point: `className="border-red-200"` on a Card would put two border-colour
 * classes on one element and the winner is decided by the order of the built
 * stylesheet, not the order of the string. See the note above CARD_SHELL_SHAPE.
 *
 * The fill is a tint rather than `bg-red-50` at full strength: this card carries
 * a form the admin has to read and type into, and a saturated red field makes
 * the input inside it read as already-in-error.
 */
export const CARD_SURFACE_DANGER = 'border-red-200 bg-red-50/40';

export const CARD_SHELL = `${CARD_SHELL_SHAPE} ${CARD_SURFACE}`;

const TONE_SURFACE: Record<CardTone, string> = {
    default: CARD_SURFACE,
    danger: CARD_SURFACE_DANGER,
};

// The brand hairline doubles as this app's only progress indicator: the
// gradient is laid out at twice the bar's width and slid leftwards while a
// request is in flight. One element, two jobs -- which is exactly why the
// sign-in and reset screens carry no separate spinner, and why the dashboard
// should not grow one either.
//
// Extracted from Card's body so Modal.tsx can wear the same line without also
// taking CARD_SHELL's shadow, which is tuned for a card sitting on a light page
// and disappears entirely over a dimmed overlay. Copying the markup into
// Modal.tsx instead would have let the two drift; appending a shadow class to
// CARD_SHELL would have hit the class-order trap documented above.
export const BrandHairline: React.FC<{ busy?: boolean }> = ({ busy = false }) => (
    <div
        className={
            'h-[3px] w-full shrink-0 bg-linear-to-r from-brand-600 via-accent-500 to-brand-600 ' +
            'bg-[length:200%_100%] ' +
            (busy ? 'animate-brand-sweep' : '')
        }
        aria-hidden="true"
    />
);

export const Card: React.FC<CardProps> = ({
    children,
    className = '',
    accent = false,
    busy = false,
    tone = 'default',
    as: Tag = 'div',
}) => (
    // `overflow-hidden` is load-bearing, not tidiness: the hairline is a square
    // 3px bar, so without it the gradient pokes out past the rounded-3xl corners
    // and the top of the card reads as a rendering artefact.
    //
    // Which is exactly why it is tied to `accent` rather than applied to every
    // card. It used to be unconditional, and the cost was paid by cards that
    // have no hairline to clip: `overflow: hidden` also clips every absolutely
    // positioned descendant, so a Menu opening downward from the last row of a
    // card lost half its panel off the bottom edge. RangeMenu.tsx:41-49 wrote
    // that constraint down as a rule of the whole app -- "anything that escapes
    // the card's box gets cut off", hence its never-wider-than-160px,
    // never-upward panel. It is a rule of accented cards only.
    //
    // A card without the hairline has nothing touching its rounded corners: every
    // consumer pads its own content. Removing the clip there costs nothing and
    // also drops a stray block formatting context -- the same one DataTable.tsx
    // had to swap for `overflow-clip` because it was breaking sticky headers.
    //
    // Shape and paint are recombined here rather than reusing CARD_SHELL, so the
    // tone swaps the whole surface string instead of layering a second one on
    // top of it. CARD_SHELL stays exported unchanged for the skeletons, which
    // only ever stand in for a default card.
    <Tag
        className={`${CARD_SHELL_SHAPE} ${TONE_SURFACE[tone]} ${accent ? 'overflow-hidden' : ''} ${className}`}
    >
        {accent && <BrandHairline busy={busy} />}
        {children}
    </Tag>
);
