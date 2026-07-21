import { Department } from './types';

// Supabase Configuration
// Ideally these are in process.env, but for this generation we use placeholders
// Supabase Configuration
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Admin Email for Alias Login (e.g. admin+staff001@gmail.com)
// DEPRECATED: This is now a fallback only. The source of truth is in 'system_settings' table.
export const ADMIN_EMAIL_BASE = import.meta.env.VITE_ADMIN_EMAIL_BASE || 'bcozfair@gmail.com';

// --- Session policy ---
// Supabase can enforce both of these server-side, but time-boxing and inactivity
// timeouts are Pro-plan features, so services/sessionPolicy.ts enforces them on
// the client instead. See the note at the bottom of that file.
export const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000; // hard cap, counted from sign-in
export const SESSION_IDLE_MS = 30 * 60 * 1000;         // signed out after this much inactivity

// Storage keys that belong to a signed-in session and must die with it. They are
// named here so sessionPolicy.ts can clear every one of them in a single place.
export const AUTH_STORAGE_KEY = 'nmt_auth';                        // Supabase session
export const PROFILE_CACHE_KEY = 'nmt_user_profile';               // cached role/profile
export const PENDING_SCANS_KEY = 'nmt_mobile_pending_scans';       // unsubmitted scans
