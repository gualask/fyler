import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { detectPreferredLocale, isLocale, type Locale } from './locale';
import { PreferencesContext, type PreferencesContextValue } from './preferences.context';
import { ACCENT_COLORS, type AccentColor, loadSettings, saveSettings } from './settings';

type PreferencesState = {
    isDark: boolean;
    locale: Locale;
    accent: AccentColor;
    tutorialSeen: boolean;
};
function resolveInitialLocale(storedLocale: Locale | undefined): Locale {
    if (isLocale(storedLocale)) {
        return storedLocale;
    }

    return detectPreferredLocale(navigator.languages);
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
    const [preferences, setPreferences] = useState<PreferencesState>({
        isDark: false,
        locale: 'en',
        accent: 'indigo',
        tutorialSeen: false,
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
                    tutorialSeen: settings.tutorialSeen ?? false,
                });
                setCanPersistPreferences(true);
            })
            .catch(() => {
                if (cancelled || hasLocalChangesRef.current) return;
                setPreferences({
                    isDark: false,
                    locale: detectPreferredLocale(navigator.languages),
                    accent: 'indigo',
                    tutorialSeen: false,
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

    const updatePreferences = useCallback(
        (updater: (current: PreferencesState) => PreferencesState) => {
            hasLocalChangesRef.current = true;
            setCanPersistPreferences(true);
            setPreferences((current) => updater(current));
        },
        [],
    );

    const setLocale = useCallback(
        (locale: Locale) => {
            updatePreferences((current) =>
                current.locale === locale ? current : { ...current, locale },
            );
        },
        [updatePreferences],
    );

    const toggleTheme = useCallback(() => {
        updatePreferences((current) => ({ ...current, isDark: !current.isDark }));
    }, [updatePreferences]);

    const setAccent = useCallback(
        (accent: AccentColor) => {
            updatePreferences((current) =>
                current.accent === accent ? current : { ...current, accent },
            );
        },
        [updatePreferences],
    );

    const markTutorialSeen = useCallback(() => {
        updatePreferences((current) =>
            current.tutorialSeen ? current : { ...current, tutorialSeen: true },
        );
    }, [updatePreferences]);

    const value = useMemo<PreferencesContextValue>(
        () => ({
            isDark: preferences.isDark,
            locale: preferences.locale,
            accent: preferences.accent,
            tutorialSeen: preferences.tutorialSeen,
            setLocale,
            toggleTheme,
            setAccent,
            markTutorialSeen,
        }),
        [
            preferences.isDark,
            preferences.locale,
            preferences.accent,
            preferences.tutorialSeen,
            setLocale,
            toggleTheme,
            setAccent,
            markTutorialSeen,
        ],
    );

    return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
