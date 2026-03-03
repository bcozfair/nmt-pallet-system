import { supabase } from './supabase';
import { createClient } from '@supabase/supabase-js';
import { User } from '../types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';
import { fetchSystemSetting } from './settingsService';

// Helper to generate Alias Email

// NOW ASYNC because it fetches from DB
export const constructAliasEmail = async (employeeId: string) => {
  // Try to fetch from DB, fallback to hardcoded string to prevent crash
  // In a real app, maybe cache this in a React Context or Session Storage to avoid 
  // fetching on every click, but for Login it's fine.
  let adminBase = await fetchSystemSetting('admin_email_base');

  if (!adminBase) {
    // Fallback if DB fetch fails or table not set up yet
    adminBase = 'bcozfair@gmail.com';
  }

  const [user, domain] = adminBase.split('@');
  return `${user}+${employeeId}@${domain}`;
};


// --- WRAPPERS ---

export const getSession = async () => {
  try {
    return await supabase.auth.getSession();
  } catch (e) {
    console.warn("Supabase connection warning", e);
    return { data: { session: null }, error: null };
  }
};

export const getActiveAdmins = async () => {
  const { data, error } = await supabase.rpc('get_active_admins');
  if (error) throw error;
  return data as { employee_id: string; full_name: string }[];
};

export const updateUserPassword = async (newPassword: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) throw error;
  return data;
};

type AuthListener = (event: string, session: any) => void;

export const onAuthStateChange = (callback: AuthListener) => {
  return supabase.auth.onAuthStateChange(callback);
};

// --- ACTIONS ---

export const signIn = async (identifier: string, password: string) => {
  let email = identifier;
  if (!identifier.includes('@')) {
    // If just Employee ID is entered, convert to Alias Email
    email = await constructAliasEmail(identifier);
  }


  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

export const registerStaff = async (employeeId: string, fullName: string, password: string) => {
  const email = await constructAliasEmail(employeeId);


  // Pass metadata to allow DB Trigger to create the public.users row
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        employee_id: employeeId,
        full_name: fullName,
        role: 'staff',
        department: 'Warehouse'
      }
    }
  });

  if (authError) throw authError;

  if (authError) throw authError;

  return authData;
};

// Admin creates account for another user without losing their own session
export const createAccountByAdmin = async (employeeId: string, fullName: string, department: string, password: string, role: 'staff' | 'admin' = 'staff') => {
  const email = await constructAliasEmail(employeeId);


  // Use a temporary client to avoid overwriting the current session in localStorage
  const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false, // Do not persist this session
      detectSessionInUrl: false,
      storageKey: 'nmt_temp_admin_creation' // Unique key to silence "Multiple GoTrueClient" warning
    }
  });

  const { data, error } = await tempClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        employee_id: employeeId,
        full_name: fullName,
        role: role,
        department: department
      }
    }
  });

  if (error) throw error;
  return data;
};

// Admin resets password for another user via RPC
export const adminResetUserPassword = async (targetUserId: string, newPassword: string) => {
  const { error } = await supabase.rpc('admin_reset_password', {
    target_user_id: targetUserId,
    new_password: newPassword
  });

  if (error) throw error;
  return true;
};

export const adminDeleteUser = async (targetUserId: string) => {
  const { error } = await supabase.rpc('delete_user_complete', {
    target_user_id: targetUserId
  });

  if (error) throw error;
  return true;
};

export const resetPassword = async (identifier: string) => {
  let email = identifier.includes('@') ? identifier : await constructAliasEmail(identifier);


  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });

  if (error) throw error;
  return true;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUserProfile = async (userId: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      // Silent fail for profile fetch, might be new user without profile row yet
      // console.warn("User profile fetch error", error.message);
    }
    return data as User;
  } catch (e) {
    console.error("Fetch profile failed", e);
    return null;
  }
};