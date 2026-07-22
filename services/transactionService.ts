import { supabase } from './supabase';
import { Pallet, Transaction } from '../types';
import { fetchPallets } from './palletService';
import { DAMAGE_BUCKET, IMAGE_DELETED, extractObjectName } from './storageService';
import { AppError } from './appError';

// --- TRANSACTIONS (Check In/Out/Damage) ---

export const fetchPalletHistory = async (palletId: string): Promise<Transaction[]> => {
    let query = supabase.from('transactions').select('*').order('timestamp', { ascending: false });
    if (palletId) {
        query = query.eq('pallet_id', palletId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
};

// New function to fetch all transactions (alias for readability in dashboards)
export const fetchTransactions = async (): Promise<Transaction[]> => {
    return fetchPalletHistory('');
};

export const fetchUserTransactions = async (userId: string, dateStr?: string): Promise<Transaction[]> => {
    let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

    // Filter by specific day if provided (YYYY-MM-DD)
    if (dateStr) {
        // Interpret dateStr as LOCAL day.
        try {
            // Construct YYYY-MM-DDT00:00:00 vs 23:59:59 in LOCAL TIME, then ISO for DB comparison
            // Note: dateStr input is expected to be 'YYYY-MM-DD'
            const startLocal = new Date(`${dateStr}T00:00:00`);
            const endLocal = new Date(`${dateStr}T23:59:59.999`);

            // If dateStr is invalid, these are Invalid Date
            if (!isNaN(startLocal.getTime())) {
                query = query.gte('timestamp', startLocal.toISOString()).lte('timestamp', endLocal.toISOString());
            }
        } catch (e) {
            console.warn("Invalid date filter", dateStr);
        }
        query = query.limit(500); // Higher limit for daily view
    } else {
        query = query.limit(50); // Default limit for "recent"
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
};

export const fetchUserTransactionDates = async (userId: string): Promise<string[]> => {
    // We fetch timestamps to find unique days. 
    // Limit to 2000 to avoid performance hit, enough for ~20 days @ 100/day
    const { data, error } = await supabase
        .from('transactions')
        .select('timestamp')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(2000);

    if (error) throw error;

    if (!data) return [];

    // Extract unique dates (YYYY-MM-DD) in LOCAL TIME
    const uniqueDates = new Set<string>();

    // Helper to format YYYY-MM-DD in local time consistently
    const toLocalDateStr = (isoStr: string) => {
        try {
            const d = new Date(isoStr);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch { return ''; }
    };

    data.forEach(item => {
        if (item.timestamp) {
            const localDate = toLocalDateStr(item.timestamp);
            if (localDate) uniqueDates.add(localDate);
        }
    });

    return Array.from(uniqueDates);
};

export const fetchDamagedWithEvidence = async (): Promise<(Pallet & { evidence_url: string | null })[]> => {
    const pallets = await fetchPallets();
    const damaged = pallets.filter(p => p.status === 'damaged');

    const enriched = await Promise.all(damaged.map(async (p) => {
        let evidence = null;
        // Find the most recent damage report transaction for this pallet
        const { data } = await supabase.from('transactions')
            .select('evidence_image_url')
            .eq('pallet_id', p.pallet_id)
            .eq('action_type', 'report_damage')
            .order('timestamp', { ascending: false })
            .limit(1)
            .maybeSingle(); // Use maybeSingle to avoid 406 if no rows
        evidence = data?.evidence_image_url;
        return { ...p, evidence_url: evidence };
    }));

    return enriched;
};

/**
 * Returns a damaged pallet to stock.
 *
 * The old 'discard' branch is gone. It called deletePallet(), and
 * transactions.pallet_id is ON DELETE CASCADE, so "discarding" a pallet erased
 * every trace it had ever existed -- and it skipped the storage cleanup below,
 * leaving the evidence image orphaned in the bucket forever. Retiring a pallet
 * now goes through scrapPallet(), which keeps both. Nothing ever called the
 * discard branch anyway; no screen was wired to it.
 */
export const resolveDamage = async (palletId: string, userId?: string): Promise<boolean> => {
    const timestamp = new Date().toISOString();

    // The pallet row is updated FIRST, before any destructive cleanup. The old
    // order deleted the evidence image first, so a failure on this update left
    // the photo permanently gone while the pallet was still 'damaged' -- an
    // unrecoverable state, since the evidence for the next attempt no longer
    // existed. current_location is reset alongside status because the repair
    // transaction below is logged with department_dest 'Warehouse'; leaving the
    // pallet at its old location made the row and its own log disagree.
    const { error } = await supabase.from('pallets').update({
        status: 'available',
        current_location: 'Warehouse',
        last_checkout_date: null,
        last_transaction_date: timestamp
    }).eq('pallet_id', palletId);
    if (error) throw error;

    // Now the cleanup. Find the latest damage report to remove its image: the
    // pallet is repaired, so the photo has no further purpose and the bucket
    // should not accumulate it. Everything here is best-effort -- the repair
    // itself has already been committed above.
    const { data: transData } = await supabase.from('transactions')
        .select('id, evidence_image_url')
        .eq('pallet_id', palletId)
        .eq('action_type', 'report_damage')
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (transData && transData.evidence_image_url && transData.evidence_image_url !== IMAGE_DELETED) {
        try {
            // Handles both shapes: legacy rows hold a full public URL, new rows
            // hold the bare object name.
            const fileName = extractObjectName(transData.evidence_image_url);

            if (fileName) {
                // Delete from Storage
                const { error: storageError } = await supabase.storage.from(DAMAGE_BUCKET).remove([fileName]);
                if (storageError) {
                    console.error("[resolveDamage] Storage delete failed:", storageError);
                } else {
                    console.log("[resolveDamage] Storage delete success");
                }

                // Update Transaction Record
                const { error: updateError } = await supabase.from('transactions')
                    .update({ evidence_image_url: IMAGE_DELETED })
                    .eq('id', transData.id);

                if (updateError) {
                    console.error("[resolveDamage] Transaction update failed:", updateError);
                }
            }
        } catch (e) {
            console.error("Failed to cleanup image", e);
            // Non-blocking, the pallet is already repaired.
        }
    }

    // Log "Repaired" Transaction
    if (userId) {
        const { error: transError } = await supabase.from('transactions').insert({
            pallet_id: palletId,
            user_id: userId,
            action_type: 'repair',
            transaction_remark: 'Pallet repaired (returned to stock)',
            department_dest: 'Warehouse', // Usually returned to stock
            timestamp
        });
        if (transError) console.error("Failed to log repair transaction", transError);
    }

    return true;
};

/**
 * Retires a pallet permanently, keeping its history.
 *
 * This is the replacement for deleting a pallet that cannot be repaired.
 * Deleting cascades the transaction rows away; this keeps every one of them and
 * adds a 'scrap' row of its own, so the audit trail still shows the pallet
 * existed, what happened to it, and who decided.
 *
 * Only reachable from 'damaged', so a scrapped pallet always has a damage
 * report -- with a photo -- explaining why. That evidence is deliberately NOT
 * cleaned up the way resolveDamage() cleans it up: for a repair the photo is
 * spent, but for a scrap it is the justification for writing the asset off.
 *
 * 'scrapped' is terminal. Nothing sets a pallet back out of it; an accidental
 * scrap is corrected by creating a new pallet.
 */
export const scrapPallet = async (palletId: string, userId?: string, reason?: string): Promise<boolean> => {
    const timestamp = new Date().toISOString();

    // Unlike the repair path, which logs best-effort, no caller may scrap
    // anonymously. Skipping the insert when userId is missing would retire the
    // pallet with nothing in the audit trail saying who did it or why -- which
    // is the exact failure this whole status was introduced to prevent. Checked
    // before the pallet row is touched so the refusal leaves no partial state.
    if (!userId) {
        throw new AppError('scrap_requires_user');
    }

    // Guard on the server's copy of the state, not on whatever the list in the
    // browser last rendered. Reaching 'scrapped' from anywhere but 'damaged'
    // would skip the damage report that is supposed to justify it.
    const { data: pallet, error: readError } = await supabase
        .from('pallets')
        .select('status')
        .eq('pallet_id', palletId)
        .maybeSingle();

    if (readError) throw readError;
    if (!pallet) throw new AppError('pallet_not_found', { palletId });
    if (pallet.status === 'scrapped') {
        throw new AppError('pallet_already_scrapped', { palletId });
    }
    if (pallet.status !== 'damaged') {
        // The status is passed through so the message can name it. It is a raw
        // enum here; describeAppError() is where it would be humanised if the
        // wording ever needs it.
        throw new AppError('pallet_not_damaged', { palletId, status: pallet.status });
    }

    const { error: palletError } = await supabase.from('pallets').update({
        status: 'scrapped',
        last_checkout_date: null,
        last_transaction_date: timestamp
    }).eq('pallet_id', palletId);
    if (palletError) throw palletError;

    // This row is the audit record, so unlike the repair log above its failure
    // is fatal rather than logged and swallowed.
    const { error: transError } = await supabase.from('transactions').insert({
        pallet_id: palletId,
        user_id: userId,
        action_type: 'scrap',
        transaction_remark: reason?.trim() || 'Pallet scrapped (written off, beyond repair)',
        department_dest: null,
        timestamp
    });
    if (transError) throw transError;

    return true;
};

export const checkOutPallet = async (palletId: string, destinationId: string, destinationName: string, userId: string): Promise<boolean> => {
    const timestamp = new Date().toISOString();

    // UPDATE, not upsert. The previous upsert meant scanning any unrecognised QR
    // code silently created a pallet record, so the inventory could be polluted
    // by anything that happened to be a valid QR. Pallet INSERT is now
    // admin-only at the database level too
    // (supabase/migrations/20260719_02_enable_rls.sql), so an upsert here would
    // fail the policy check on its insert path regardless.
    //
    // The caller already verified existence: handleScan() rejects unknown ids
    // via getPalletById() before an item can reach the pending list.
    const { data: updated, error: palletError } = await supabase
        .from('pallets')
        .update({
            status: 'in_use',
            current_location: destinationName,
            last_checkout_date: timestamp,
            last_transaction_date: timestamp,
        })
        .eq('pallet_id', palletId)
        .select('pallet_id');

    if (palletError) throw palletError;
    if (!updated || updated.length === 0) {
        throw new AppError('pallet_missing_for_checkout', { palletId });
    }

    const { error: transError } = await supabase.from('transactions').insert({
        pallet_id: palletId,
        user_id: userId,
        action_type: 'check_out',
        department_dest: destinationName,
        timestamp
    });

    if (transError) throw transError;
    return true;
};

export const checkInPallet = async (palletId: string, userId: string): Promise<boolean> => {
    const timestamp = new Date().toISOString();

    // Update Status
    const { error: palletError } = await supabase.from('pallets').update({
        status: 'available',
        current_location: 'Warehouse',
        last_checkout_date: null,
        last_transaction_date: timestamp
    }).eq('pallet_id', palletId);

    if (palletError) throw palletError;

    // Log Transaction
    const { error: transError } = await supabase.from('transactions').insert({
        pallet_id: palletId,
        user_id: userId,
        action_type: 'check_in',
        department_dest: 'Warehouse',
        timestamp
    });
    if (transError) throw transError;
    return true;
};

export const reportDamage = async (palletId: string, userId: string, imageFile: File | null): Promise<boolean> => {
    const timestamp = new Date().toISOString();
    let imageUrl: string | null = null;

    // Storage Logic
    if (imageFile) {
        const fileName = `${palletId}_${Date.now()}.jpg`;
        try {
            const { data, error } = await supabase.storage.from(DAMAGE_BUCKET).upload(fileName, imageFile);
            if (error) {
                console.error("Upload error details:", error);
                throw new AppError('image_upload_failed', { reason: error.message });
            } else if (data) {
                // Store the object NAME, not a public URL. The bucket is private
                // now, so a public URL would not resolve; readers mint a
                // short-lived signed URL via getEvidenceSignedUrl() instead.
                imageUrl = fileName;
            }
        } catch (e: any) {
            console.error("Storage upload exception", e);
            throw new AppError('image_upload_failed', { reason: e?.message || String(e) });
        }
    }

    const { error: palletError } = await supabase.from('pallets').update({
        status: 'damaged',
        last_transaction_date: timestamp
    }).eq('pallet_id', palletId);
    if (palletError) throw palletError;

    const { error: transError } = await supabase.from('transactions').insert({
        pallet_id: palletId,
        user_id: userId,
        action_type: 'report_damage',
        department_dest: null,
        evidence_image_url: imageUrl,
        timestamp
    });

    if (transError) throw transError;
    if (transError) throw transError;
    return true;
};

export const createBulkTransaction = async (
    palletIds: string[],
    actionType: 'check_out' | 'check_in',
    userId: string,
    departmentDest?: string,
    remark?: string,
    manualTimestamp?: string
): Promise<{ success: string[], failed: string[] }> => {
    const timestamp = manualTimestamp || new Date().toISOString();
    const success: string[] = [];
    const failed: string[] = [];

    // Process sequentially to be safe, or Promise.all if we trust DB concurrency
    // Given Supabase, Promise.all is usually fine but let's do safe iteration for better error tracking per item
    for (const id of palletIds) {
        try {
            if (actionType === 'check_out') {
                if (!departmentDest) throw new AppError('destination_required');

                // Update Pallet
                const { error: palletError } = await supabase.from('pallets').update({
                    status: 'in_use',
                    current_location: departmentDest,
                    last_checkout_date: timestamp,
                    last_transaction_date: timestamp
                }).eq('pallet_id', id);

                if (palletError) throw palletError;

                // Log Transaction
                const { error: transError } = await supabase.from('transactions').insert({
                    pallet_id: id,
                    user_id: userId,
                    action_type: 'check_out',
                    department_dest: departmentDest,
                    transaction_remark: remark,
                    timestamp
                });
                if (transError) throw transError;

            } else if (actionType === 'check_in') {
                // Update Pallet
                const { error: palletError } = await supabase.from('pallets').update({
                    status: 'available',
                    current_location: 'Warehouse',
                    last_checkout_date: null,
                    last_transaction_date: timestamp
                }).eq('pallet_id', id);

                if (palletError) throw palletError;

                // Log Transaction
                const { error: transError } = await supabase.from('transactions').insert({
                    pallet_id: id,
                    user_id: userId,
                    action_type: 'check_in',
                    department_dest: 'Warehouse',
                    transaction_remark: remark,
                    timestamp
                });
                if (transError) throw transError;
            }

            success.push(id);
        } catch (e) {
            console.error(`Failed to process ${id}`, e);
            failed.push(id);
        }
    }

    return { success, failed };
};

export const cleanupOldData = async (yearsToKeep: number = 2): Promise<number> => {
    const today = new Date();
    const cutoffDate = new Date(today.setFullYear(today.getFullYear() - yearsToKeep));
    const cutoffIso = cutoffDate.toISOString();

    const { error, count } = await supabase
        .from('transactions')
        .delete({ count: 'exact' })
        .lt('timestamp', cutoffIso);

    if (error) throw error;
    return count || 0;
};

// --- EDITING & DELETING ---

export const updateTransaction = async (
    transactionId: string,
    palletId: string,
    updates: { department_dest?: string, transaction_remark?: string }
): Promise<boolean> => {

    // 1. Update the Transaction
    const { error: txError } = await supabase.from('transactions')
        .update(updates)
        .eq('id', transactionId);

    if (txError) throw txError;

    // 2. Sync Logic: Is this the LATEST transaction for this pallet?
    // If we changed location, we might need to update the Pallet's current_location
    if (updates.department_dest) {
        const { data: latestTx } = await supabase.from('transactions')
            .select('id')
            .eq('pallet_id', palletId)
            .order('timestamp', { ascending: false })
            .limit(1)
            .single();

        // If the edited transaction IS the latest one
        if (latestTx && latestTx.id === transactionId) {
            console.log("Syncing pallet location to edited transaction...");
            const { error: palletError } = await supabase.from('pallets')
                .update({ current_location: updates.department_dest })
                .eq('pallet_id', palletId);

            if (palletError) console.error("Failed to sync pallet location", palletError);
        }
    }

    return true;
};

export const deleteTransaction = async (transactionId: string): Promise<boolean> => {
    // We strictly delete the record. We DO NOT automatically revert pallet state because it's ambiguous.
    // The admin can manually fix the pallet status/location if needed.
    const { error } = await supabase.from('transactions')
        .delete()
        .eq('id', transactionId);

    if (error) throw error;
    return true;
};
