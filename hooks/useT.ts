import { useSyncExternalStore } from 'react';
import { dict, getLang, subscribe } from '../services/i18n';
import type { Dictionary, Lang } from '../locales';

// No provider to mount: useSyncExternalStore subscribes each component straight
// to the i18n module. A component that renders no text never subscribes and so
// never re-renders when the language changes.

/** The active dictionary. Index it directly: `t.login.signIn`. */
export const useT = (): Dictionary => {
    useSyncExternalStore(subscribe, getLang, getLang);
    return dict();
};

/** The active language code -- for the toggle's own highlighting. */
export const useLang = (): Lang => useSyncExternalStore(subscribe, getLang, getLang);
