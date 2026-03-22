import { createContext, useContext } from 'react';

import type { Locale } from './locale';
import type { AccentColor } from './settings';

export type AppPreferencesContextValue = {
    isDark: boolean;
    locale: Locale;
    accent: AccentColor;
    setLocale: (locale: Locale) => void;
    toggleTheme: () => void;
    setAccent: (accent: AccentColor) => void;
};

export const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null);

export function useAppPreferences() {
    const context = useContext(AppPreferencesContext);
    if (!context) {
        throw new Error('AppPreferencesProvider not found');
    }

    return context;
}
