import { createContext, useContext } from 'react';

import type { Locale } from './preferences.locale';
import type { AccentColor } from './preferences.settings';

export type PreferencesContextValue = {
    isDark: boolean;
    locale: Locale;
    accent: AccentColor;
    tutorialSeen: boolean;
    setLocale: (locale: Locale) => void;
    toggleTheme: () => void;
    setAccent: (accent: AccentColor) => void;
    markTutorialSeen: () => void;
};

export const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function usePreferences() {
    const context = useContext(PreferencesContext);
    if (!context) {
        throw new Error('PreferencesProvider not found');
    }

    return context;
}
