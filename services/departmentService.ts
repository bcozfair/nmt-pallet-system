import { supabase } from './supabase';
import { Department } from '../types';

// --- DEPARTMENTS ---

export const fetchDepartments = async (): Promise<Department[]> => {
    const { data, error } = await supabase.from('departments').select('*');
    if (error) throw error;
    return data || [];
};

export const createDepartment = async (name: string): Promise<boolean> => {
    const { error } = await supabase.from('departments').insert({ name, is_active: true });
    if (error) throw error;
    return true;
};

export const updateDepartment = async (id: string, updates: Partial<Department>): Promise<boolean> => {
    const { error } = await supabase.from('departments').update(updates).eq('id', id);
    if (error) throw error;
    return true;
};

export const deleteDepartment = async (id: string): Promise<boolean> => {
    const { error, count } = await supabase.from('departments').delete({ count: 'exact' }).eq('id', id);
    if (error) throw error;
    if (count === 0) {
        throw new Error("Deletion failed: Item not found or permission denied (RLS)");
    }
    return true;
};

export const subscribeToDepartments = (onUpdate: () => void) => {
    return supabase
        .channel('public:departments')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'departments' },
            (payload) => {
                // console.log('Realtime department update:', payload);
                onUpdate();
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                // console.log('Realtime connection established: public:departments');
            }
        });
};
