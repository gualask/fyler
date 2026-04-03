export const SUPPORTED_LOCALES = ['it', 'en'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export function isLocale(value: unknown): value is Locale {
    return typeof value === 'string' && SUPPORTED_LOCALES.includes(value as Locale);
}

export function detectPreferredLocale(languages: readonly string[] | undefined): Locale {
    for (const language of languages ?? []) {
        const normalized = language.toLowerCase();
        if (normalized.startsWith('it')) return 'it';
        if (normalized.startsWith('en')) return 'en';
    }

    return 'en';
}
