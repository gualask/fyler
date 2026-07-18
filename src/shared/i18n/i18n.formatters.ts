import type { AppStatusPayload, ImportWarningSkippedFile } from '@/shared/diagnostics';
import type { SkippedFileReason } from '@/shared/domain';
import type { InterpolationValues, PluralBaseKey, TranslationKey } from './i18n.resources';

type Translator = (key: TranslationKey, values?: InterpolationValues) => string;
type PluralTranslator = (
    baseKey: PluralBaseKey,
    count: number,
    values?: InterpolationValues,
) => string;

const SKIPPED_FILE_ERROR_KEYS = {
    unsupported_format: 'errors.skipped.unsupported_format',
    read_error: 'errors.skipped.read_error',
    path_error: 'errors.skipped.path_error',
} as const satisfies Record<SkippedFileReason, TranslationKey>;

const IMPORT_WARNING_KEYS = {
    unsupported_format: 'status.importWarning.unsupportedFormat',
    read_error: 'status.importWarning.readError',
    path_error: 'status.importWarning.pathError',
} as const satisfies Record<SkippedFileReason, PluralBaseKey>;

function isSkippedFileReason(reason: string): reason is SkippedFileReason {
    return Object.hasOwn(SKIPPED_FILE_ERROR_KEYS, reason);
}

export function formatSkippedFile(skipped: ImportWarningSkippedFile, t: Translator): string {
    const key = isSkippedFileReason(skipped.reason)
        ? SKIPPED_FILE_ERROR_KEYS[skipped.reason]
        : 'errors.unknown';
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
        if (reason && isSkippedFileReason(reason)) {
            return tp(IMPORT_WARNING_KEYS[reason], payload.skippedCount);
        }
    }

    return tp('status.importWarning.generic', payload.skippedCount);
}
