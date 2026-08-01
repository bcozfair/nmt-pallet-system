import { supabase } from './supabase';
import { Pallet } from '../types';
import { AppError } from './appError';

// --- PALLET OPERATIONS ---

export const fetchPallets = async (): Promise<Pallet[]> => {
    const { data, error } = await supabase.from('pallets').select('*');
    if (error) throw error;
    return data || [];
};

export const getPalletById = async (palletId: string): Promise<Pallet | null> => {
    const { data, error } = await supabase.from('pallets').select('*').eq('pallet_id', palletId).maybeSingle();
    if (error) throw error;
    return data;
};

export const subscribeToPallets = (onUpdate: () => void) => {
    return supabase
        .channel('public:pallets')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'pallets' },
            (payload) => {
                // console.log('Realtime update received:', payload);
                onUpdate();
            }
        )
        .subscribe((status) => {
            // console.log(`[Realtime] Subscription status: ${status}`);
            if (status === 'SUBSCRIBED') {
                // console.log('Realtime connection established: public:pallets');
            }
        });
};

// Postgres reports a unique violation as 23505 and names the offending value in
// `details`, e.g. `Key (pallet_id)=(P024) already exists.` Pulling the id back
// out is what lets the message say WHICH one clashed -- with a batch of twenty
// that is the difference between a usable error and "something already exists".
const DUPLICATE_KEY_CODE = '23505';
const DUPLICATE_VALUE = /\(pallet_id\)=\(([^)]+)\)/;

/**
 * Turns a raw PostgrestError from an insert into the app's own error type.
 *
 * This wrapping exists here, at the service boundary, because that is where the
 * Postgres error code is still visible and where every other write in this file
 * already does it (see updatePallet). It used to be missing: `createPallet`
 * threw the driver's error object straight through, so AddPalletModal had to
 * test `error.code === '23505'` itself while EditPalletModal -- the same
 * situation, the same message -- got a translated one from updatePallet. Two
 * dialogs saying different things about the same clash, and a twelve-line
 * comment in InventoryModals.tsx explaining the discrepancy instead of fixing it.
 */
const asPalletWriteError = (error: { code?: string; details?: string | null }, ids: string[]) => {
    if (error.code !== DUPLICATE_KEY_CODE) return error;

    // The id from the driver's `details` when it is there, otherwise the first
    // of the batch -- for a single insert those are the same thing anyway.
    const named = error.details ? DUPLICATE_VALUE.exec(error.details)?.[1] : undefined;
    return new AppError('pallet_exists', { palletId: named ?? ids[0] });
};

/**
 * Creates one or more pallets in a single statement.
 *
 * ALL OR NOTHING, and that is the reason for one `insert` with an array rather
 * than a loop. Postgres treats a multi-row INSERT as one statement, so a unique
 * violation on any row rolls the whole thing back on the server -- no partial
 * batch, no compensating deletes to write here, nothing to get wrong if this
 * function is interrupted.
 *
 * It matters because of what a partial batch would mean: two admins adding
 * pallets at the same time both see P024 as next, and the second one to press
 * Create must get nothing at all. Twenty rows where three landed and seventeen
 * did not would leave the sequence in a state neither of them could reason
 * about, and the fix would be to work out which stickers had already been
 * printed.
 */
export const createPallets = async (palletIds: string[], location: string): Promise<void> => {
    if (palletIds.length === 0) return;

    const now = new Date().toISOString();
    const rows: Pallet[] = palletIds.map((palletId) => ({
        pallet_id: palletId,
        status: 'available',
        current_location: location,
        last_checkout_date: null,
        created_at: now
    }));

    const { error } = await supabase.from('pallets').insert(rows);
    if (error) throw asPalletWriteError(error, palletIds);
};

// A one-row batch, not a second insert path. Two insert statements for the same
// table is two places to keep the column list, the defaults and the error
// wrapping in step.
export const createPallet = async (palletId: string, location: string): Promise<void> =>
    createPallets([palletId], location);

export const updatePallet = async (currentId: string, updates: { pallet_id?: string, pallet_remark?: string }) => {
    // 1. If Pallet ID is NOT changing, just update the fields
    if (!updates.pallet_id || updates.pallet_id === currentId) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { pallet_id, ...rest } = updates;

        // If there are no other fields to update, just return
        if (Object.keys(rest).length === 0) return;

        const { error } = await supabase
            .from('pallets')
            .update(rest)
            .eq('pallet_id', currentId);
        if (error) throw error;
        return;
    }

    // 2. ID IS Changing: We need to migrate data because of Foreign Key constraints
    const newId = updates.pallet_id;

    // 2a. Check if new ID already exists (prevent overwrite/duplicates manually before insert throws)
    // efficient check
    const { count, error: checkError } = await supabase
        .from('pallets')
        .select('*', { count: 'exact', head: true })
        .eq('pallet_id', newId);

    if (checkError) throw checkError;
    if (count && count > 0) {
        throw new AppError('pallet_exists', { palletId: newId });
    }

    // 2b. Fetch the existing pallet data
    const { data: existingPallet, error: fetchError } = await supabase
        .from('pallets')
        .select('*')
        .eq('pallet_id', currentId)
        .single();

    if (fetchError || !existingPallet) throw fetchError || new AppError('pallet_not_found', { palletId: currentId });

    // 2c. Create New Pallet (Clone)
    const newPallet = {
        ...existingPallet,
        pallet_id: newId,
        pallet_remark: updates.pallet_remark ?? existingPallet.pallet_remark
    };

    // Remove any internal ID if it exists and is serial (though pallet_id seems to be PK)
    // If 'id' exists distinct from pallet_id, we might have issues. 
    // Types say pallet_id is PK.

    const { error: insertError } = await supabase
        .from('pallets')
        .insert(newPallet);

    if (insertError) throw insertError;

    // 2d. Migrate Transactions
    const { error: txUpdateError } = await supabase
        .from('transactions')
        .update({ pallet_id: newId })
        .eq('pallet_id', currentId);

    if (txUpdateError) {
        // Rollback: delete the new pallet
        await supabase.from('pallets').delete().eq('pallet_id', newId);
        throw txUpdateError;
    }

    // 2e. Delete Old Pallet
    const { error: deleteError } = await supabase
        .from('pallets')
        .delete()
        .eq('pallet_id', currentId);

    if (deleteError) {
        // Non-fatal, but messy.
        console.error("Warning: Failed to delete old pallet after migration", deleteError);
        // throw deleteError; // Maybe don't throw to let the UI update, but it's risky.
    }
};

export const deletePallet = async (palletId: string): Promise<void> => {
    const { error } = await supabase.from('pallets').delete().eq('pallet_id', palletId);
    if (error) throw error;
};