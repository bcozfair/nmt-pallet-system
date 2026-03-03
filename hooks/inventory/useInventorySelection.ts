
import { useState, useCallback } from 'react';
import { Pallet } from '../../types';

export const useInventorySelection = (processedPallets: Pallet[]) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const handleSelectAll = useCallback(() => {
        if (selectedIds.size === processedPallets.length && processedPallets.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(processedPallets.map(p => p.pallet_id)));
        }
    }, [selectedIds, processedPallets]);

    const handleSelectRow = useCallback((id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    }, [selectedIds]);

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    return {
        selectedIds,
        setSelectedIds,
        handleSelectAll,
        handleSelectRow,
        clearSelection
    };
};
