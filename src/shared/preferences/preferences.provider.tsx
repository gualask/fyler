import {
    type ReactNode,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    mergeHydratedPreferences,
    type PreferencesField,
    type PreferencesState,
    resolvePreferencesState,
} from './preferences.bootstrap';
import { PreferencesContext, type PreferencesContextValue } from './preferences.context';
import type { Locale } from './preferences.locale';
import {
    ACCENT_COLORS,
    type AccentColor,
    type FinalDocumentLayout,
    type PreferencesSettings,
} from './preferences.settings';
import type { PreferencesStorage } from './preferences.storage';

type UpdatePreferences = (
    field: PreferencesField,
    updater: (current: PreferencesState) => PreferencesState,
) => void;

type PreferencesActions = Pick<
    PreferencesContextValue,
    'setLocale' | 'toggleTheme' | 'setAccent' | 'markTutorialSeen' | 'setFinalDocumentLayout'
>;

function takeDirtyFields(fields: Set<PreferencesField>): Set<PreferencesField> {
    const dirtyFields = new Set(fields);
    fields.clear();
    return dirtyFields;
}

function useDocumentPreferences(preferences: PreferencesState) {
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
}

function usePersistPreferences(
    storage: PreferencesStorage | undefined,
    canPersistPreferences: boolean,
    preferences: PreferencesState,
) {
    useEffect(() => {
        if (!storage || !canPersistPreferences) return;
        void storage.save(preferences);
    }, [canPersistPreferences, preferences, storage]);
}

function usePreferenceActions(updatePreferences: UpdatePreferences): PreferencesActions {
    const setLocale = useCallback(
        (locale: Locale) => {
            updatePreferences('locale', (current) =>
                current.locale === locale ? current : { ...current, locale },
            );
        },
        [updatePreferences],
    );

    const toggleTheme = useCallback(() => {
        updatePreferences('isDark', (current) => ({ ...current, isDark: !current.isDark }));
    }, [updatePreferences]);

    const setAccent = useCallback(
        (accent: AccentColor) => {
            updatePreferences('accent', (current) =>
                current.accent === accent ? current : { ...current, accent },
            );
        },
        [updatePreferences],
    );

    const markTutorialSeen = useCallback(() => {
        updatePreferences('tutorialSeen', (current) =>
            current.tutorialSeen ? current : { ...current, tutorialSeen: true },
        );
    }, [updatePreferences]);

    const setFinalDocumentLayout = useCallback(
        (finalDocumentLayout: FinalDocumentLayout) => {
            updatePreferences('finalDocumentLayout', (current) =>
                current.finalDocumentLayout === finalDocumentLayout
                    ? current
                    : { ...current, finalDocumentLayout },
            );
        },
        [updatePreferences],
    );

    return useMemo(
        () => ({
            setLocale,
            toggleTheme,
            setAccent,
            markTutorialSeen,
            setFinalDocumentLayout,
        }),
        [markTutorialSeen, setAccent, setFinalDocumentLayout, setLocale, toggleTheme],
    );
}

function usePreferencesContextValue(
    preferences: PreferencesState,
    actions: PreferencesActions,
): PreferencesContextValue {
    return useMemo(
        () => ({
            isDark: preferences.isDark,
            locale: preferences.locale,
            accent: preferences.accent,
            tutorialSeen: preferences.tutorialSeen,
            finalDocumentLayout: preferences.finalDocumentLayout,
            ...actions,
        }),
        [
            actions,
            preferences.isDark,
            preferences.locale,
            preferences.accent,
            preferences.tutorialSeen,
            preferences.finalDocumentLayout,
        ],
    );
}

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
    const initialLoadSettledRef = useRef(false);
    const dirtyFieldsBeforeLoadRef = useRef<Set<PreferencesField>>(new Set());

    const settleInitialLoad = useCallback(() => {
        initialLoadSettledRef.current = true;
        return takeDirtyFields(dirtyFieldsBeforeLoadRef.current);
    }, []);

    const applyLoadedPreferences = useCallback(
        (settings: PreferencesSettings) => {
            const loaded = resolvePreferencesState(settings, navigator.languages);
            const dirtyFields = settleInitialLoad();
            setPreferences((current) => mergeHydratedPreferences({ current, loaded, dirtyFields }));
            setCanPersistPreferences(true);
        },
        [settleInitialLoad],
    );

    const applyLoadFailure = useCallback(() => {
        const dirtyFields = settleInitialLoad();
        if (dirtyFields.size > 0) {
            setCanPersistPreferences(canPersist);
            return;
        }

        setPreferences(resolvePreferencesState(undefined, navigator.languages));
        setCanPersistPreferences(false);
    }, [canPersist, settleInitialLoad]);

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
                if (cancelled) return;
                applyLoadedPreferences(settings);
            })
            .catch(() => {
                if (cancelled) return;
                applyLoadFailure();
            });

        return () => {
            cancelled = true;
        };
    }, [applyLoadFailure, applyLoadedPreferences, storage]);

    useDocumentPreferences(preferences);
    usePersistPreferences(storage, canPersistPreferences, preferences);

    const updatePreferences = useCallback<UpdatePreferences>(
        (field, updater) => {
            if (initialLoadSettledRef.current) {
                setCanPersistPreferences(canPersist);
            }
            setPreferences((current) => {
                const next = updater(current);
                if (next !== current && !initialLoadSettledRef.current) {
                    dirtyFieldsBeforeLoadRef.current.add(field);
                }
                return next;
            });
        },
        [canPersist],
    );

    const actions = usePreferenceActions(updatePreferences);
    const value = usePreferencesContextValue(preferences, actions);

    return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
