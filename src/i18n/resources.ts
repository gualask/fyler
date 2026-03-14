import enMessages from './messages/en.json';
import itMessages from './messages/it.json';
import type { Locale } from '../locale';

export type TranslationDictionary = typeof itMessages;
export type TranslationKey = keyof TranslationDictionary;
export type InterpolationValues = Record<string, string | number>;
export type PluralKey = Extract<TranslationKey, `${string}.one`>;
export type PluralBaseKey = PluralKey extends `${infer Base}.one` ? Base : never;

export const resources: Record<Locale, TranslationDictionary> = {
    it: itMessages,
    en: enMessages,
};
