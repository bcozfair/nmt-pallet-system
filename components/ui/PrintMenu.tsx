import React from 'react';
import { Printer, RectangleHorizontal, RectangleVertical } from 'lucide-react';
import { Menu } from './Menu';
import type { MenuItem } from './Menu';
import type { PageOrientation } from '../../hooks/usePageOrientation';

export interface PrintMenuProps {
    /** The trigger's label, e.g. "Print Report". */
    label: string;
    landscapeLabel: string;
    portraitLabel: string;
    onPrint: (orientation: PageOrientation) => void;
    disabled?: boolean;
}

// "Print Report" with the paper orientation attached.
//
// A dropdown rather than two buttons side by side: printing is one action, and
// the orientation is a property of it. Two buttons would read as two different
// reports, and would cost twice the width in a header row that already carries
// an export control.
//
// It is a wrapper over Menu, not a copy of its markup, so this stays a list of
// what the items ARE. The keyboard handling, Escape, focus return and
// aria-expanded all come from Menu, which records what happened the last time
// somebody hand-rolled a dropdown in this app.
//
// A component rather than a MenuItem[] built at each call site, because three
// screens print now and the wording, the icons and the order have to be the same
// on all three -- a reader who learns the menu on the dashboard should find the
// identical one on the inventory screen.
//
// The type import is deliberately type-only: this folder's house rule is that
// nothing in it reaches for app state or the dictionary, and a `type` import
// erases at compile time.
export const PrintMenu: React.FC<PrintMenuProps> = ({
    label,
    landscapeLabel,
    portraitLabel,
    onPrint,
    disabled = false,
}) => {
    // Landscape first: it is the default in index.css's `@page`, it is what the
    // dashboard's charts are laid out for, and it is what a reader gets from a
    // plain Ctrl+P. The first item is also the one Menu moves focus to on open,
    // so the keyboard default and the stylesheet default agree.
    const items: MenuItem[] = [
        { label: landscapeLabel, icon: RectangleHorizontal, tone: 'brand', onClick: () => onPrint('landscape') },
        { label: portraitLabel, icon: RectangleVertical, tone: 'neutral', onClick: () => onPrint('portrait') },
    ];

    return <Menu label={label} icon={Printer} items={items} variant="secondary" disabled={disabled} />;
};
