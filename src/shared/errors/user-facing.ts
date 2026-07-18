import type { InterpolationValues, TranslationKey } from '@/shared/i18n';
import { getErrorMessage, parseAppErrorPayload, toInterpolationValues } from './app-error';

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

export function formatUserFacingError(
    error: unknown,
    t: (k: TranslationKey, v?: InterpolationValues) => string,
): string {
    const payload = parseAppErrorPayload(error);
    if (!payload) return getErrorMessage(error);

    if (isAppErrorCode(payload.code)) {
        return t(APP_ERROR_CODE_TO_I18N_KEY[payload.code], toInterpolationValues(payload.meta));
    }

    return t('errors.unknown');
}
