import React from 'react';
import { Languages } from 'lucide-react';
import { LANGUAGES } from '../locales';
import { setLanguage } from '../services/i18n';
import { useLang } from '../hooks/useT';

interface LanguageToggleProps {
    /** Styling for the two pre-auth screens, whose card headers are coloured. */
    variant?: 'onColor' | 'plain';
}

// Sits on the login and password-reset headers -- the only screens shown before
// a session exists, which is where the choice has to be made.
export const LanguageToggle: React.FC<LanguageToggleProps> = ({ variant = 'onColor' }) => {
    const lang = useLang();

    const track = variant === 'onColor' ? 'bg-white/15 text-white/80' : 'bg-gray-100 text-gray-500';
    const activeChip = variant === 'onColor' ? 'bg-white text-gray-900 shadow-sm' : 'bg-white text-blue-700 shadow-sm';
    const idleChip = variant === 'onColor' ? 'hover:text-white' : 'hover:text-gray-700';

    return (
        <div className={`inline-flex items-center gap-1 rounded-full p-1 pl-2.5 ${track}`}>
            <Languages size={14} className="shrink-0 opacity-70" aria-hidden="true" />
            {LANGUAGES.map(({ code, label }) => (
                <button
                    key={code}
                    type="button"
                    onClick={() => setLanguage(code)}
                    // aria-pressed rather than a label per button: the visible text
                    // is the language's own name, which already says what it does.
                    aria-pressed={lang === code}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold transition ${lang === code ? activeChip : idleChip}`}
                >
                    {label}
                </button>
            ))}
        </div>
    );
};
