import {
    useCallback,
    useEffect,
    useMemo,
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
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;

        void loadSettings()
            .then((settings) => {
                if (cancelled) return;
                setPreferences({
                    isDark: settings.isDark,
                    locale: resolveInitialLocale(settings.locale),
                });
                setLoaded(true);
            })
            .catch(() => {
                if (cancelled) return;
                setPreferences({
                    isDark: false,
                    locale: detectPreferredLocale(navigator.languages),
                });
                setLoaded(true);
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
        if (!loaded) return;
        void saveSettings(preferences);
    }, [loaded, preferences]);

    const setLocale = useCallback((locale: Locale) => {
        setPreferences((current) => current.locale === locale ? current : { ...current, locale });
    }, []);

    const toggleTheme = useCallback(() => {
        setPreferences((current) => ({ ...current, isDark: !current.isDark }));
    }, []);

    const value = useMemo<AppPreferencesContextValue>(() => ({
        loaded,
        isDark: preferences.isDark,
        locale: preferences.locale,
        setLocale,
        toggleTheme,
    }), [loaded, preferences.isDark, preferences.locale, setLocale, toggleTheme]);

    return (
        <AppPreferencesContext.Provider value={value}>
            {children}
        </AppPreferencesContext.Provider>
    );
}
