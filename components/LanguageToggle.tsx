import React from 'react';
import { Languages } from 'lucide-react';
import { LANGUAGES } from '../locales';
import { setLanguage } from '../services/i18n';
import { useLang } from '../hooks/useT';

// Sits in the header of the pre-auth card -- the only screens shown before a
// session exists, which is where the choice has to be made.
//
// There used to be an `onColor` variant for the days when those cards had a
// solid blue header to sit on. Nothing has one now, so the variant went with it.
export const LanguageToggle: React.FC = () => {
    const lang = useLang();

    return (
        <div className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 p-1 pl-2.5 text-slate-500">
            <Languages size={14} className="shrink-0 opacity-70" aria-hidden="true" />
            {LANGUAGES.map(({ code, label }) => (
                <button
                    key={code}
                    type="button"
                    onClick={() => setLanguage(code)}
                    // aria-pressed rather than a label per button: the visible text
                    // is the language's own name, which already says what it does.
                    aria-pressed={lang === code}
                    className={
                        'rounded-full px-2.5 py-1 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ' +
                        (lang === code ? 'bg-white text-brand-700 shadow-sm' : 'hover:text-slate-700')
                    }
                >
                    {label}
                </button>
            ))}
        </div>
    );
};
