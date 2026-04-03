import type {
    InterpolationValues,
    PluralBaseKey,
    TranslationDictionary,
    TranslationKey,
} from './i18n.resources';

function interpolate(template: string, values?: InterpolationValues): string {
    if (!values) return template;

    return template.replace(/\{(\w+)\}/g, (_, token: string) => {
        const value = values[token];
        return value === undefined ? `{${token}}` : String(value);
    });
}

export function translate(
    messages: TranslationDictionary,
    key: TranslationKey,
    values?: InterpolationValues,
): string {
    return interpolate(messages[key], values);
}

export function translatePlural(
    messages: TranslationDictionary,
    baseKey: PluralBaseKey,
    count: number,
    values?: InterpolationValues,
): string {
    const suffix = count === 1 ? 'one' : 'other';
    return translate(messages, `${baseKey}.${suffix}` as TranslationKey, { ...values, count });
}
