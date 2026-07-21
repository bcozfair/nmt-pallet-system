import { en } from './en';
import { th } from './th';

export type { Dictionary } from './en';

export type Lang = 'th' | 'en';

export const dictionaries = { th, en };

// Ordered as the language toggle renders them, default first.
export const LANGUAGES: { code: Lang; label: string }[] = [
    { code: 'th', label: 'ไทย' },
    { code: 'en', label: 'EN' },
];

export const isLang = (value: unknown): value is Lang => value === 'th' || value === 'en';
