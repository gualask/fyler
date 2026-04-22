import { createContext, useContext } from 'react';

import type { Locale } from './preferences.locale';
import type { AccentColor, FinalDocumentLayout } from './preferences.settings';

export type PreferencesContextValue = {
    isDark: boolean;
    locale: Locale;
    accent: AccentColor;
    tutorialSeen: boolean;
    finalDocumentLayout: FinalDocumentLayout;
    setLocale: (locale: Locale) => void;
    toggleTheme: () => void;
    setAccent: (accent: AccentColor) => void;
    markTutorialSeen: () => void;
    setFinalDocumentLayout: (layout: FinalDocumentLayout) => void;
};

export const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function usePreferences() {
    const context = useContext(PreferencesContext);
    if (!context) {
        throw new Error('PreferencesProvider not found');
    }

    return context;
}
