import React from 'react';
import { ArrowRightLeft, QrCode, MoreHorizontal, List, CircleCheckBig, Ban, Trash2 } from 'lucide-react';
import { useT } from '../../../hooks/useT';
import { Button, Menu, SelectionBar } from '../../ui';
import type { MenuItem } from '../../ui';

export interface InventorySelectionBarProps {
    selectedCount: number;
    selectedIds: string[];
    onClearSelection: () => void;
    onBulkRepair: () => void;
    onBulkScrap: () => void;
    onBulkDelete: () => void;
    onPrintQrSelected: () => void;
    onBulkTransaction: () => void;
    showRepairButton: boolean;
    showTransactionButton: boolean;
}

// Everything that used to live in InventoryHeader's `selectedCount > 0` branch,
// now floating over the bottom of the viewport via SelectionBar instead of
// swapping out the page header. See that component for why: a bar that
// replaces the header is invisible once the user has scrolled past it.
export const InventorySelectionBar: React.FC<InventorySelectionBarProps> = ({
    selectedCount,
    selectedIds,
    onClearSelection,
    onBulkRepair,
    onBulkScrap,
    onBulkDelete,
    onPrintQrSelected,
    onBulkTransaction,
    showRepairButton,
    showTransactionButton,
}) => {
    const t = useT();
    const [showIds, setShowIds] = React.useState(false);

    const menuItems: MenuItem[] = [
        {
            label: showIds ? t.inventory.hideIds : t.inventory.showIds,
            icon: List,
            tone: 'neutral',
            onClick: () => setShowIds((prev) => !prev),
        },
    ];

    // Same condition gates both: the selection is all damaged pallets, so
    // either resolution -- repair it, or write it off -- applies.
    if (showRepairButton) {
        menuItems.push(
            { label: t.action.repair, icon: CircleCheckBig, tone: 'brand', onClick: onBulkRepair },
            { label: t.inventory.scrap, icon: Ban, tone: 'neutral', onClick: onBulkScrap },
        );
    }

    // Delete lives in the menu, not on the bar itself, on purpose: deleting a
    // pallet erases its entire transaction history permanently and
    // unrecoverably (see deleteMessage / bulkDeleteMessage in
    // locales/admin/inventory.ts), and a button that destructive should not
    // sit 8px away from the buttons this bar is meant to be pressed on
    // routinely. The confirm modal it opens is unchanged.
    menuItems.push({ label: t.common.delete, icon: Trash2, tone: 'danger', onClick: onBulkDelete });

    // `localeCompare` with `numeric: true` so "P2" sorts before "P10" instead
    // of after it, and `sensitivity: 'base'` so case never splits what is
    // otherwise the same ID -- carried over unchanged from the panel this
    // replaces (InventoryHeader.tsx's old show/hide-IDs block).
    const sortedIds = [...selectedIds].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );

    return (
        <SelectionBar
            count={selectedCount}
            countLabel={t.inventory.selectedCount(selectedCount)}
            onClear={onClearSelection}
            clearLabel={t.common.cancel}
            detail={
                showIds && sortedIds.length > 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                            {sortedIds.map((id) => (
                                <span
                                    key={id}
                                    className="rounded-md border border-brand-100 bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700"
                                >
                                    {id}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : undefined
            }
            actions={
                <>
                    {showTransactionButton && (
                        <Button variant="inverse" icon={ArrowRightLeft} onClick={onBulkTransaction}>
                            {t.inventory.transaction}
                        </Button>
                    )}
                    <Button variant="inverseGhost" icon={QrCode} onClick={onPrintQrSelected}>
                        {t.inventory.printQr}
                    </Button>
                </>
            }
            menu={
                <Menu
                    iconOnly
                    openUpward
                    variant="inverseGhost"
                    icon={MoreHorizontal}
                    label={t.inventory.moreActions}
                    items={menuItems}
                />
            }
        />
    );
};
