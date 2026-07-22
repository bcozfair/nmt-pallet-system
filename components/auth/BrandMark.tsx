import React from 'react';

// The NMT wordmark, drawn rather than loaded. public/logo.png is a palette PNG
// with an opaque white background, so it can only ever sit on a white surface;
// these are the same letterform paths public/favicon.svg uses, which means one
// definition of the mark, crisp at any size, and no extra request.
//
// Letters are stroked, not filled: the wordmark is geometric and of uniform
// weight, so a stroke reproduces it in a fraction of the path data.
export const BrandMark: React.FC<{ className?: string; title?: string }> = ({
    className = 'h-7 w-auto',
    title = 'NMT',
}) => (
    <svg
        // Cropped to the ink itself -- the 9-wide stroke extends 4.5 either side
        // of each path, which is where these bounds come from.
        viewBox="12 40.5 100.5 49"
        className={className}
        role="img"
        aria-label={title}
    >
        <g fill="none" strokeWidth={9} strokeLinecap="butt" strokeLinejoin="miter">
            <path d="M16.5,85 V45 L38.5,85 V45" stroke="var(--color-brand-600)" />

            {/* M is laid down whole in blue so its corners mitre cleanly... */}
            <path d="M52,85 V45 L66,81 L80,45 V85" stroke="var(--color-brand-600)" />
            {/* ...then the centre V goes over it in teal, the accent that carries
                the brand at small sizes. */}
            <path d="M52,45 L66,81 L80,45" stroke="var(--color-accent-500)" />

            {/* T: the crossbar sits at y=49.5 so its top edge lands on the y=45
                baseline the other letters share. */}
            <path d="M89,49.5 H108" stroke="var(--color-brand-600)" />
            <path d="M98.5,45 V85" stroke="var(--color-brand-600)" />
            <path d="M99.5,49.5 H108" stroke="var(--color-accent-500)" />
        </g>
    </svg>
);
