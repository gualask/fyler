export { usePreferences } from './preferences.context';
export {
    detectPreferredLocale,
    isLocale,
    type Locale,
    SUPPORTED_LOCALES,
} from './preferences.locale';
export { PreferencesProvider } from './preferences.provider';
export {
    ACCENT_COLORS,
    type AccentColor,
    DEFAULT_FINAL_DOCUMENT_LAYOUT,
    DEFAULT_ACCENT_COLOR,
    FINAL_DOCUMENT_LAYOUTS,
    type FinalDocumentLayout,
    isAccentColor,
    isFinalDocumentLayout,
    type PreferencesSettings,
} from './preferences.settings';
export type { PreferencesStorage } from './preferences.storage';
export { useTheme } from './theme.hook';
