import {
    type ReactNode,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { type PreferencesState, resolvePreferencesState } from './preferences.bootstrap';
import { PreferencesContext, type PreferencesContextValue } from './preferences.context';
import type { Locale } from './preferences.locale';
import {
    ACCENT_COLORS,
    type AccentColor,
    type FinalDocumentLayout,
} from './preferences.settings';
import type { PreferencesStorage } from './preferences.storage';

/** Persists user preferences and exposes them via context. */
export function PreferencesProvider({
    children,
    storage,
}: {
    children: ReactNode;
    storage?: PreferencesStorage;
}) {
    const [preferences, setPreferences] = useState<PreferencesState>(() =>
        resolvePreferencesState(storage?.readSnapshot(), navigator.languages),
    );
    const canPersist = Boolean(storage);
    const [canPersistPreferences, setCanPersistPreferences] = useState(false);
    const hasLocalChangesRef = useRef(false);

    useEffect(() => {
        let cancelled = false;

        if (!storage) {
            return () => {
                cancelled = true;
            };
        }

        void storage
            .load()
            .then((settings) => {
                if (cancelled || hasLocalChangesRef.current) return;
                setPreferences(resolvePreferencesState(settings, navigator.languages));
                setCanPersistPreferences(true);
            })
            .catch(() => {
                if (cancelled || hasLocalChangesRef.current) return;
                setPreferences(resolvePreferencesState(undefined, navigator.languages));
                setCanPersistPreferences(false);
            });

        return () => {
            cancelled = true;
        };
    }, [storage]);

    useLayoutEffect(() => {
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
        if (!storage || !canPersistPreferences) return;
        void storage.save(preferences);
    }, [canPersistPreferences, preferences, storage]);

    const updatePreferences = useCallback(
        (updater: (current: PreferencesState) => PreferencesState) => {
            hasLocalChangesRef.current = true;
            setCanPersistPreferences(canPersist);
            setPreferences((current) => updater(current));
        },
        [canPersist],
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

    const setFinalDocumentLayout = useCallback(
        (finalDocumentLayout: FinalDocumentLayout) => {
            updatePreferences((current) =>
                current.finalDocumentLayout === finalDocumentLayout
                    ? current
                    : { ...current, finalDocumentLayout },
            );
        },
        [updatePreferences],
    );

    const value = useMemo<PreferencesContextValue>(
        () => ({
            isDark: preferences.isDark,
            locale: preferences.locale,
            accent: preferences.accent,
            tutorialSeen: preferences.tutorialSeen,
            finalDocumentLayout: preferences.finalDocumentLayout,
            setLocale,
            toggleTheme,
            setAccent,
            markTutorialSeen,
            setFinalDocumentLayout,
        }),
        [
            preferences.isDark,
            preferences.locale,
            preferences.accent,
            preferences.tutorialSeen,
            preferences.finalDocumentLayout,
            setLocale,
            toggleTheme,
            setAccent,
            markTutorialSeen,
            setFinalDocumentLayout,
        ],
    );

    return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
