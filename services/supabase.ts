import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, AUTH_STORAGE_KEY } from '../constants';
import { sessionStore } from './sessionPolicy';

// Initialize Supabase client
// NOTE: If keys are missing, the app will use mock logic in the services layer.
// Initialize Supabase client
// If keys are missing, we pass empty strings which might cause runtime errors if used,
// so services should check for valid configuration or fallback to mock.
export const supabase = createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_ANON_KEY || 'placeholder', {
    auth: {
        // Always sessionStorage, so a session cannot outlive the browser. See
        // sessionPolicy.ts, which owns that decision.
        //
        // A middle version of this app worked around the resulting re-logins by
        // persisting the user's raw password so it could silently
        // re-authenticate. Never do that. Signing in again is the browser
        // password manager's problem to make painless -- that is why the fields
        // in components/auth/AuthField.tsx carry real autocomplete tokens.
        storage: sessionStore,
        // Named explicitly so sessionPolicy.ts can clear the session out of both
        // storages by key. Without this, the key includes the project ref and
        // cannot be derived reliably.
        storageKey: AUTH_STORAGE_KEY,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    }
});
