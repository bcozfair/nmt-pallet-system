import React from 'react';
import { Download, QrCode, Plus, Package } from 'lucide-react';
import { useT } from '../../../hooks/useT';
import type { PageOrientation } from '../../../hooks/usePageOrientation';
import { Button, PageHeader, PrintMenu } from '../../ui';

// The selection-mode half of this file (the blue bar, show/hide-IDs panel and
// its bulk buttons) moved wholesale to InventorySelectionBar.tsx, which floats
// over the bottom of the viewport instead of replacing this header. That is
// what fixes the old bug where scrolling down to tick a row pushed the only
// place to act on the selection off the top of the screen. What is left here
// is just the page identity: title, subtitle and the three actions that apply
// regardless of what, if anything, is selected.
interface InventoryHeaderProps {
    onExport: () => void;
    // Prints the screen itself. Not to be confused with onPrintQrAll below,
    // which builds a sheet of QR stickers in a window of its own.
    onPrintReport: (orientation: PageOrientation) => void;
    onPrintQrAll: () => void;
    onAddPallet: () => void;
}

export const InventoryHeader: React.FC<InventoryHeaderProps> = ({
    onExport,
    onPrintReport,
    onPrintQrAll,
    onAddPallet,
}) => {
    const t = useT();

    return (
        <PageHeader
            title={t.inventory.title}
            subtitle={t.inventory.subtitle}
            icon={Package}
            actions={
                <>
                    {/* The same control the dashboard header carries, so an
                        admin who learned it there finds it here unchanged.
                        Export stays a plain button rather than becoming a
                        dropdown to match the dashboard's: this screen has one
                        export, and a menu with a single item is a second click
                        that offers no choice. */}
                    <PrintMenu
                        label={t.common.printReport}
                        landscapeLabel={t.common.printLandscape}
                        portraitLabel={t.common.printPortrait}
                        onPrint={onPrintReport}
                    />
                    <Button variant="secondary" icon={Download} onClick={onExport}>
                        {t.inventory.exportList}
                    </Button>
                    <Button variant="accentSoft" icon={QrCode} onClick={onPrintQrAll}>
                        {t.inventory.printAllQr}
                    </Button>
                    <Button variant="primary" icon={Plus} onClick={onAddPallet}>
                        {t.inventory.addPallet}
                    </Button>
                </>
            }
        />
    );
};
