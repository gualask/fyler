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
