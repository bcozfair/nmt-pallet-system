import { supabase } from './supabase';

export const DAMAGE_BUCKET = 'damage_reports';

// Sentinel written by resolveDamage() once the underlying object has been
// removed but the transaction row is kept for the audit trail.
export const IMAGE_DELETED = 'image_deleted';

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

/**
 * Derives the storage object name from whatever is stored in
 * transactions.evidence_image_url.
 *
 * Rows written before the bucket was made private hold a full public URL:
 *   https://<project>.supabase.co/storage/v1/object/public/damage_reports/<file>
 * Rows written after hold the bare object name. Both are accepted so no data
 * migration is needed.
 */
export const extractObjectName = (stored: string | null | undefined): string | null => {
    if (!stored || stored === IMAGE_DELETED) return null;

    // Bare object name (no path separators) -- use as-is.
    if (!stored.includes('/')) return decodeURIComponent(stored.split('?')[0]);

    let name = stored.split('/').pop() || '';
    name = name.split('?')[0];          // drop any query string (?token=...)
    if (!name) return null;

    try {
        return decodeURIComponent(name);
    } catch {
        return name;                    // malformed escape sequence -- take it raw
    }
};

/**
 * Mints a short-lived signed URL for a damage-evidence image.
 *
 * The bucket is private (supabase/migrations/20260719_04_storage.sql), so
 * getPublicUrl() no longer resolves. Returns null when there is nothing to
 * show, so callers can render their "no evidence" state.
 */
export const getEvidenceSignedUrl = async (stored: string | null | undefined): Promise<string | null> => {
    const objectName = extractObjectName(stored);
    if (!objectName) return null;

    const { data, error } = await supabase
        .storage
        .from(DAMAGE_BUCKET)
        .createSignedUrl(objectName, SIGNED_URL_TTL_SECONDS);

    if (error) {
        console.error('[storage] Failed to sign evidence URL', objectName, error);
        return null;
    }

    return data?.signedUrl ?? null;
};

/**
 * Batch variant. Signing is one network round-trip per object, so views that
 * render many rows (TransactionTable, PalletDetailModal) should sign once for
 * the whole page rather than per-cell.
 *
 * Returns a map keyed by the ORIGINAL stored value, so callers can look up
 * using the field they already hold.
 */
export const getEvidenceSignedUrlMap = async (
    storedValues: (string | null | undefined)[]
): Promise<Record<string, string>> => {
    const unique = Array.from(
        new Set(storedValues.filter((v): v is string => !!v && v !== IMAGE_DELETED))
    );

    const entries = await Promise.all(
        unique.map(async (stored) => {
            const url = await getEvidenceSignedUrl(stored);
            return url ? ([stored, url] as const) : null;
        })
    );

    return entries.reduce<Record<string, string>>((acc, entry) => {
        if (entry) acc[entry[0]] = entry[1];
        return acc;
    }, {});
};
