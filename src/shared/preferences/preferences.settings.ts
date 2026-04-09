import type { Locale } from './preferences.locale';

export type AccentColor = 'indigo' | 'teal' | 'amber' | 'blue';

export const ACCENT_COLORS: AccentColor[] = ['indigo', 'teal', 'amber', 'blue'];

export interface PreferencesSettings {
    isDark: boolean;
    locale?: Locale;
    accent?: AccentColor;
    tutorialSeen?: boolean;
}
