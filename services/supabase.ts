import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';

// Initialize Supabase client
// NOTE: If keys are missing, the app will use mock logic in the services layer.
// Initialize Supabase client
// If keys are missing, we pass empty strings which might cause runtime errors if used,
// so services should check for valid configuration or fallback to mock.
export const supabase = createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_ANON_KEY || 'placeholder', {
    auth: {
        storage: sessionStorage, // Standard: Updates on refresh, clears on close
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    }
});
