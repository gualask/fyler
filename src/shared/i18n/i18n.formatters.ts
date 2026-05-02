import type { AppStatusPayload, ImportWarningSkippedFile } from '@/shared/diagnostics';
import type { PageSpecError } from '@/shared/domain';
import type { InterpolationValues, PluralBaseKey, TranslationKey } from './i18n.resources';

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
    _t: Translator,
    tp: PluralTranslator,
): string {
    const reasons = new Set(payload.preview.map((skipped) => skipped.reason));
    if (reasons.size === 1) {
        const [reason] = reasons;
        if (reason === 'unsupported_format') {
            return tp('status.importWarning.unsupportedFormat', payload.skippedCount);
        }
        if (reason === 'read_error') {
            return tp('status.importWarning.readError', payload.skippedCount);
        }
        if (reason === 'path_error') {
            return tp('status.importWarning.pathError', payload.skippedCount);
        }
    }

    return tp('status.importWarning.generic', payload.skippedCount);
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
