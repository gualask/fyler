import type { AppStatusPayload, ImportWarningSkippedFile } from '@/shared/diagnostics';
import type { InterpolationValues, PluralBaseKey, TranslationKey } from './i18n.resources';

type Translator = (key: TranslationKey, values?: InterpolationValues) => string;
type PluralTranslator = (
    baseKey: PluralBaseKey,
    count: number,
    values?: InterpolationValues,
) => string;

export function formatSkippedFile(skipped: ImportWarningSkippedFile, t: Translator): string {
    let key: TranslationKey;
    switch (skipped.reason) {
        case 'unsupported_format':
            key = 'errors.skipped.unsupported_format';
            break;
        case 'read_error':
            key = 'errors.skipped.read_error';
            break;
        case 'path_error':
            key = 'errors.skipped.path_error';
            break;
        default:
            key = 'errors.unknown';
    }
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
