import { useCallback } from 'react';

import { useAppPreferences } from './context';
import type { InterpolationValues, PluralBaseKey, TranslationKey } from './resources';
import { resources } from './resources';
import { translate, translatePlural } from './translate';

export function useTheme() {
    const { isDark, toggleTheme, accent, setAccent } = useAppPreferences();
    return { isDark, toggleTheme, accent, setAccent };
}

export function useTranslation() {
    const { locale, setLocale } = useAppPreferences();
    const dictionary = resources[locale];

    const t = useCallback((
        key: TranslationKey,
        values?: InterpolationValues,
    ) => translate(dictionary, key, values), [dictionary]);

    const tp = useCallback((
        key: PluralBaseKey,
        count: number,
        values?: InterpolationValues,
    ) => translatePlural(dictionary, key, count, values), [dictionary]);

    return { locale, setLocale, t, tp };
}
