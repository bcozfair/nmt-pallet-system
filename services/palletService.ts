import { supabase } from './supabase';
import { Pallet } from '../types';

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

export const createPallet = async (palletId: string, location: string): Promise<void> => {
    const newPallet: Pallet = {
        pallet_id: palletId,
        status: 'available',
        current_location: location,
        last_checkout_date: null,
        created_at: new Date().toISOString()
    };

    // Try to insert, if conflict (duplicate ID) throw error
    const { error } = await supabase.from('pallets').insert(newPallet);
    if (error) throw error;
};

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
        throw new Error(`Pallet ID ${newId} already exists`);
    }

    // 2b. Fetch the existing pallet data
    const { data: existingPallet, error: fetchError } = await supabase
        .from('pallets')
        .select('*')
        .eq('pallet_id', currentId)
        .single();

    if (fetchError || !existingPallet) throw fetchError || new Error("Pallet not found");

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