import React, { ReactNode } from 'react';
import { BrandMark } from './BrandMark';
import { LanguageToggle } from '../LanguageToggle';
import { useT } from '../../hooks/useT';

interface AuthShellProps {
    title: string;
    subtitle: string;
    /** Drives the hairline sweep -- see the note on the divider below. */
    busy?: boolean;
    children: ReactNode;
    footer?: ReactNode;
}

// The frame every pre-auth screen sits in: sign-in, password recovery, and the
// reset page reached from an emailed link. Sharing it is what keeps those three
// from drifting apart -- the reset page used to be indigo for no reason other
// than having been styled separately.
export const AuthShell: React.FC<AuthShellProps> = ({ title, subtitle, busy = false, children, footer }) => {
    const t = useT();

    return (
        <div className="auth-canvas flex min-h-dvh items-center justify-center px-4 py-8">
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_24px_60px_-32px_rgba(15,42,82,0.45)] animate-auth-card-in">
                {/* Brand hairline. Also the only progress indicator on these
                    screens: the gradient is twice the width of the bar, so
                    sliding it reads as motion along the edge of the card. */}
                <div
                    className={
                        'h-[3px] w-full bg-linear-to-r from-brand-600 via-accent-500 to-brand-600 bg-[length:200%_100%] ' +
                        (busy ? 'animate-brand-sweep' : '')
                    }
                    aria-hidden="true"
                />

                <div className="p-6 sm:p-8">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <BrandMark className="h-6 w-auto" />
                            {/* No letter-spacing here: it is set in Thai as often
                                as in English, and tracking breaks a Thai word
                                into loose syllables. */}
                            <p className="mt-1.5 text-xs font-medium text-slate-400">{t.login.brandTagline}</p>
                        </div>
                        {/* The only screens an unauthenticated user ever sees, so
                            the language choice has to be reachable from here. */}
                        <LanguageToggle />
                    </div>

                    <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
                    <p className="mt-1 text-sm leading-relaxed text-slate-500">{subtitle}</p>

                    <div className="mt-6">{children}</div>
                </div>

                {footer && (
                    <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-3 sm:px-8">{footer}</div>
                )}
            </div>
        </div>
    );
};
