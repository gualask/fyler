import type { Locale } from './preferences.locale';

export type AccentColor = 'indigo' | 'teal' | 'amber' | 'blue';
export type FinalDocumentLayout = 'columns-2' | 'columns-1';

export const ACCENT_COLORS: AccentColor[] = ['indigo', 'teal', 'amber', 'blue'];
export const DEFAULT_ACCENT_COLOR: AccentColor = 'indigo';
export const FINAL_DOCUMENT_LAYOUTS: FinalDocumentLayout[] = ['columns-2', 'columns-1'];
export const DEFAULT_FINAL_DOCUMENT_LAYOUT: FinalDocumentLayout = 'columns-2';

export function isAccentColor(value: unknown): value is AccentColor {
    return typeof value === 'string' && ACCENT_COLORS.includes(value as AccentColor);
}

export function isFinalDocumentLayout(value: unknown): value is FinalDocumentLayout {
    return (
        typeof value === 'string' &&
        FINAL_DOCUMENT_LAYOUTS.includes(value as FinalDocumentLayout)
    );
}

export interface PreferencesSettings {
    isDark: boolean;
    locale?: Locale;
    accent?: AccentColor;
    tutorialSeen?: boolean;
    finalDocumentLayout?: FinalDocumentLayout;
}
