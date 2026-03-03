import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { User as AppUser } from '../types';
import { getCurrentUserProfile, getSession, onAuthStateChange, signOut as serviceSignOut } from '../services/authService';

interface AuthContextType {
    user: AppUser | null;
    loading: boolean;
    isPasswordRecovery: boolean;
    signOut: () => Promise<void>;
    refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

    // 0. Cache Hydration (Run once on mount)
    useEffect(() => {
        // Detect Recovery Mode from URL initially (before Auth Listener fires)
        const hash = window.location.hash;
        if (hash && hash.includes('type=recovery')) {
            console.log("[Auth] Recovery link detected via URL hash");
            setIsPasswordRecovery(true);
        }

        try {
            const cached = localStorage.getItem('nmt_user_profile');
            if (cached) {
                const parsedUser = JSON.parse(cached);
                setUser(parsedUser);
                setLoading(false); // Immediate unlock for better UX
            }
        } catch (e) {
            console.error("Cache parse error", e);
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

        // Helper: Logic to fetch profile and set user
        const handleUserSession = async (authUser: User) => {
            try {
                // optimistically set basic user first
                // optimistically set basic user first - REMOVED to prevent overwriting full profile
                // The caller (onAuthStateChange) handles the initial set safely now.


                // then fetch full profile
                const profile = await getCurrentUserProfile(authUser.id);
                if (profile) {
                    setUser(profile);
                    // UPDATE CACHE
                    localStorage.setItem('nmt_user_profile', JSON.stringify(profile));
                }
            } catch (e) {
                console.warn("[Auth] Profile fetch failed, using fallback:", e);
            }
        };

        // Initialize Listener
        const { data: { subscription } } = onAuthStateChange(async (event, session) => {
            if (!mounted) return;
            // console.log(`[Auth] Event: ${event}`, session ? session.user.email : 'No Session');

            if (event === 'PASSWORD_RECOVERY') {
                setIsPasswordRecovery(true);
            }

            clearTimeout(safetyTimer); // Event captured, clear timeout

            if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'PASSWORD_RECOVERY') {
                if (session?.user) {
                    // 1. Optimistic Update & Unlock
                    // cast to AppUser temporarily so UI can render
                    // SAFEGUARD: Only overwrite if we don't have a user, or ID changed, or current user lacks role (is partial)
                    setUser(prev => {
                        if (prev && prev.id === session.user.id && prev.role) {
                            return prev;
                        }
                        return session.user as unknown as AppUser;
                    });
                    setLoading(false);

                    // 2. Background: Fetch full profile to get roles
                    handleUserSession(session.user);
                } else if (event === 'INITIAL_SESSION') {
                    // No session found on startup
                    console.warn("[Auth] No session found. Clearing cache.");
                    setUser(null);
                    localStorage.removeItem('nmt_user_profile');
                    setLoading(false);
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
            clearTimeout(safetyTimer);
        };
    }, []);

    const signOut = async () => {
        setLoading(true);
        try {
            await serviceSignOut();
            setUser(null);
            localStorage.removeItem('nmt_user_profile'); // Clear cache
        } catch (error) {
            console.error("Sign out error:", error);
        } finally {
            setLoading(false);
        }
    };

    const refreshSession = async () => {
        // Manual refresh if needed (usually handled by autoRefreshToken)
        const { data } = await getSession();
        if (data.session?.user) {
            setUser(data.session.user as unknown as AppUser);
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
