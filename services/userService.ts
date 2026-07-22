import { supabase } from './supabase';
import { User } from '../types';
import { AppError } from './appError';

// --- USER MANAGEMENT ---

export const fetchUsers = async (): Promise<User[]> => {
    // get_users_with_auth() is admin-gated in the database. There is deliberately
    // no fallback to `from('users').select('*')` here: the old fallback ran on
    // every RPC failure including "Access denied", so a non-admin who was refused
    // by the RPC simply got the full user list by the other route. That defeated
    // the gate entirely. Let the error surface instead.
    const { data, error } = await supabase.rpc('get_users_with_auth');

    if (error) throw error;

    return data || [];
};

export const updateUser = async (id: string, updates: Partial<User>): Promise<boolean> => {
    const { data, error } = await supabase.from('users').update(updates).eq('id', id).select();

    if (error) throw error;
    if (!data || data.length === 0) {
        throw new AppError('update_denied');
    }
    return true;
};
