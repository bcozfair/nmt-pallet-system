import React from 'react';
import { ArrowRightLeft, QrCode, List, CircleCheckBig, Ban, Trash2 } from 'lucide-react';
import { useT } from '../../../hooks/useT';
import { Button, SelectionBar } from '../../ui';

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
            // Every action sits on the bar. There is no "..." menu any more:
            // reaching a bulk action used to cost a click to open the menu, a
            // read of four labels, and a second click -- for a bar that exists
            // to be acted on immediately, and whose whole point is that the
            // actions are in front of you at the moment you have made a
            // selection. At most six buttons appear at once, and three of them
            // are conditional, so the common case is three or four.
            //
            // The bar wraps to a second row when the labels do not fit, and
            // that costs nothing now: SelectionBar measures its own rendered
            // height and publishes it, so the page reserves whatever the bar
            // actually turned out to be rather than a number written here.
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
                    {/* A real toggle, so it carries `aria-pressed` rather than
                        relying on the label flipping between "show" and "hide"
                        -- the label alone tells a screen reader what the next
                        press will do, never what the current state is. */}
                    <Button
                        variant="inverseGhost"
                        icon={List}
                        aria-pressed={showIds}
                        onClick={() => setShowIds((prev) => !prev)}
                    >
                        {showIds ? t.inventory.hideIds : t.inventory.showIds}
                    </Button>
                    {/* Same condition gates both: the selection is all damaged
                        pallets, so either resolution -- repair it, or write it
                        off -- applies. */}
                    {showRepairButton && (
                        <>
                            <Button variant="inverseGhost" icon={CircleCheckBig} onClick={onBulkRepair}>
                                {t.action.repair}
                            </Button>
                            <Button variant="inverseGhost" icon={Ban} onClick={onBulkScrap}>
                                {t.inventory.scrap}
                            </Button>
                        </>
                    )}
                    {/* Delete is on the bar because that is what was asked for,
                        but it does not get to look like its neighbours. It
                        erases a pallet's entire transaction history permanently
                        and unrecoverably (see deleteMessage / bulkDeleteMessage
                        in locales/admin/inventory.ts), and it now sits inches
                        from buttons pressed routinely, where it used to be two
                        clicks deep in a menu. `inverseDanger` and last position
                        are what is left carrying that weight -- along with the
                        confirm modal, which is unchanged and is the thing
                        actually standing between a misclick and data loss. */}
                    <Button variant="inverseDanger" icon={Trash2} onClick={onBulkDelete}>
                        {t.common.delete}
                    </Button>
                </>
            }
        />
    );
};
