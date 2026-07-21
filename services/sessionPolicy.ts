import {
    AUTH_STORAGE_KEY,
    PENDING_SCANS_KEY,
    PROFILE_CACHE_KEY,
    SESSION_IDLE_MS,
    SESSION_MAX_AGE_MS,
} from '../constants';

// Where the session lives, and when it is allowed to still be valid. Everything
// about session lifetime is decided here so the rest of the app never has to
// touch localStorage/sessionStorage directly.
//
// This module must not import services/supabase.ts -- that file imports this one
// to get its storage adapter.

// Kept in localStorage unconditionally: it has to be readable *before* we know
// which storage the session itself lives in.
const REMEMBER_KEY = 'nmt_remember_session';

const META_KEY = 'nmt_session_meta';

// Everything that must be gone once the session ends. PENDING_SCANS_KEY is in
// here because scans staged by one employee would otherwise be submitted under
// the next employee's id on a shared device.
const SESSION_SCOPED_KEYS = [AUTH_STORAGE_KEY, META_KEY, PROFILE_CACHE_KEY, PENDING_SCANS_KEY];

export type SessionVerdict = 'ok' | 'no_session' | 'expired_max_age' | 'expired_idle';

interface SessionMeta {
    startedAt: number;
    lastActiveAt: number;
}

export const isRemembered = (): boolean => {
    try {
        return localStorage.getItem(REMEMBER_KEY) === '1';
    } catch (e) {
        console.warn('[Session] Storage unavailable, defaulting to per-tab session', e);
        return false;
    }
};

// The storage the current session lives in. Must be resolved on every call: the
// Supabase client is constructed at import time, long before the user ticks
// "Remember me", so this can never be captured in a variable.
export const activeStore = (): Storage => (isRemembered() ? localStorage : sessionStorage);

// Wipes every session-scoped key from BOTH storages. Clearing both matters when
// the user switches modes -- a session left behind in localStorage would survive
// a sign-in that was meant to last only until the tab closes.
export const clearSessionArtifacts = (): void => {
    try {
        for (const key of SESSION_SCOPED_KEYS) {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        }
    } catch (e) {
        console.warn('[Session] Failed to clear session storage', e);
    }
};

// Call before signIn(): it decides where the session Supabase is about to write
// will land.
export const setRemembered = (remember: boolean): void => {
    clearSessionArtifacts();
    try {
        if (remember) {
            localStorage.setItem(REMEMBER_KEY, '1');
        } else {
            localStorage.removeItem(REMEMBER_KEY);
        }
    } catch (e) {
        console.warn('[Session] Could not persist the remember-me choice', e);
    }
};

// Storage adapter handed to createClient(). Matches auth-js's SupportedStorage.
export const sessionStore = {
    getItem: (key: string): string | null => {
        try {
            return activeStore().getItem(key);
        } catch (e) {
            console.warn('[Session] Read failed', e);
            return null;
        }
    },
    setItem: (key: string, value: string): void => {
        try {
            activeStore().setItem(key, value);
        } catch (e) {
            console.warn('[Session] Write failed', e);
        }
    },
    removeItem: (key: string): void => {
        // Both sides, for the same reason clearSessionArtifacts() does.
        try {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        } catch (e) {
            console.warn('[Session] Delete failed', e);
        }
    },
};

const readMeta = (): SessionMeta | null => {
    try {
        const raw = activeStore().getItem(META_KEY);
        if (!raw) return null;
        const meta = JSON.parse(raw);
        if (typeof meta?.startedAt !== 'number' || typeof meta?.lastActiveAt !== 'number') {
            return null;
        }
        return meta;
    } catch (e) {
        console.warn('[Session] Meta parse error', e);
        return null;
    }
};

const writeMeta = (meta: SessionMeta): void => {
    try {
        activeStore().setItem(META_KEY, JSON.stringify(meta));
    } catch (e) {
        console.warn('[Session] Could not record session meta', e);
    }
};

// Starts the 12h clock. Deliberately preserves an existing startedAt: Supabase
// re-emits SIGNED_IN in situations other than a fresh login (a tab regaining
// focus, for one), and resetting the start time there would push the hard cap
// out of reach forever. A real login has already cleared the meta via
// setRemembered()/signOut(), so it gets a fresh clock.
export const markSessionStart = (): void => {
    const now = Date.now();
    const existing = readMeta();
    writeMeta({ startedAt: existing?.startedAt ?? now, lastActiveAt: now });
};

// Throttled: this runs off pointer/key events, and rewriting storage on every
// one of them would be wasteful. 30s of resolution is plenty for a 30min policy.
const TOUCH_THROTTLE_MS = 30 * 1000;
let lastTouchWrite = 0;

export const touchActivity = (): void => {
    const now = Date.now();
    if (now - lastTouchWrite < TOUCH_THROTTLE_MS) return;

    const meta = readMeta();
    if (!meta) return; // no session to keep alive

    lastTouchWrite = now;
    writeMeta({ ...meta, lastActiveAt: now });
};

export const checkSessionPolicy = (): SessionVerdict => {
    const meta = readMeta();
    if (!meta) return 'no_session';

    const now = Date.now();
    if (now - meta.startedAt >= SESSION_MAX_AGE_MS) return 'expired_max_age';
    if (now - meta.lastActiveAt >= SESSION_IDLE_MS) return 'expired_idle';
    return 'ok';
};

// NOTE: this is a policy enforced by the client, not a security boundary. A
// refresh token copied off the device stays valid until it is revoked, which is
// why callers must expire a session with supabase.auth.signOut() rather than by
// deleting keys. To shorten the window a stolen access token stays usable,
// lower the JWT expiry in the Supabase dashboard (Auth > Sessions); on a Pro
// plan, move this policy to the server-side session settings entirely.
