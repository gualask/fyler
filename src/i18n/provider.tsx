import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';

import { detectPreferredLocale, isLocale, type Locale } from './locale';
import { ACCENT_COLORS, loadSettings, saveSettings, type AccentColor } from './settings';
import { AppPreferencesContext, type AppPreferencesContextValue } from './context';

type AppPreferencesState = {
    isDark: boolean;
    locale: Locale;
    accent: AccentColor;
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
        accent: 'indigo',
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
                    accent: settings.accent ?? 'indigo',
                });
                setCanPersistPreferences(true);
            })
            .catch(() => {
                if (cancelled || hasLocalChangesRef.current) return;
                setPreferences({
                    isDark: false,
                    locale: detectPreferredLocale(navigator.languages),
                    accent: 'indigo',
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

        for (const color of ACCENT_COLORS) {
            document.documentElement.classList.remove(`accent-${color}`);
        }
        if (preferences.accent !== 'indigo') {
            document.documentElement.classList.add(`accent-${preferences.accent}`);
        }
    }, [preferences.isDark, preferences.locale, preferences.accent]);

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

    const setAccent = useCallback((accent: AccentColor) => {
        updatePreferences((current) => current.accent === accent ? current : { ...current, accent });
    }, [updatePreferences]);

    const value = useMemo<AppPreferencesContextValue>(() => ({
        isDark: preferences.isDark,
        locale: preferences.locale,
        accent: preferences.accent,
        setLocale,
        toggleTheme,
        setAccent,
    }), [preferences.isDark, preferences.locale, preferences.accent, setLocale, toggleTheme, setAccent]);

    return (
        <AppPreferencesContext.Provider value={value}>
            {children}
        </AppPreferencesContext.Provider>
    );
}
