import React, { ReactNode, useState } from 'react';
import { Eye, EyeOff, LucideIcon } from 'lucide-react';
import { useT } from '../../hooks/useT';

interface AuthFieldProps {
    /** Must be stable: it ties the label to the input and the browser's password
     *  manager keys its saved entries off the field's id/name pair. */
    id: string;
    name: string;
    label: string;
    icon: LucideIcon;
    value: string;
    onChange: (value: string) => void;
    /** Never guess this one -- it is what decides whether the browser offers to
     *  save and refill the credential. */
    autoComplete: string;
    type?: 'text' | 'password';
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    invalid?: boolean;
    hint?: ReactNode;
    onKeyUp?: React.KeyboardEventHandler<HTMLInputElement>;
    onBlur?: React.FocusEventHandler<HTMLInputElement>;
}

// A labelled text input for the pre-auth screens: leading icon, optional reveal
// toggle, optional hint underneath. Both screens use it, so an accessibility fix
// here (a real label/id pair, a focus ring that survives a dark browser theme)
// lands on all four fields at once.
export const AuthField: React.FC<AuthFieldProps> = ({
    id,
    name,
    label,
    icon: Icon,
    value,
    onChange,
    autoComplete,
    type = 'text',
    placeholder,
    required = true,
    disabled = false,
    invalid = false,
    hint,
    onKeyUp,
    onBlur,
}) => {
    const t = useT();
    const [revealed, setRevealed] = useState(false);
    const isPassword = type === 'password';
    const hintId = hint ? `${id}-hint` : undefined;

    // Built here rather than inline: a conditional inside className turns into a
    // multi-line template literal that the formatter mangles into something
    // nobody can read.
    const inputClass = [
        'peer w-full rounded-xl border bg-slate-50/80 py-2.5 pl-11 text-slate-900 outline-none transition duration-200',
        'placeholder:text-slate-400 focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60',
        isPassword ? 'pr-12' : 'pr-4',
        invalid
            ? 'border-red-300 focus:border-red-400 focus:ring-red-500/15'
            : 'border-slate-200 focus:border-brand-500 focus:ring-accent-400/20',
    ].join(' ');

    const iconClass = [
        'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors',
        invalid ? 'text-red-400' : 'text-slate-400 peer-focus:text-brand-600',
    ].join(' ');

    return (
        <div>
            <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
                {label}
            </label>

            <div className="relative">
                {/* The input comes first in the DOM so the icon and the reveal
                    button can react to its focus with peer-*; both are positioned
                    absolutely, so the source order costs nothing visually. */}
                <input
                    id={id}
                    name={name}
                    type={isPassword && revealed ? 'text' : type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyUp={onKeyUp}
                    onBlur={onBlur}
                    autoComplete={autoComplete}
                    placeholder={placeholder}
                    required={required}
                    disabled={disabled}
                    aria-invalid={invalid || undefined}
                    aria-describedby={hintId}
                    className={inputClass}
                />

                <Icon
                    size={18}
                    aria-hidden="true"
                    className={iconClass}
                />

                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setRevealed((r) => !r)}
                        disabled={disabled}
                        // The icon alone says nothing to a screen reader, and the
                        // control changes meaning each time it is pressed.
                        aria-label={revealed ? t.common.hidePassword : t.common.showPassword}
                        aria-pressed={revealed}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:text-slate-600 focus-visible:text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                    >
                        {revealed ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}
            </div>

            {hint && (
                <p id={hintId} className="mt-1.5 text-xs leading-relaxed text-slate-500">
                    {hint}
                </p>
            )}
        </div>
    );
};
