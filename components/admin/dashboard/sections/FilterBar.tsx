import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Clock, FileText, Package, PieChart, Printer } from 'lucide-react';
import { SegmentedControl } from '../../../ui';
import { useT } from '../../../../hooks/useT';
import type { DashboardRange } from '../../../../hooks/dashboard/useDashboardData';

export interface FilterBarProps {
    range: DashboardRange;
    onRangeChange: (r: DashboardRange) => void;
    onPrint: () => void;
    onExportSummary: () => void;
    onExportInventory: () => void;
    onExportHistory: () => void;
    isBusy?: boolean;
}

// The one bar that stays on screen while the dashboard scrolls: the range the
// charts are drawn for, the note explaining what that range does NOT cover, and
// the two output actions lifted out of DashboardHeader.
//
// The negative margins are the whole trick to the container class below. The bar
// is rendered inside `<main className="p-4 lg:p-8">`, so `-mx-4 lg:-mx-8` pulls
// it back out to the full width of the scroll container -- the border and the
// blurred backdrop then run edge to edge, the way a sticky bar has to in order
// to read as a bar rather than as a floating card. Its own `px-4 lg:px-8` puts
// the content back on the same left edge as everything below it.
//
// Sizes here are the sign-in CTA (LoginPage.tsx:180) scaled down: same radius,
// same brand fill, same shadow tint, py-2 instead of py-3.
//
// `min-h-10` and never `h-10`. A Thai button label runs ~1.4-1.7x the width of
// its English source, and the browser cannot break inside it -- so the failure
// mode of a fixed height is a clipped label in exactly one language.
const BUTTON_BASE =
    'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold leading-snug ' +
    'transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ' +
    'disabled:cursor-not-allowed disabled:opacity-60';

const BUTTON_SECONDARY = `${BUTTON_BASE} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-[0.99] disabled:hover:bg-white`;

const BUTTON_PRIMARY = `${BUTTON_BASE} bg-brand-600 text-white shadow-lg shadow-brand-600/20 hover:bg-brand-700 active:scale-[0.99] disabled:hover:bg-brand-600`;

const MENU_ITEM =
    'flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm leading-snug text-slate-700 ' +
    'transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';

const MENU_CHIP = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg';

export const FilterBar: React.FC<FilterBarProps> = ({
    range,
    onRangeChange,
    onPrint,
    onExportSummary,
    onExportInventory,
    onExportHistory,
    isBusy = false,
}) => {
    const t = useT();
    const menuId = useId();

    const [isExportOpen, setIsExportOpen] = useState(false);
    const exportRootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

    // Rebuilt when the language changes, because `t` is a new object then and
    // the labels inside these options are the strings that have to change.
    const rangeOptions = useMemo<readonly { value: DashboardRange; label: string }[]>(
        () => [
            { value: '7d', label: t.dashboard.analytics.range.d7 },
            { value: '30d', label: t.dashboard.analytics.range.d30 },
            { value: '90d', label: t.dashboard.analytics.range.d90 },
            { value: '12m', label: t.dashboard.analytics.range.m12 },
        ],
        [t],
    );

    const closeMenu = (returnFocus: boolean) => {
        setIsExportOpen(false);
        if (returnFocus) triggerRef.current?.focus();
    };

    // Ported from DashboardHeader.tsx, with the three things that version was
    // missing. That one was a bare div toggle: no aria-expanded, so a screen
    // reader announced a button that appeared to do nothing; no Escape, so the
    // only way out was a mouse click somewhere else; and no focus return, so
    // keyboard focus was left on a node that had just been unmounted.
    //
    // Both listeners are attached only while the menu is open -- a keydown
    // handler on `document` for the entire life of the dashboard would run on
    // every keystroke typed into every field on the page.
    useEffect(() => {
        if (!isExportOpen) return;

        // `mousedown`, not `click`: a click that starts outside and finishes on
        // the menu would otherwise count as an outside click and close it.
        const onPointerDown = (event: MouseEvent) => {
            if (exportRootRef.current && !exportRootRef.current.contains(event.target as Node)) {
                setIsExportOpen(false);
            }
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeMenu(true);
            }
        };

        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [isExportOpen]);

    // Focus lands on the first item when the menu opens, which is what makes it
    // reachable at all from the keyboard. It does not draw a ring for a mouse
    // user: the items style `focus-visible`, and a programmatic focus following
    // a pointer interaction does not match it.
    useEffect(() => {
        if (isExportOpen) itemRefs.current[0]?.focus();
    }, [isExportOpen]);

    const focusItem = (index: number) => {
        const items = itemRefs.current.filter(Boolean);
        if (items.length === 0) return;
        const wrapped = (index + items.length) % items.length;
        items[wrapped]?.focus();
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
                // Tabbing out is a dismissal. Focus is already moving on its
                // own, so this one does not pull it back to the trigger.
                setIsExportOpen(false);
                break;
        }
    };

    const runExport = (action: () => void) => {
        action();
        closeMenu(true);
    };

    const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'ArrowDown' && !isExportOpen) {
            event.preventDefault();
            setIsExportOpen(true);
        }
    };

    return (
        <div
            className={
                'sticky top-0 z-20 -mx-4 lg:-mx-8 mb-2 border-b border-slate-200/70 ' +
                'bg-slate-50/85 px-4 py-3 backdrop-blur lg:px-8 print:hidden ' +
                'flex flex-wrap items-center gap-3'
            }
            aria-busy={isBusy}
        >
            {/* shrink-0: the range control sizes to its content and is never
                compressed. The Thai labels are roughly twice the width of the
                English ones, and a squeezed radiogroup would break the four
                chips onto each other rather than moving the bar to two rows. */}
            <div className="shrink-0">
                <SegmentedControl<DashboardRange>
                    value={range}
                    options={rangeOptions}
                    onChange={onRangeChange}
                    ariaLabel={t.dashboard.analytics.range.label}
                />
            </div>

            {/* No shrink-0 on the group, and flex-wrap inside it: at 360px the
                pair moves to a second row intact, and only stacks if a future
                translation makes even one row impossible. */}
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                <button type="button" onClick={onPrint} disabled={isBusy} className={BUTTON_SECONDARY}>
                    <Printer size={16} aria-hidden="true" />
                    {t.dashboard.printReport}
                </button>

                <div className="relative" ref={exportRootRef}>
                    <button
                        ref={triggerRef}
                        type="button"
                        onClick={() => setIsExportOpen((open) => !open)}
                        onKeyDown={onTriggerKeyDown}
                        disabled={isBusy}
                        aria-haspopup="menu"
                        aria-expanded={isExportOpen}
                        aria-controls={isExportOpen ? menuId : undefined}
                        className={BUTTON_PRIMARY}
                    >
                        <FileText size={16} aria-hidden="true" />
                        {t.dashboard.exportData}
                        <ChevronDown
                            size={16}
                            aria-hidden="true"
                            className={`transition-transform duration-200 ${isExportOpen ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {isExportOpen && (
                        <div
                            id={menuId}
                            role="menu"
                            aria-orientation="vertical"
                            aria-label={t.dashboard.exportData}
                            onKeyDown={onMenuKeyDown}
                            // max-w keeps it inside a 360px viewport: the menu is
                            // right-aligned to a button that already sits near the
                            // right edge, so a fixed w-64 would otherwise hang off
                            // the screen once the Thai labels widen it.
                            className={
                                'absolute right-0 z-30 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border ' +
                                'border-slate-200 bg-white p-1.5 shadow-[0_24px_60px_-32px_rgba(15,42,82,0.45)]'
                            }
                        >
                            <button
                                ref={(el) => {
                                    itemRefs.current[0] = el;
                                }}
                                type="button"
                                role="menuitem"
                                onClick={() => runExport(onExportSummary)}
                                className={MENU_ITEM}
                            >
                                <span className={`${MENU_CHIP} bg-brand-50 text-brand-600`} aria-hidden="true">
                                    <PieChart size={14} />
                                </span>
                                {t.dashboard.exportSummary}
                            </button>

                            <button
                                ref={(el) => {
                                    itemRefs.current[1] = el;
                                }}
                                type="button"
                                role="menuitem"
                                onClick={() => runExport(onExportInventory)}
                                className={MENU_ITEM}
                            >
                                <span className={`${MENU_CHIP} bg-accent-50 text-accent-600`} aria-hidden="true">
                                    <Package size={14} />
                                </span>
                                {t.dashboard.exportInventoryCsv}
                            </button>

                            <button
                                ref={(el) => {
                                    itemRefs.current[2] = el;
                                }}
                                type="button"
                                role="menuitem"
                                onClick={() => runExport(onExportHistory)}
                                className={MENU_ITEM}
                            >
                                <span className={`${MENU_CHIP} bg-slate-100 text-slate-500`} aria-hidden="true">
                                    <Clock size={14} />
                                </span>
                                {t.dashboard.exportHistoryCsv}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Full width, so it always takes its own line under the controls
                rather than being squeezed between them -- the Thai sentence is
                long enough that sharing a row with the buttons would wrap it to
                three lines and make the sticky bar taller, not shorter.

                It is here because the KPI figures beside the charts are counted
                as of now and are deliberately NOT scoped by the selector above.
                Without this line the reader has no way to tell that from a bug:
                a "90 days" label over a fleet count that did not change when
                they switched from 7 days reads as a broken filter. */}
            <p className="w-full text-xs leading-relaxed text-slate-500">
                {t.dashboard.analytics.range.currentStateNote}
            </p>
        </div>
    );
};
