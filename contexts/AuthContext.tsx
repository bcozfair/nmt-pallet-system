import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { User as AppUser } from '../types';
import { getCurrentUserProfile, getSession, onAuthStateChange, signOut as serviceSignOut } from '../services/authService';
import {
    activeStore,
    checkSessionPolicy,
    clearSessionArtifacts,
    markSessionStart,
    touchActivity,
    SessionVerdict,
} from '../services/sessionPolicy';
import { PROFILE_CACHE_KEY } from '../constants';
import { toast } from '../services/toast';

interface AuthContextType {
    user: AppUser | null;
    loading: boolean;
    isPasswordRecovery: boolean;
    signOut: () => Promise<void>;
    refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// A profile is only usable once it carries a role from our own `users` table.
// Supabase's session.user also has a `role`, but that is the Postgres role and
// is always 'authenticated' -- never 'staff'/'admin'. Casting session.user to an
// AppUser is what used to flash the staff interface at admins on login: App.tsx
// saw role !== 'admin' and fell through to MobileInterface until the real
// profile arrived a round-trip later.
const isCompleteProfile = (u: any): u is AppUser =>
    !!u && typeof u.id === 'string' && (u.role === 'staff' || u.role === 'admin');

// The cache lives in whichever storage holds the session, so it cannot outlive
// it. Kept in localStorage it would survive a tab close in per-tab mode and
// hydrate an interface for a session that is already gone.
const readCachedProfile = (userId?: string): AppUser | null => {
    try {
        const raw = activeStore().getItem(PROFILE_CACHE_KEY);
        if (!raw) return null;
        const cached = JSON.parse(raw);
        if (!isCompleteProfile(cached)) return null;
        // A cache belonging to a different account must never be rendered --
        // that is the second way the wrong interface could appear.
        if (userId && cached.id !== userId) return null;
        return cached;
    } catch (e) {
        console.warn("[Auth] Cache parse error", e);
        return null;
    }
};

const cacheProfile = (profile: AppUser): void => {
    try {
        activeStore().setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    } catch (e) {
        console.warn("[Auth] Could not cache profile", e);
    }
};

// Events that count as the user being present. Kept to deliberate gestures --
// mousemove would keep a session alive under a passing cursor.
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const;

const POLICY_CHECK_INTERVAL_MS = 60 * 1000;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

    const signOut = useCallback(async (options?: { quiet?: boolean }) => {
        if (!options?.quiet) setLoading(true);
        try {
            await serviceSignOut();
        } catch (error) {
            // Even if revoking server-side failed, this device must end up signed
            // out. Leaving the user logged in here because the network blipped is
            // the worse outcome.
            console.error("Sign out error:", error);
        } finally {
            setUser(null);
            clearSessionArtifacts(); // session + meta + profile cache + staged scans
            setLoading(false);
        }
    }, []);

    const expireSession = useCallback(async (verdict: SessionVerdict) => {
        // Say why, or an unexplained bounce back to the login screen reads as a bug.
        if (verdict === 'expired_max_age') {
            toast.info("Your session has expired. Please sign in again.");
        } else {
            toast.info("Signed out automatically due to inactivity.");
        }
        console.warn(`[Auth] Session expired (${verdict}).`);
        // quiet: login is already visible; do not flash "Loading System..." again.
        await signOut({ quiet: true });
    }, [signOut]);

    // 0. Cache Hydration (Run once on mount)
    useEffect(() => {
        // Detect Recovery Mode from URL initially (before Auth Listener fires)
        const hash = window.location.hash;
        if (hash && hash.includes('type=recovery')) {
            console.log("[Auth] Recovery link detected via URL hash");
            setIsPasswordRecovery(true);
        }

        // An expired session must not paint an interface for even one frame. Note
        // this only skips hydration -- the listener below does the actual sign
        // out, so the refresh token gets revoked instead of merely deleted.
        const verdict = checkSessionPolicy();
        if (verdict === 'expired_max_age' || verdict === 'expired_idle') {
            console.warn(`[Auth] Cached session is past its ${verdict === 'expired_idle' ? 'idle' : 'max age'} limit.`);
            // Unlock now so login shows while the listener revokes the session.
            setLoading(false);
            return;
        }

        // Hydrate only from a cache that already knows the role. Anything partial
        // or legacy would render an interface we are only guessing at.
        const cached = readCachedProfile();
        if (cached) {
            setUser(cached);
            setLoading(false); // Immediate unlock for better UX
        } else {
            activeStore().removeItem(PROFILE_CACHE_KEY);
        }
    }, []);

    useEffect(() => {
        let mounted = true;

        // Safety Timeout: Force UI unlock if Supabase listener never fires
        const safetyTimer = setTimeout(() => {
            if (mounted) {
                console.warn("[Auth] Init timeout - forcing UI unlock.");
                setLoading(false);
            }
        }, 4000);

        // Helper: fetch the full profile (the only source of the real role) and
        // cache it. Returns false when the role could not be resolved, so the
        // caller can decide rather than rendering a guess.
        const handleUserSession = async (authUser: User): Promise<boolean> => {
            try {
                const profile = await getCurrentUserProfile(authUser.id);
                if (isCompleteProfile(profile)) {
                    setUser(profile);
                    cacheProfile(profile);
                    return true;
                }
                console.warn("[Auth] Profile carries no usable role:", authUser.id);
            } catch (e) {
                console.warn("[Auth] Profile fetch failed:", e);
            }
            return false;
        };

        // Initialize Listener
        const { data: { subscription } } = onAuthStateChange(async (event, session) => {
            if (!mounted) return;
            // console.log(`[Auth] Event: ${event}`, session ? session.user.email : 'No Session');

            if (event === 'PASSWORD_RECOVERY') {
                setIsPasswordRecovery(true);
            }

            // NOTE: the safety timer is cleared where the UI actually unlocks, not
            // here. Clearing it on the event alone left `loading` stuck forever on
            // any path that never reached setLoading(false).

            if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'PASSWORD_RECOVERY') {
                if (session?.user) {
                    // 1. Session policy comes first: a stored session that is past
                    //    its limits must never reach the UI. Deferred for the same
                    //    reason as the profile fetch below -- signOut() inside this
                    //    callback can deadlock on the client's auth lock.
                    const verdict = checkSessionPolicy();
                    if (verdict === 'expired_max_age' || verdict === 'expired_idle') {
                        setLoading(false);
                        clearTimeout(safetyTimer);
                        setTimeout(() => { if (mounted) expireSession(verdict); }, 0);
                        return;
                    }

                    // A fresh login starts the 12h clock. 'no_session' here means a
                    // live session with no meta (storage cleared by hand, or a
                    // session predating this policy) -- start the clock rather than
                    // let it run unbounded.
                    if (event === 'SIGNED_IN' || verdict === 'no_session') {
                        markSessionStart();
                    }

                    // 2. Unlock immediately ONLY from this same user's cached profile,
                    //    which has a real role. Never render session.user itself.
                    const cached = readCachedProfile(session.user.id);
                    if (cached) {
                        setUser(cached);
                        setLoading(false);
                        clearTimeout(safetyTimer);
                    }

                    // 3. Always re-read the profile: the cache goes stale and an admin
                    //    may have changed the role since last login.
                    const authUser = session.user;
                    setTimeout(async () => {
                        if (!mounted) return;
                        const loaded = await handleUserSession(authUser);
                        if (!mounted) return;

                        if (!loaded && !cached) {
                            // Role unknown and nothing safe to fall back on. Any
                            // interface shown here would be a guess, so go to login.
                            console.warn("[Auth] Could not resolve profile; signing out of the UI.");
                            setUser(null);
                            activeStore().removeItem(PROFILE_CACHE_KEY);
                        }
                        setLoading(false);
                        clearTimeout(safetyTimer);
                    }, 0);
                } else if (event === 'INITIAL_SESSION') {
                    // No session found on startup
                    console.warn("[Auth] No session found. Clearing cache.");
                    setUser(null);
                    clearSessionArtifacts();
                    setLoading(false);
                    clearTimeout(safetyTimer);
                }
            } else if (event === 'SIGNED_OUT') {
                // Covers sign-outs this tab did not initiate (other tab, revoked token).
                setUser(null);
                clearSessionArtifacts();
                setLoading(false);
                clearTimeout(safetyTimer);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
            clearTimeout(safetyTimer);
        };
    }, [expireSession]);

    // Enforce the session policy for as long as someone is signed in.
    useEffect(() => {
        if (!user) return;

        let expiring = false;

        const enforce = () => {
            if (expiring) return;
            const verdict = checkSessionPolicy();

            if (verdict === 'no_session') {
                // Signed in but the meta is gone. Restart the clock instead of
                // leaving this session with no expiry at all.
                markSessionStart();
                return;
            }
            if (verdict === 'ok') return;

            expiring = true;
            expireSession(verdict);
        };

        const onActivity = () => touchActivity();
        ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, onActivity, { passive: true }));

        // setInterval is throttled hard in background tabs and stops entirely while
        // the device sleeps, so the timer alone would let an expired session come
        // back to life. Re-checking the timestamps whenever the tab is shown again
        // is what actually makes the deadlines hold.
        const onWake = () => {
            if (document.visibilityState === 'visible') enforce();
        };
        document.addEventListener('visibilitychange', onWake);
        window.addEventListener('focus', onWake);

        const interval = window.setInterval(enforce, POLICY_CHECK_INTERVAL_MS);
        enforce();

        return () => {
            ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, onActivity));
            document.removeEventListener('visibilitychange', onWake);
            window.removeEventListener('focus', onWake);
            clearInterval(interval);
        };
    }, [user, expireSession]);

    const refreshSession = async () => {
        // Manual refresh if needed (usually handled by autoRefreshToken).
        // Re-reads the profile instead of storing session.user: that object has
        // no role of ours, so writing it here would drop an admin into the staff
        // interface with nothing left to correct it.
        const { data } = await getSession();
        const authUser = data.session?.user;
        if (!authUser) return;

        const profile = await getCurrentUserProfile(authUser.id);
        if (isCompleteProfile(profile)) {
            setUser(profile);
            cacheProfile(profile);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, isPasswordRecovery, signOut, refreshSession }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
