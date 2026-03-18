import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';

import { detectPreferredLocale, isLocale, type Locale } from '../locale';
import { loadSettings, saveSettings } from '../settings';
import { AppPreferencesContext, type AppPreferencesContextValue } from './context';

type AppPreferencesState = {
    isDark: boolean;
    locale: Locale;
};
function resolveInitialLocale(storedLocale: Locale | undefined): Locale {
    if (isLocale(storedLocale)) {
        return storedLocale;
    }

    return detectPreferredLocale(navigator.languages);
}

export function AppPreferencesProvider({ children }: { children: ReactNode }) {
    const [preferences, setPreferences] = useState<AppPreferencesState>({
        isDark: false,
        locale: 'en',
    });
    const [canPersistPreferences, setCanPersistPreferences] = useState(false);
    const hasLocalChangesRef = useRef(false);

    useEffect(() => {
        let cancelled = false;

        void loadSettings()
            .then((settings) => {
                if (cancelled || hasLocalChangesRef.current) return;
                setPreferences({
                    isDark: settings.isDark,
                    locale: resolveInitialLocale(settings.locale),
                });
                setCanPersistPreferences(true);
            })
            .catch(() => {
                if (cancelled || hasLocalChangesRef.current) return;
                setPreferences({
                    isDark: false,
                    locale: detectPreferredLocale(navigator.languages),
                });
                setCanPersistPreferences(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', preferences.isDark);
        document.documentElement.lang = preferences.locale;
    }, [preferences.isDark, preferences.locale]);

    useEffect(() => {
        if (!canPersistPreferences) return;
        void saveSettings(preferences);
    }, [canPersistPreferences, preferences]);

    const updatePreferences = useCallback((updater: (current: AppPreferencesState) => AppPreferencesState) => {
        hasLocalChangesRef.current = true;
        setCanPersistPreferences(true);
        setPreferences((current) => updater(current));
    }, []);

    const setLocale = useCallback((locale: Locale) => {
        updatePreferences((current) => current.locale === locale ? current : { ...current, locale });
    }, [updatePreferences]);

    const toggleTheme = useCallback(() => {
        updatePreferences((current) => ({ ...current, isDark: !current.isDark }));
    }, [updatePreferences]);

    const value = useMemo<AppPreferencesContextValue>(() => ({
        isDark: preferences.isDark,
        locale: preferences.locale,
        setLocale,
        toggleTheme,
    }), [preferences.isDark, preferences.locale, setLocale, toggleTheme]);

    return (
        <AppPreferencesContext.Provider value={value}>
            {children}
        </AppPreferencesContext.Provider>
    );
}
