import { supabase } from './supabase';
import { Pallet, Transaction } from '../types';
import { fetchPallets, deletePallet } from './palletService';

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

export const resolveDamage = async (palletId: string, action: 'repair' | 'discard', userId?: string): Promise<boolean> => {
    if (action === 'discard') {
        await deletePallet(palletId);
        return true;
    }
    // If repair, set status to available
    // 1. Find the latest damage report transaction to clean up image
    const { data: transData } = await supabase.from('transactions')
        .select('id, evidence_image_url')
        .eq('pallet_id', palletId)
        .eq('action_type', 'report_damage')
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (transData && transData.evidence_image_url && transData.evidence_image_url !== 'image_deleted') {
        try {
            // Extract filename from URL
            // URL format: .../storage/v1/object/public/damage_reports/filename.jpg
            const urlParts = transData.evidence_image_url.split('/');
            let fileName = urlParts[urlParts.length - 1];

            // 2. Remove any query parameters (e.g. ?token=...)
            if (fileName.includes('?')) {
                fileName = fileName.split('?')[0];
            }

            // 3. Decode URI component (spaces, special chars)
            fileName = decodeURIComponent(fileName);

            console.log(`[resolveDamage] Extracted filename: ${fileName}`);

            if (fileName) {
                // Delete from Storage
                const { error: storageError } = await supabase.storage.from('damage_reports').remove([fileName]);
                if (storageError) {
                    console.error("[resolveDamage] Storage delete failed:", storageError);
                } else {
                    console.log("[resolveDamage] Storage delete success");
                }

                // Update Transaction Record
                const { error: updateError } = await supabase.from('transactions')
                    .update({ evidence_image_url: 'image_deleted' })
                    .eq('id', transData.id);

                if (updateError) {
                    console.error("[resolveDamage] Transaction update failed:", updateError);
                }
            }
        } catch (e) {
            console.error("Failed to cleanup image", e);
            // Non-blocking, continue to resolve pallet
        }
    }

    const { error } = await supabase.from('pallets').update({
        status: 'available',
        last_checkout_date: null,
        last_transaction_date: new Date().toISOString()
    }).eq('pallet_id', palletId);
    if (error) throw error;

    // Log "Repaired" Transaction
    if (userId) {
        const { error: transError } = await supabase.from('transactions').insert({
            pallet_id: palletId,
            user_id: userId,
            action_type: 'repair',
            transaction_remark: 'Pallet repaired (returned to stock)',
            department_dest: 'Warehouse', // Usually returned to stock
            timestamp: new Date().toISOString()
        });
        if (transError) console.error("Failed to log repair transaction", transError);
    }

    return true;
};

export const checkOutPallet = async (palletId: string, destinationId: string, destinationName: string, userId: string): Promise<boolean> => {
    const timestamp = new Date().toISOString();

    // Real DB Impl
    // 1. Verify pallet exists or Upsert (Assume user scanned a valid QR code, if it doesn't exist, we create it?)
    // For safety in this specific workflow, we will UPSERT the pallet presence.
    const { error: palletError } = await supabase.from('pallets').upsert({
        pallet_id: palletId,
        status: 'in_use',
        current_location: destinationName,
        last_checkout_date: timestamp,
        last_transaction_date: timestamp,
        // If it's a new pallet, created_at will be auto-set by DB default, but upsert needs to be careful not to overwrite valid data if not needed.
        // However, upsert here is convenient for "Scanned something new".
    }, { onConflict: 'pallet_id' }); // Update existing if ID matches

    if (palletError) throw palletError;

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
            const { data, error } = await supabase.storage.from('damage_reports').upload(fileName, imageFile);
            if (error) {
                console.error("Upload error details:", error);
                throw new Error(`Image Upload Failed: ${error.message}`);
            } else if (data) {
                const { data: publicUrlData } = supabase.storage.from('damage_reports').getPublicUrl(fileName);
                imageUrl = publicUrlData.publicUrl;
            }
        } catch (e: any) {
            console.error("Storage upload exception", e);
            throw new Error(`Upload logic failed: ${e.message || e}`);
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
                if (!departmentDest) throw new Error("Destination required for check_out");

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
