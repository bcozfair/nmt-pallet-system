import React, { useEffect, useState } from 'react';
import { signIn, resetPassword } from '../services/authService';
import { ArrowRight, ChevronLeft, CircleAlert, KeyRound, Loader2, Lock, MailCheck, UserRound } from 'lucide-react';
import { AuthShell } from './auth/AuthShell';
import { AuthField } from './auth/AuthField';
import { SESSION_IDLE_MS, SESSION_MAX_AGE_MS } from '../constants';
import { useT } from '../hooks/useT';
import { translateAuthError } from '../services/authError';

type AuthMode = 'login' | 'forgot_password';

const IDLE_MINUTES = Math.round(SESSION_IDLE_MS / 60_000);
const MAX_AGE_HOURS = Math.round(SESSION_MAX_AGE_MS / 3_600_000);

const LoginPage: React.FC = () => {
  const t = useT();
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [identifier, setIdentifier] = useState(''); // Email or Employee ID
  const [password, setPassword] = useState('');
  const [capsLock, setCapsLock] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isLogin = authMode === 'login';

  // Clear errors when switching modes
  useEffect(() => {
    setError(null);
    setSuccessMsg(null);
  }, [authMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (authMode === 'forgot_password') {
        // The response is deliberately identical whether or not the account
        // exists, and the destination mailbox is never echoed back. Supabase's
        // resetPasswordForEmail already succeeds for unknown addresses, so this
        // reveals nothing an attacker could use to enumerate employee ids.
        // (The previous screen went further and listed every admin by name.)
        await resetPassword(identifier);
        setSuccessMsg(t.login.resetSent);
      }
      else {
        await signIn(identifier, password);
        // App.tsx listener will handle redirection. Nothing is written to
        // storage here: the identifier and password are the browser's to
        // remember, via the autocomplete attributes on the fields below.
      }
    } catch (err: any) {
      console.error(err);
      if (authMode === 'forgot_password') {
        // Do not leak *why* it failed -- "no such user" is exactly the signal
        // an enumeration attack is looking for.
        setSuccessMsg(t.login.resetSent);
      } else {
        setError(translateAuthError(err, t, t.login.genericFailure));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={isLogin ? t.login.title : t.login.recoveryTitle}
      subtitle={isLogin ? t.login.subtitle : t.login.recoverySubtitle}
      busy={loading}
      footer={
        isLogin ? (
          <div className="space-y-1 text-center">
            <p className="text-xs font-medium text-slate-500">{t.login.authorizedOnly}</p>
            <p className="text-xs leading-relaxed text-slate-400">
              {t.login.sessionNotice(IDLE_MINUTES, MAX_AGE_HOURS)}
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAuthMode('login')}
            className="mx-auto flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-slate-500 transition-colors hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            <ChevronLeft size={16} /> {t.login.backToSignIn}
          </button>
        )
      }
    >
      {/* A real form element, submitted normally: that is what makes the browser
          offer to save the credential and refill it next time. It is also why
          this screen no longer keeps anything of its own -- see the comment in
          services/supabase.ts about the build that stored the raw password. */}
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
        {successMsg && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-xl border border-accent-100 bg-accent-50 p-3 text-sm leading-relaxed text-accent-800 animate-auth-banner-in"
          >
            <MailCheck size={16} className="mt-0.5 shrink-0 text-accent-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <AuthField
          id="nmt-identifier"
          name="username"
          label={t.login.identifierLabel}
          icon={UserRound}
          value={identifier}
          onChange={setIdentifier}
          autoComplete="username"
          placeholder={t.login.identifierPlaceholder}
          hint={!isLogin && t.login.resetHint}
        />

        {/* Collapsed rather than unmounted, so switching modes glides instead of
            snapping the card to a new height. `disabled` is what actually takes
            it out of the form: a hidden-but-required field would silently block
            submission in recovery mode, and a hidden password field is exactly
            the shape browsers refuse to autofill. */}
        <div
          aria-hidden={!isLogin}
          className={
            'grid transition-[grid-template-rows,opacity] duration-300 ease-out ' +
            (isLogin ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')
          }
        >
          <div className="overflow-hidden">
            <AuthField
              id="nmt-password"
              name="password"
              label={t.login.passwordLabel}
              icon={Lock}
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              placeholder="••••••••"
              required={isLogin}
              disabled={!isLogin}
              onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
              onBlur={() => setCapsLock(false)}
              hint={
                capsLock && (
                  <span className="font-medium text-amber-600">{t.login.capsLockOn}</span>
                )
              }
            />

            <div className="mt-1.5 flex justify-end">
              <button
                type="button"
                onClick={() => setAuthMode('forgot_password')}
                tabIndex={isLogin ? undefined : -1}
                className="rounded-lg px-1 py-0.5 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                {t.login.forgotPassword}
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 font-semibold text-white shadow-lg shadow-brand-600/20 transition duration-200 hover:bg-brand-700 hover:shadow-brand-700/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-brand-600"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" /> {t.login.processing}
            </>
          ) : isLogin ? (
            <>
              {t.login.signIn}
              <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </>
          ) : (
            <>
              {t.login.resetPassword} <KeyRound size={18} />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
};

export default LoginPage;
