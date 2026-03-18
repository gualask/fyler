import { createContext, useContext } from 'react';

import type { Locale } from '../locale';

export type AppPreferencesContextValue = {
    isDark: boolean;
    locale: Locale;
    setLocale: (locale: Locale) => void;
    toggleTheme: () => void;
};

export const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null);

export function useAppPreferences() {
    const context = useContext(AppPreferencesContext);
    if (!context) {
        throw new Error('AppPreferencesProvider not found');
    }

    return context;
}
