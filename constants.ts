import { Department } from './types';

// Supabase Configuration
// Ideally these are in process.env, but for this generation we use placeholders
// Supabase Configuration
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Admin Email for Alias Login (e.g. admin+staff001@gmail.com)
// DEPRECATED: This is now a fallback only. The source of truth is in 'system_settings' table.
export const ADMIN_EMAIL_BASE = import.meta.env.VITE_ADMIN_EMAIL_BASE || 'bcozfair@gmail.com';
