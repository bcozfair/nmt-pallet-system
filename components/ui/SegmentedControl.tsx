import React, { useRef } from 'react';

export interface SegmentedControlProps<T extends string> {
    value: T;
    options: readonly { value: T; label: string }[];
    onChange: (value: T) => void;
    ariaLabel: string;
    size?: 'sm' | 'md';
}

// The period / grouping switch above the dashboard charts. Visually this is the
// same object as the language toggle in components/LanguageToggle.tsx -- slate
// track, white selected chip -- but it is a radiogroup rather than a row of
// toggle buttons, because exactly one option is selected at a time.
//
// Radius is rounded-xl / rounded-lg, NOT rounded-full. The Thai period labels
// run about twice the width of the English ones ("สัปดาห์" against "Week"), and a
// fully-round pill at that width turns into a lozenge with a lot of dead space
// at either end. There is also no width on the track or the items: it sizes to
// its content, so the Thai build is simply wider rather than clipped.
export function SegmentedControl<T extends string>({
    value,
    options,
    onChange,
    ariaLabel,
    size = 'md',
}: SegmentedControlProps<T>) {
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const selectedIndex = options.findIndex((o) => o.value === value);

    // Roving tabindex: the group is one tab stop, and the arrow keys move
    // between options inside it. Selection follows focus, which is the expected
    // behaviour for a radiogroup and what makes this usable without a mouse.
    // Focus has to be moved explicitly -- React re-renders the buttons but does
    // not know one of them should now be holding focus.
    const move = (delta: number) => {
        if (selectedIndex < 0) return;
        const next = (selectedIndex + delta + options.length) % options.length;
        onChange(options[next].value);
        itemRefs.current[next]?.focus();
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                move(1);
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                move(-1);
                break;
            case 'Home':
                e.preventDefault();
                onChange(options[0].value);
                itemRefs.current[0]?.focus();
                break;
            case 'End': {
                e.preventDefault();
                const last = options.length - 1;
                onChange(options[last].value);
                itemRefs.current[last]?.focus();
                break;
            }
        }
    };

    const itemSize = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';

    return (
        <div
            role="radiogroup"
            aria-label={ariaLabel}
            onKeyDown={onKeyDown}
            className={`inline-flex items-center gap-1 bg-slate-100 p-1 text-slate-500 ${size === 'sm' ? 'rounded-lg' : 'rounded-xl'}`}
        >
            {options.map((opt, i) => {
                const selected = opt.value === value;
                return (
                    <button
                        key={opt.value}
                        ref={(el) => {
                            itemRefs.current[i] = el;
                        }}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        tabIndex={selected ? 0 : -1}
                        onClick={() => onChange(opt.value)}
                        // Weight stays constant across states. Bolding the
                        // selected item would change its measured width and
                        // shuffle the other options sideways on every switch --
                        // the white chip is what marks the selection.
                        className={
                            `${size === 'sm' ? 'rounded-md' : 'rounded-lg'} ${itemSize} whitespace-nowrap font-medium transition ` +
                            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ' +
                            (selected ? 'bg-white text-brand-700 shadow-sm' : 'hover:text-slate-700')
                        }
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}
