import type { InterpolationValues, TranslationKey } from '@/i18n';
import { getErrorMessage, parseAppErrorPayload, toInterpolationValues } from './app-error';

const APP_ERROR_CODE_TO_I18N_KEY: Record<string, TranslationKey> = {
    page_out_of_range: 'errors.page_out_of_range',
    source_not_found: 'errors.source_not_found',
    open_pdf_failed: 'errors.open_pdf_failed',
    no_documents_to_merge: 'errors.no_documents_to_merge',
    invalid_rotation: 'errors.invalid_rotation',
    page_missing_mediabox: 'errors.page_missing_mediabox',
};

export function formatUserFacingError(
    error: unknown,
    t: (k: TranslationKey, v?: InterpolationValues) => string,
): string {
    const payload = parseAppErrorPayload(error);
    if (!payload) return getErrorMessage(error);

    const key = APP_ERROR_CODE_TO_I18N_KEY[payload.code];
    if (key) {
        return t(key, toInterpolationValues(payload.meta));
    }

    return t('errors.unknown');
}
