import type { SkippedFileReason } from '@/shared/domain';
import { getErrorMessage, parseAppErrorPayload, toInterpolationValues } from '@/shared/errors';
import type { InterpolationValues, PluralBaseKey, TranslationKey } from '@/shared/i18n';

import type { AppStatusPayload } from './app-events.types';

type Translator = (key: TranslationKey, values?: InterpolationValues) => string;
type PluralTranslator = (
    baseKey: PluralBaseKey,
    count: number,
    values?: InterpolationValues,
) => string;

const IMPORT_WARNING_KEYS = {
    unsupported_format: 'status.importWarning.unsupportedFormat',
    read_error: 'status.importWarning.readError',
    path_error: 'status.importWarning.pathError',
} as const satisfies Record<SkippedFileReason, PluralBaseKey>;

function isSkippedFileReason(reason: string): reason is SkippedFileReason {
    return Object.hasOwn(IMPORT_WARNING_KEYS, reason);
}

export function formatImportWarning(payload: AppStatusPayload, tp: PluralTranslator): string {
    const reasons = new Set(payload.preview.map((skipped) => skipped.reason));
    if (reasons.size === 1) {
        const [reason] = reasons;
        if (reason && isSkippedFileReason(reason)) {
            return tp(IMPORT_WARNING_KEYS[reason], payload.skippedCount);
        }
    }

    return tp('status.importWarning.generic', payload.skippedCount);
}

const APP_ERROR_CODE_TO_I18N_KEY = {
    page_out_of_range: 'errors.page_out_of_range',
    source_not_found: 'errors.source_not_found',
    open_pdf_failed: 'errors.open_pdf_failed',
    password_required_pdf: 'errors.password_required_pdf',
    invalid_pdf_password: 'errors.invalid_pdf_password',
    no_documents_to_merge: 'errors.no_documents_to_merge',
    page_missing_mediabox: 'errors.page_missing_mediabox',
    invalid_export_item_kind: 'errors.invalid_export_item_kind',
    external_url_not_allowed: 'errors.external_url_not_allowed',
    output_path_not_authorized: 'errors.output_path_not_authorized',
} as const satisfies Record<string, TranslationKey>;

type AppErrorCode = keyof typeof APP_ERROR_CODE_TO_I18N_KEY;

function isAppErrorCode(code: string): code is AppErrorCode {
    return Object.hasOwn(APP_ERROR_CODE_TO_I18N_KEY, code);
}

export function formatUserFacingError(error: unknown, t: Translator): string {
    const payload = parseAppErrorPayload(error);
    if (!payload) return getErrorMessage(error);

    if (isAppErrorCode(payload.code)) {
        return t(APP_ERROR_CODE_TO_I18N_KEY[payload.code], toInterpolationValues(payload.meta));
    }

    return t('errors.unknown');
}
