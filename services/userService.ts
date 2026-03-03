import { supabase } from './supabase';
import { User } from '../types';

// --- USER MANAGEMENT ---

export const fetchUsers = async (): Promise<User[]> => {
    // Use the RPC function to get users with auth data (created_at, last_sign_in_at)
    const { data, error } = await supabase.rpc('get_users_with_auth');

    if (error) {
        console.error('Error fetching users with auth data:', error);
        // Fallback to regular fetch if RPC fails (e.g. before migration is run)
        const { data: fallbackData, error: fallbackError } = await supabase.from('users').select('*');
        if (fallbackError) throw fallbackError;
        return fallbackData || [];
    }

    return data || [];
};

export const updateUser = async (id: string, updates: Partial<User>): Promise<boolean> => {
    const { data, error } = await supabase.from('users').update(updates).eq('id', id).select();

    if (error) throw error;
    if (!data || data.length === 0) {
        throw new Error("Update failed: User not found or permission denied (RLS)");
    }
    return true;
};
