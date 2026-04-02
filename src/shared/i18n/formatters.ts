import type { AppStatusPayload, ImportWarningSkippedFile } from '@/shared/diagnostics';
import type { PageSpecError } from '@/shared/domain/page-spec';
import type { InterpolationValues, PluralBaseKey, TranslationKey } from './resources';

type Translator = (key: TranslationKey, values?: InterpolationValues) => string;
type PluralTranslator = (
    baseKey: PluralBaseKey,
    count: number,
    values?: InterpolationValues,
) => string;

export function formatSkippedFile(skipped: ImportWarningSkippedFile, t: Translator): string {
    const key = `errors.skipped.${skipped.reason}` as TranslationKey;
    return t(key, { name: skipped.name, detail: skipped.detail ?? '' });
}

export function formatImportWarning(
    payload: AppStatusPayload,
    t: Translator,
    tp: PluralTranslator,
): string {
    const preview = payload.preview.map((s) => formatSkippedFile(s, t)).join('; ');
    return tp('status.importWarning', payload.skippedCount, {
        preview,
        suffix: payload.hasMore ? ' ...' : '',
    });
}

export function formatPageSpecError(error: PageSpecError, t: Translator): string {
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
