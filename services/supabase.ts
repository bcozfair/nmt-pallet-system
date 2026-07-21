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
        // The storage is chosen per sign-in by the "Remember me" checkbox:
        // localStorage when ticked, sessionStorage when not. See sessionPolicy.ts.
        //
        // An earlier version hardcoded sessionStorage, so sessions died on every
        // tab close; the workaround at the time was to persist the user's raw
        // password so the app could silently re-authenticate. Never do that. If a
        // session ends, the user types their password again -- that is the whole
        // point of the setting.
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
