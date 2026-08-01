import { useCallback, useState } from 'react';
import type { Pallet } from '../../types';
import { fetchTransactions } from '../../services/transactionService';
import { getEvidenceSignedUrlMap } from '../../services/storageService';

/**
 * Signed evidence-photo URLs for the inventory screen's PRINTED sheet, keyed by
 * pallet id.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS LOADED ON DEMAND AND NOT ON MOUNT
 *
 * Signing costs one network round-trip per object, and the inventory screen is
 * the first thing an admin opens every morning. Paying for every damage photo in
 * the fleet on every visit, to fill an appendix that only exists on paper, would
 * be the screen's slowest request and would be wasted every time nobody prints.
 *
 * So `load()` is called by the print handler, which awaits it before it mounts
 * the report. The cost lands on the action that needs it.
 *
 * The consequence, stated plainly: a bare Ctrl+P produces no report at all --
 * it reaches no JavaScript, so there is nothing to await and nothing to mount.
 * That is not a regression from this hook; it is true of all three reports.
 * ---------------------------------------------------------------------------
 */
export const useInventoryEvidence = () => {
    const [evidenceUrls, setEvidenceUrls] = useState<Record<string, string>>({});

    const load = useCallback(async (pallets: Pallet[]) => {
        // Only damage reports carry a photo. Narrowing here rather than fetching
        // everything and filtering in memory is what keeps this to one small
        // query on a table that holds every movement the fleet has ever made.
        const transactions = await fetchTransactions({ actions: ['report_damage'], order: 'desc' });

        const wanted = new Set(pallets.map((p) => p.pallet_id));

        // Newest first from the query, so the first row seen for a pallet is its
        // most recent damage report -- the photo that explains the state the row
        // is in now, not the one from two repairs ago.
        const latestByPallet: Record<string, string> = {};
        for (const tx of transactions) {
            if (!wanted.has(tx.pallet_id)) continue;
            if (latestByPallet[tx.pallet_id]) continue;
            if (!tx.evidence_image_url) continue;
            latestByPallet[tx.pallet_id] = tx.evidence_image_url;
        }

        // getEvidenceSignedUrlMap drops `image_deleted` and empties before it
        // signs, and dedupes, so this is one request per surviving photo.
        const signed = await getEvidenceSignedUrlMap(Object.values(latestByPallet));

        const byPallet: Record<string, string> = {};
        for (const [palletId, stored] of Object.entries(latestByPallet)) {
            const url = signed[stored];
            if (url) byPallet[palletId] = url;
        }

        setEvidenceUrls(byPallet);
    }, []);

    return { evidenceUrls, loadEvidence: load };
};
