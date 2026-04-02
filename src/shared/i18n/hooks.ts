import { useCallback } from 'react';

import { usePreferences } from '@/shared/preferences';
import type { InterpolationValues, PluralBaseKey, TranslationKey } from './resources';
import { resources } from './resources';
import { translate, translatePlural } from './translate';

export function useTranslation() {
    const { locale, setLocale } = usePreferences();
    const dictionary = resources[locale];

    const t = useCallback(
        (key: TranslationKey, values?: InterpolationValues) => translate(dictionary, key, values),
        [dictionary],
    );

    const tp = useCallback(
        (key: PluralBaseKey, count: number, values?: InterpolationValues) =>
            translatePlural(dictionary, key, count, values),
        [dictionary],
    );

    return { locale, setLocale, t, tp };
}
