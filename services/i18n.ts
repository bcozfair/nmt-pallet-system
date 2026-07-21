import { dictionaries, isLang, type Dictionary, type Lang } from '../locales';
import { LANG_STORAGE_KEY } from '../constants';

// The selected language lives in a module singleton, not in React state.
//
// That is not a shortcut -- it is what the app needs. Roughly 70 user-facing
// strings are produced by toast.* calls made from places that cannot hold a
// hook: utils/exportHelpers.ts, hooks/inventory/useInventoryActions.ts and
// contexts/AuthContext.tsx among them. Keeping the language in a provider would
// leave every one of those stuck in English. Here, both worlds read the same
// source: components subscribe through hooks/useT.ts, everything else calls
// dict() directly.

// Read eagerly, at import time, so the very first render already paints in the
// right language instead of flashing English for a frame.
const readStored = (): Lang => {
    try {
        const saved = localStorage.getItem(LANG_STORAGE_KEY);
        if (isLang(saved)) return saved;
    } catch (e) {
        // Private mode / storage disabled. Not worth failing over -- the default
        // is perfectly usable, it just will not persist.
        console.warn('[i18n] Could not read the stored language', e);
    }
    return 'th';
};

let current: Lang = readStored();

const listeners = new Set<() => void>();

export const getLang = (): Lang => current;

// The whole dictionary, not a lookup by key: callers index it directly
// (`dict().batch.confirm`), which is what makes a typo a compile error.
export const dict = (): Dictionary => dictionaries[current];

// Wired to useSyncExternalStore in hooks/useT.ts. Returning the unsubscribe
// function is what that hook expects.
export const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

export const setLanguage = (lang: Lang): void => {
    if (lang === current) return;
    current = lang;

    try {
        localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch (e) {
        console.warn('[i18n] Could not persist the language choice', e);
    }

    syncDocumentLang();
    listeners.forEach(listener => listener());
};

// Keeps <html lang> honest. It drives screen-reader pronunciation and the
// browser's own line-breaking, both of which matter for Thai -- which has no
// spaces between words.
export const syncDocumentLang = (): void => {
    document.documentElement.lang = current;
};
