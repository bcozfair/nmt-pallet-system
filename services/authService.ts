import { supabase } from './supabase';
import { createClient } from '@supabase/supabase-js';
import { User } from '../types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';
import { fetchSystemSetting } from './settingsService';
import { AppError } from './appError';

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

// Admin-only since 20260719_03. This used to be callable anonymously to
// populate a dropdown on the forgot-password screen, which handed every
// admin's employee_id and full_name to unauthenticated visitors -- and since
// login emails are deterministically {base}+{employee_id}@{domain}, that was
// enough to derive their exact login identity. The forgot-password flow no
// longer needs it; see components/LoginPage.tsx.
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

// NOTE: not referenced by any screen -- there is no public sign-up page. Kept
// only as a scripting helper. Disable email sign-ups in the Supabase dashboard
// (Authentication > Providers > Email) so the anon key cannot create accounts
// at all; account creation should go through createAccountByAdmin() below.
export const registerStaff = async (employeeId: string, fullName: string, password: string) => {
  const email = await constructAliasEmail(employeeId);

  // Metadata feeds the handle_new_user trigger. `role` is not passed and would
  // be ignored if it were -- the trigger hardcodes 'staff'.
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        employee_id: employeeId,
        full_name: fullName,
        department: 'Warehouse'
      }
    }
  });

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
        department: department
        // `role` is deliberately NOT passed. The handle_new_user trigger no
        // longer reads it from signup metadata -- that metadata is attacker
        // controlled, so anyone with the anon key could have signed themselves
        // up as an admin. Every new account is created as 'staff'.
      }
    }
  });

  if (error) throw error;

  // Promotion is a separate, authorized step. admin_set_role() checks that the
  // *caller* (the current admin's session, not the temp client) is an admin.
  if (role === 'admin' && data.user) {
    const { error: roleError } = await supabase.rpc('admin_set_role', {
      target_user_id: data.user.id,
      new_role: 'admin'
    });

    // The account exists at this point; only the promotion failed. Surface it
    // rather than leaving the admin believing they created an administrator.
    if (roleError) {
      throw new AppError('admin_promotion_failed', { reason: roleError.message });
    }
  }

  return data;
};

// Promote or demote an existing user. Admin-gated in the database.
export const adminSetUserRole = async (targetUserId: string, newRole: 'staff' | 'admin') => {
  const { error } = await supabase.rpc('admin_set_role', {
    target_user_id: targetUserId,
    new_role: newRole
  });

  if (error) throw error;
  return true;
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