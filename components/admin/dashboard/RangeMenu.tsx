import React, { useEffect, useId, useRef, useState } from 'react';
import { CalendarRange, Check, ChevronDown } from 'lucide-react';
import { useT } from '../../../hooks/useT';
import type { DashboardRange } from '../../../hooks/dashboard/useDashboardData';

/**
 * The range control, as worn by an individual card, and its static counterpart.
 *
 * ======================= WHY IT LIVES IN THE CARD HEADER ====================
 *
 * It used to be a full-width sticky bar above the whole page, which said "I
 * govern everything below me" and did not: with the deep-dive panel collapsed
 * the dashboard shows five blocks and the range scopes exactly ONE of them (the
 * movement trend). The other four -- the KPI row, the fleet donut, stock by
 * location, high-risk zones -- are counted from the pallet table as of this
 * instant and do not move when the range changes. That mismatch is why the bar
 * needed `range.currentStateNote` printed under it: a sentence apologising for
 * the layout.
 *
 * Putting the picker on each range-scoped card and this chip's twin on each
 * as-of-now card states the same thing structurally, per card, with no prose.
 * The chip also doubles as a caption -- a reader looking at the quality trend
 * can now see what window it covers without scrolling anywhere.
 *
 * ONE VALUE, MANY MOUNT POINTS. Every RangeMenu on the page reads and writes
 * the single `range` in useDashboardData, so changing it on any card changes
 * all of them. That is deliberate: the alternative -- per-card ranges -- would
 * let two cards on the same screen describe different windows, and the CSV
 * export (which stamps one range in its preamble) could then match neither.
 *
 * ============================ WHY NOT SegmentedControl ======================
 *
 * Because it does not fit. The four chips laid out flat run ~230px in English
 * and ~280px in Thai ("7 วัน / 30 วัน / 90 วัน / 12 เดือน"), and the narrowest
 * these cards get is ~328px at a 360px viewport and ~356px in the two-column
 * `md` grid. A control that wide in a header would push the title -- itself
 * already 1.4-1.7x wider in Thai -- onto a second and third line on every card
 * that has one. A chip showing the CURRENT value with the other three a click
 * away costs one interaction and ~90px.
 *
 * ============================== POSITIONING ================================
 *
 * `absolute`, inside a `relative` wrapper, and NOT a portal. Every card this
 * control mounts on is an `accent` Card, and an accent Card sets
 * `overflow-hidden` (load-bearing: it clips the 3px brand hairline to the
 * rounded corners), so anything that escapes the card's box gets cut off. The
 * menu therefore has to open DOWNWARD and INWARD -- right-aligned to a trigger
 * that already sits at the card's right padding edge, and ~160px wide against a
 * ~328px minimum card, so it stays inside on both axes. Do not make it wider
 * than the narrowest card, and do not flip it upwards.
 *
 * This paragraph used to say "Card sets overflow-hidden" flat, as a rule of
 * every card in the app. That reading is what let a Menu get placed in the last
 * row of a card on the settings screen, where half its panel was clipped off the
 * bottom edge. The clip belongs to the hairline, so Card now applies it only
 * with `accent` -- see the note above the Tag in Card.tsx. The constraint here
 * is unchanged, because every card on the dashboard is accented; what changed is
 * that it is a constraint of THESE cards, not of the primitive.
 *
 * ============================= THAI TYPOGRAPHY =============================
 *
 * `min-h`, never `h`: a Thai label runs ~1.4-1.7x its English source. No
 * positive letter-spacing (it lifts tone marks off their base characters) and
 * no `uppercase` (a no-op in Thai, so the emphasis would exist in English
 * only). `whitespace-nowrap` on both chips: Thai has no inter-word spaces, so
 * the browser breaks it on a syllable dictionary and "12 เดือน" can come apart.
 */

/** Presentation order. Shortest window first, so the list reads as a ramp. */
const RANGE_ORDER: readonly DashboardRange[] = ['7d', '30d', '90d', '12m'];

/** Range value -> the dictionary key that names it. */
const RANGE_LABEL_KEY: Record<DashboardRange, 'd7' | 'd30' | 'd90' | 'm12'> = {
    '7d': 'd7',
    '30d': 'd30',
    '90d': 'd90',
    '12m': 'm12',
};

// The shared box. Both chips use it so they read as two states of one idea --
// same height, same radius, same type scale -- and the only difference the eye
// has to resolve is "this one is a control".
const CHIP_BASE =
    'inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium leading-snug whitespace-nowrap';

const TRIGGER =
    // ชิปนี้เป็นปุ่ม -- เส้นขอบคือสิ่งเดียวที่บอกว่ามันกดได้ ใช้เกณฑ์เดียวกับ
    // ปุ่ม secondary ใน Button.tsx (WCAG 1.4.11 ขั้นต่ำ 3:1)
    `${CHIP_BASE} border border-line-control bg-white text-slate-700 transition duration-200 ` +
    'hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';

const MENU_ITEM =
    'flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm leading-snug ' +
    'transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';

export interface RangeMenuProps {
    value: DashboardRange;
    onChange: (range: DashboardRange) => void;
}

export const RangeMenu: React.FC<RangeMenuProps> = ({ value, onChange }) => {
    const t = useT();
    const copy = t.dashboard.analytics.range;
    // Per instance: there are nine of these on a fully expanded dashboard and
    // they must not share one id.
    const menuId = useId();

    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const close = (returnFocus: boolean) => {
        setIsOpen(false);
        if (returnFocus) triggerRef.current?.focus();
    };

    // Both listeners are attached only while this particular menu is open. Nine
    // permanently-attached document keydown handlers would run on every
    // keystroke typed anywhere on the page.
    useEffect(() => {
        if (!isOpen) return;

        // `mousedown`, not `click`: a drag that starts outside and ends on a
        // menu item would otherwise count as an outside click and dismiss the
        // menu before the item ever fired.
        const onPointerDown = (event: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                close(true);
            }
        };

        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [isOpen]);

    // Focus lands on the ACTIVE option rather than the first one, so opening the
    // menu with a keyboard puts the cursor where the current value is and both
    // neighbours are one arrow key away. It draws no ring for a mouse user:
    // items style `focus-visible`, which a programmatic focus following a
    // pointer interaction does not match.
    useEffect(() => {
        if (!isOpen) return;
        const index = RANGE_ORDER.indexOf(value);
        itemRefs.current[index < 0 ? 0 : index]?.focus();
    }, [isOpen, value]);

    const focusItem = (index: number) => {
        const items = itemRefs.current.filter(Boolean);
        if (items.length === 0) return;
        items[(index + items.length) % items.length]?.focus();
    };

    const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const items = itemRefs.current.filter(Boolean);
        const current = items.findIndex((el) => el === document.activeElement);

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                focusItem(current + 1);
                break;
            case 'ArrowUp':
                event.preventDefault();
                focusItem(current - 1);
                break;
            case 'Home':
                event.preventDefault();
                focusItem(0);
                break;
            case 'End':
                event.preventDefault();
                focusItem(items.length - 1);
                break;
            case 'Tab':
                // Tabbing out is a dismissal, and focus is already on its way
                // somewhere else -- so this one does not pull it back.
                setIsOpen(false);
                break;
        }
    };

    return (
        <div className="relative" ref={rootRef}>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen((open) => !open)}
                onKeyDown={(event) => {
                    if (event.key === 'ArrowDown' && !isOpen) {
                        event.preventDefault();
                        setIsOpen(true);
                    }
                }}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-controls={isOpen ? menuId : undefined}
                // The visible text is the VALUE ("30 days"), so the control
                // needs a name of its own -- otherwise a screen reader
                // announces nine buttons called "7 days", "30 days" and so on
                // with nothing saying what they set.
                aria-label={`${copy.label}: ${copy[RANGE_LABEL_KEY[value]]}`}
                className={TRIGGER}
            >
                <CalendarRange size={13} className="shrink-0 text-slate-400" aria-hidden="true" />
                {copy[RANGE_LABEL_KEY[value]]}
                <ChevronDown
                    size={13}
                    aria-hidden="true"
                    className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div
                    id={menuId}
                    role="menu"
                    aria-orientation="vertical"
                    aria-label={copy.label}
                    onKeyDown={onMenuKeyDown}
                    // w-40 is the ceiling: see the positioning note at the top of
                    // this file. Right-aligned and opening downward keeps it
                    // inside the card, which clips anything that escapes.
                    className={
                        // ชั้น overlay ชุดเดียวกับ Menu.tsx -- พาเนลนี้เปิดทับการ์ด
                        // จึงต้องอยู่สูงกว่าการ์ดหนึ่งขั้น ไม่ใช่ระดับเดียวกัน
                        'absolute right-0 z-30 mt-1.5 w-40 rounded-xl border border-line-overlay bg-white p-1 ' +
                        'shadow-overlay'
                    }
                >
                    {RANGE_ORDER.map((option, index) => {
                        const isActive = option === value;
                        return (
                            <button
                                key={option}
                                ref={(el) => {
                                    itemRefs.current[index] = el;
                                }}
                                type="button"
                                // menuitemradio, not menuitem: these four are one
                                // choice, and `aria-checked` is what tells a
                                // screen reader which one is live. The tick below
                                // is the same fact for everyone else -- never
                                // colour alone.
                                role="menuitemradio"
                                aria-checked={isActive}
                                onClick={() => {
                                    onChange(option);
                                    close(true);
                                }}
                                className={`${MENU_ITEM} ${isActive ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700'}`}
                            >
                                <span className="flex w-4 shrink-0 justify-center" aria-hidden="true">
                                    {isActive && <Check size={14} />}
                                </span>
                                {copy[RANGE_LABEL_KEY[option]]}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

/**
 * The static twin, for a card the range does not touch.
 *
 * Same box, no border, no chevron, no hover -- so the difference between "you
 * can change this" and "this is what it is" is carried by the affordance rather
 * than by having to read the two labels. It is plain text, not `aria-hidden`
 * decoration: what a figure was counted against is part of reading it.
 */
export const AsOfNowChip: React.FC = () => {
    const t = useT();
    return (
        <span className={`${CHIP_BASE} bg-slate-100 text-slate-600`}>
            {t.dashboard.analytics.range.asOfNow}
        </span>
    );
};
