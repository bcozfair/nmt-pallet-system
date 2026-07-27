import React from 'react';
import { Clock, FileText, Package, PieChart, Printer } from 'lucide-react';
import { Button, Menu, PageHeader as UiPageHeader } from '../../../ui';
import type { MenuItem } from '../../../ui';
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
export const PageHeader: React.FC<PageHeaderProps> = ({
    onPrint,
    onExportSummary,
    onExportInventory,
    onExportHistory,
    isBusy = false,
}) => {
    const t = useT();

    const exportItems: MenuItem[] = [
        { label: t.dashboard.exportSummary, icon: PieChart, tone: 'brand', onClick: onExportSummary },
        { label: t.dashboard.exportInventoryCsv, icon: Package, tone: 'accent', onClick: onExportInventory },
        { label: t.dashboard.exportHistoryCsv, icon: Clock, tone: 'neutral', onClick: onExportHistory },
    ];

    return (
        <UiPageHeader
            title={t.dashboard.title}
            subtitle={t.dashboard.subtitle}
            actionsBusy={isBusy}
            actions={
                <>
                    <Button variant="secondary" icon={Printer} onClick={onPrint} disabled={isBusy}>
                        {t.dashboard.printReport}
                    </Button>
                    <Menu label={t.dashboard.exportData} icon={FileText} items={exportItems} disabled={isBusy} />
                </>
            }
        />
    );
};
