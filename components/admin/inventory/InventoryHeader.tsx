import React from 'react';
import { Download, QrCode, Plus, Package } from 'lucide-react';
import { useT } from '../../../hooks/useT';
import { Button, PageHeader } from '../../ui';

// The selection-mode half of this file (the blue bar, show/hide-IDs panel and
// its bulk buttons) moved wholesale to InventorySelectionBar.tsx, which floats
// over the bottom of the viewport instead of replacing this header. That is
// what fixes the old bug where scrolling down to tick a row pushed the only
// place to act on the selection off the top of the screen. What is left here
// is just the page identity: title, subtitle and the three actions that apply
// regardless of what, if anything, is selected.
interface InventoryHeaderProps {
    onExport: () => void;
    onPrintQrAll: () => void;
    onAddPallet: () => void;
}

export const InventoryHeader: React.FC<InventoryHeaderProps> = ({
    onExport,
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
