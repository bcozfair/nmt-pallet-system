import type { Dictionary } from '../locales';

// Supabase reports auth failures in English, so nothing it raises can go on a
// Thai screen unchanged. auth-js does attach a stable `code` to AuthApiError
// (the ErrorCode union in @supabase/auth-js), which is what this matches on
// first; the message-text checks behind it are a fallback for the paths that
// still arrive without a code.
//
// Only failures the user can act on get their own message. Everything else
// returns `fallback` -- an honest "it did not work" beats leaking an internal
// English string, and the real error is on the console for whoever is debugging.
// That is also why `fallback` is the caller's to supply: "check your sign-in
// details" is the right thing to say on the login form and the wrong thing to
// say to someone who is halfway through setting a new password.

const codeOf = (err: unknown): string => {
    if (typeof err === 'object' && err !== null && 'code' in err) {
        const code = (err as { code: unknown }).code;
        if (typeof code === 'string') return code;
    }
    return '';
};

export const translateAuthError = (err: unknown, t: Dictionary, fallback: string): string => {
    const code = codeOf(err);
    const raw = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase();

    // The recovery link carries its own short-lived session, and that session is
    // the only thing authorising the password update. Once it lapses there is
    // nothing to retry -- the user needs a fresh link -- so this must never be
    // reported as a generic failure.
    if (
        code === 'session_not_found' ||
        code === 'session_expired' ||
        code === 'bad_jwt' ||
        raw.includes('auth session missing')
    ) {
        return t.resetPassword.linkExpired;
    }

    if (code === 'same_password' || raw.includes('different from the old password')) {
        return t.resetPassword.samePassword;
    }

    // Supabase enforces its own password policy server-side, and it can be
    // stricter than the length check the form does on its own. Match on the full
    // "at least" phrase: the same-password message above also begins "Password
    // should be...", so a looser test here would swallow it if the two branches
    // were ever reordered.
    if (code === 'weak_password' || raw.includes('password should be at least') || raw.includes('known to be weak')) {
        return t.resetPassword.weakPassword;
    }

    if (code === 'invalid_credentials' || raw.includes('invalid login credentials')) {
        return t.login.invalidCredentials;
    }

    // over_request_rate_limit, over_email_send_rate_limit, over_sms_send_rate_limit.
    if (code.startsWith('over_') || raw.includes('rate limit') || raw.includes('for security purposes')) {
        return t.login.tooManyAttempts;
    }

    return fallback;
};
