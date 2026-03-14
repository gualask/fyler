import type { AppStatusPayload } from '../appEvents';
import type { PageSpecError } from '../pageSpec';
import type { InterpolationValues, PluralBaseKey, TranslationKey } from './resources';

type Translator = (key: TranslationKey, values?: InterpolationValues) => string;
type PluralTranslator = (baseKey: PluralBaseKey, count: number, values?: InterpolationValues) => string;

export function formatImportWarning(
    payload: AppStatusPayload,
    tp: PluralTranslator,
): string {
    return tp('status.importWarning', payload.skippedCount, {
        preview: payload.preview.join('; '),
        suffix: payload.hasMore ? ' ...' : '',
    });
}

export function formatPageSpecError(
    error: PageSpecError,
    t: Translator,
): string {
    switch (error.kind) {
        case 'empty-token':
            return t('pageSpec.emptyToken');
        case 'invalid-token':
            return t('pageSpec.invalidToken', { token: error.token });
        case 'non-positive-page':
            return t('pageSpec.pageMustBeGreaterThanZero');
        case 'reversed-range':
            return t('pageSpec.reversedRange', { start: error.start, end: error.end });
        case 'out-of-range':
            return t('pageSpec.outOfRange', { page: error.page, total: error.total });
    }
}
