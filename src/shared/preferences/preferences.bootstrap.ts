import { detectPreferredLocale, isLocale, type Locale } from './preferences.locale';
import {
    type AccentColor,
    DEFAULT_ACCENT_COLOR,
    DEFAULT_FINAL_DOCUMENT_LAYOUT,
    type FinalDocumentLayout,
    isAccentColor,
    isFinalDocumentLayout,
    type PreferencesSettings,
} from './preferences.settings';

export type PreferencesState = {
    isDark: boolean;
    locale: Locale;
    accent: AccentColor;
    tutorialSeen: boolean;
    finalDocumentLayout: FinalDocumentLayout;
};

export type PreferencesField = keyof PreferencesState;

export function resolvePreferencesState(
    settings: PreferencesSettings | null | undefined,
    languages: readonly string[] | undefined,
): PreferencesState {
    return {
        isDark: settings?.isDark ?? false,
        locale: isLocale(settings?.locale) ? settings.locale : detectPreferredLocale(languages),
        accent: isAccentColor(settings?.accent) ? settings.accent : DEFAULT_ACCENT_COLOR,
        tutorialSeen: settings?.tutorialSeen ?? false,
        finalDocumentLayout: isFinalDocumentLayout(settings?.finalDocumentLayout)
            ? settings.finalDocumentLayout
            : DEFAULT_FINAL_DOCUMENT_LAYOUT,
    };
}

export function mergeHydratedPreferences({
    current,
    loaded,
    dirtyFields,
}: {
    current: PreferencesState;
    loaded: PreferencesState;
    dirtyFields: ReadonlySet<PreferencesField>;
}): PreferencesState {
    return {
        isDark: dirtyFields.has('isDark') ? current.isDark : loaded.isDark,
        locale: dirtyFields.has('locale') ? current.locale : loaded.locale,
        accent: dirtyFields.has('accent') ? current.accent : loaded.accent,
        tutorialSeen: dirtyFields.has('tutorialSeen') ? current.tutorialSeen : loaded.tutorialSeen,
        finalDocumentLayout: dirtyFields.has('finalDocumentLayout')
            ? current.finalDocumentLayout
            : loaded.finalDocumentLayout,
    };
}
