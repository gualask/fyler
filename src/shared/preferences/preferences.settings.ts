import type { Locale } from './preferences.locale';

export type AccentColor = 'indigo' | 'teal' | 'amber' | 'blue';

export const ACCENT_COLORS: AccentColor[] = ['indigo', 'teal', 'amber', 'blue'];
export const DEFAULT_ACCENT_COLOR: AccentColor = 'indigo';

export function isAccentColor(value: unknown): value is AccentColor {
    return typeof value === 'string' && ACCENT_COLORS.includes(value as AccentColor);
}

export interface PreferencesSettings {
    isDark: boolean;
    locale?: Locale;
    accent?: AccentColor;
    tutorialSeen?: boolean;
}
