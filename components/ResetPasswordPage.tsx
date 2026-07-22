import React, { useState } from 'react';
import { updateUserPassword, signOut } from '../services/authService';
import { translateAuthError } from '../services/authError';
import { CircleAlert, CircleCheck, KeyRound, Loader2, Lock } from 'lucide-react';
import { AuthShell } from './auth/AuthShell';
import { AuthField } from './auth/AuthField';
import { useT } from '../hooks/useT';

const ResetPasswordPage: React.FC = () => {
    const t = useT();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (password !== confirmPassword) {
            setError(t.resetPassword.passwordsDoNotMatch);
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError(t.resetPassword.tooShort);
            setLoading(false);
            return;
        }

        try {
            await updateUserPassword(password);
            setSuccess(true);
            // Optional: Sign out to force re-login with new password, or just redirect
            setTimeout(async () => {
                await signOut();
                window.location.href = '/'; // Reload to clear recovery hash and state
            }, 2000);
        } catch (err: unknown) {
            console.error(err);
            // Supabase rejects a password for reasons the form cannot predict --
            // same as the old one, below the project's policy, recovery session
            // already lapsed. Saying only "failed" leaves the user retrying the
            // exact input that was just refused.
            setError(translateAuthError(err, t, t.resetPassword.updateFailed));
        } finally {
            setLoading(false);
        }
    };

    // The subtitle already says what happens next, so the success state adds a
    // mark rather than a second sentence saying the same thing.
    if (success) {
        return (
            <AuthShell title={t.resetPassword.successTitle} subtitle={t.resetPassword.successBody}>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 animate-auth-banner-in">
                    <CircleCheck size={28} />
                </div>
            </AuthShell>
        );
    }

    return (
        <AuthShell title={t.resetPassword.title} subtitle={t.resetPassword.subtitle} busy={loading}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div
                        role="alert"
                        className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700 animate-auth-banner-in"
                    >
                        <CircleAlert size={16} className="mt-0.5 shrink-0 text-red-500" />
                        <span>{error}</span>
                    </div>
                )}

                {/* autoComplete="new-password" on both, so the browser offers to
                    store the new credential rather than refilling the old one. */}
                <AuthField
                    id="nmt-new-password"
                    name="new-password"
                    label={t.resetPassword.newPassword}
                    icon={Lock}
                    type="password"
                    value={password}
                    onChange={setPassword}
                    autoComplete="new-password"
                    placeholder="••••••••"
                />

                <AuthField
                    id="nmt-confirm-password"
                    name="confirm-password"
                    label={t.resetPassword.confirmPassword}
                    icon={Lock}
                    type="password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    invalid={mismatch}
                    hint={
                        confirmPassword.length > 0 && (
                            <span className={mismatch ? 'font-medium text-red-500' : 'font-medium text-accent-700'}>
                                {mismatch ? t.resetPassword.passwordsDoNotMatch : t.resetPassword.passwordsMatch}
                            </span>
                        )
                    }
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 font-semibold text-white shadow-lg shadow-brand-600/20 transition duration-200 hover:bg-brand-700 hover:shadow-brand-700/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-brand-600"
                >
                    {loading ? (
                        <>
                            <Loader2 size={18} className="animate-spin" /> {t.resetPassword.updating}
                        </>
                    ) : (
                        <>
                            {t.resetPassword.submit} <KeyRound size={18} />
                        </>
                    )}
                </button>
            </form>
        </AuthShell>
    );
};

export default ResetPasswordPage;
