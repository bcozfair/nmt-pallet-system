import React from 'react';
import { Clock, FileText, LayoutDashboard, Package, PieChart, Printer } from 'lucide-react';
import { Button, Menu, PageHeader as UiPageHeader } from '../../../ui';
import type { MenuItem } from '../../../ui';
import { useT } from '../../../../hooks/useT';

export interface PageHeaderProps {
    /** Opens the A4 report preview. Not a print call: see the note on the button. */
    onOpenReport: () => void;
    /**
     * The report needs the analytics snapshot; the exports mostly do not.
     *
     * Separate from `isBusy` for that reason. Folding the two together made the
     * whole action strip go dead whenever the analytics fetch failed -- taking
     * the inventory and history CSV exports with it, which fetch their own data
     * and would have worked fine.
     */
    canOpenReport?: boolean;
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
    onOpenReport,
    canOpenReport = true,
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
            // ทุกหน้าแอดมินมีไอคอนนำหน้าหัวเรื่อง หน้านี้เคยเป็นหน้าเดียวที่ไม่มี
            // -- เป็นเศษที่เหลือจากตอนที่หน้านี้ยังไม่มีหัวเรื่องเลย (ดูข้อ 3 ข้างบน)
            // ตอนเติมหัวเรื่องกลับมาจึงเติมแต่ข้อความ ไอคอนตกหล่นไป
            icon={LayoutDashboard}
            actionsBusy={isBusy}
            actions={
                <>
                    {/* The same button, with the same label and icon, that the
                        inventory and transaction headers carry. All three build
                        an A4 portrait document and print it (see
                        components/report/ReportPage.tsx for the two reasons none
                        of them can be printed in place), so there is one control
                        to learn.

                        It used to read "Report" rather than "Print Report",
                        because there was a preview between the button and the
                        printer and "Report" was the honest name for what opened.
                        The preview is gone; the browser's own print preview does
                        that job. `common.printReport` is now what all three read.

                        `canOpenReport` is separate from `isBusy` on purpose: a
                        failed analytics fetch must disable this without also
                        disabling the CSV exports beside it, which fetch their own
                        data. */}
                    <Button
                        variant="secondary"
                        icon={Printer}
                        onClick={onOpenReport}
                        disabled={isBusy || !canOpenReport}
                    >
                        {t.common.printReport}
                    </Button>
                    {/* `t.common.exportData`, the same key the inventory and
                        transaction headers read. See the note beside it. */}
                    <Menu label={t.common.exportData} icon={FileText} items={exportItems} disabled={isBusy} />
                </>
            }
        />
    );
};
