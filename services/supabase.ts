import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';

// Initialize Supabase client
// NOTE: If keys are missing, the app will use mock logic in the services layer.
// Initialize Supabase client
// If keys are missing, we pass empty strings which might cause runtime errors if used,
// so services should check for valid configuration or fallback to mock.
export const supabase = createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_ANON_KEY || 'placeholder', {
    auth: {
        // localStorage, not sessionStorage. With sessionStorage the session died
        // on every tab close, which is why LoginPage used to persist the user's
        // raw password so it could silently re-authenticate. Keeping the session
        // here is what makes "remember me" possible without storing a credential.
        storage: localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    }
});
