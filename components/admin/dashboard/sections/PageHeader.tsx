import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Clock, FileText, Package, PieChart, Printer } from 'lucide-react';
import { useT } from '../../../../hooks/useT';

export interface PageHeaderProps {
    onPrint: () => void;
    onExportSummary: () => void;
    onExportInventory: () => void;
    onExportHistory: () => void;
    isBusy?: boolean;
}

// The dashboard's page header: what this screen is, and the two things you can
// do with it.
//
// ======================== WHAT THIS REPLACED AND WHY =======================
//
// A sticky, full-bleed filter bar carrying the range selector, both output
// buttons and a two-line disclaimer. Three problems, all traceable to the range
// control being in it:
//
//  1. IT CLAIMED A SCOPE IT DID NOT HAVE. With the deep-dive panel collapsed
//     the page shows five blocks and the range governed exactly one of them.
//     A full-width control at the top of a page reads as "everything below".
//  2. SO IT NEEDED A DISCLAIMER. `range.currentStateNote` was printed under the
//     controls to explain that the KPI figures were not filtered -- a sentence
//     whose only job was to apologise for the layout. The range picker now sits
//     on each card it actually scopes (see RangeMenu.tsx), and the cards it does
//     not scope wear AsOfNowChip, so the sentence has nothing left to say. It
//     survives in the summary CSV, which has no card headers to put chips in.
//  3. THE DASHBOARD WAS THE ONLY TAB WITHOUT A TITLE. Inventory, Users,
//     Locations, Transactions and Settings all open with a heading and a
//     subtitle; this one opened with a naked control strip in the place a
//     reader's eye goes looking for the page name.
//
// Not sticky any more, and not full-bleed: with nothing on it that has to be
// reachable mid-scroll, a bar pinned to the top of the viewport was spending
// ~64px of every screenful on two buttons.
//
// Sizes are the sign-in CTA (LoginPage.tsx:180) scaled down: same radius, same
// brand fill, same shadow tint, py-2 instead of py-3.
//
// `min-h-10` and never `h-10`. A Thai button label runs ~1.4-1.7x the width of
// its English source and the browser cannot break inside it -- so the failure
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

export const PageHeader: React.FC<PageHeaderProps> = ({
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

    const closeMenu = (returnFocus: boolean) => {
        setIsExportOpen(false);
        if (returnFocus) triggerRef.current?.focus();
    };

    // Ported from the DashboardHeader this file's ancestor replaced, with the
    // three things that version was missing. That one was a bare div toggle: no
    // aria-expanded, so a screen reader announced a button that appeared to do
    // nothing; no Escape, so the only way out was a mouse click somewhere else;
    // and no focus return, so keyboard focus was left on a node that had just
    // been unmounted.
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
        // `items-start`, not `items-center`: the Thai subtitle wraps to two
        // lines in the narrow column and centring would drag the buttons down
        // to the middle of the block. flex-wrap so the pair drops to its own
        // row at 360px rather than squeezing the title.
        //
        // print:hidden because it is chrome -- DashboardHome renders a proper
        // report heading for paper, which the sidebar and the tab bar cannot
        // supply.
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 print:hidden">
            <div className="min-w-0">
                {/* h1: this is the page, and the five section cards under it are
                    h2/h3 through SectionHeader. `tracking-tight` only -- the
                    positive direction lifts Thai tone marks off their base
                    characters. Nothing heavier than semibold: weight 900 is not
                    among the five the app loads. */}
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                    {t.dashboard.title}
                </h1>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">{t.dashboard.subtitle}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2" aria-busy={isBusy}>
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
        </div>
    );
};
