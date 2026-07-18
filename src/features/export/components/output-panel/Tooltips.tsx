import type { ImageFit } from '@/shared/domain';
import { useTranslation } from '@/shared/i18n';
import {
    JPEG_QUALITY_OPTIONS,
    OPTIMIZATION_PRESETS,
    TARGET_DPI_OPTIONS,
} from '../../optimization-presets';

import { TooltipContent } from './InfoTooltip';
import {
    JPEG_QUALITY_DESCRIPTION_KEYS,
    OPTIMIZATION_PRESET_TRANSLATION_KEYS,
    TARGET_DPI_DESCRIPTION_KEYS,
} from './output-panel.options';

export function FitPreview({ mode }: { mode: ImageFit }) {
    return (
        <span className={`fit-preview fit-preview-${mode}`} aria-hidden="true">
            <span className="fit-preview-overflow" />
            <span className="fit-preview-page">
                <span className="fit-preview-media" />
            </span>
        </span>
    );
}

export function OptimizationTooltip() {
    const { t } = useTranslation();

    return (
        <TooltipContent
            title={t('tooltips.optimizationTitle')}
            items={OPTIMIZATION_PRESETS.map(({ value }) => ({
                title: t(OPTIMIZATION_PRESET_TRANSLATION_KEYS[value].label),
                description: t(OPTIMIZATION_PRESET_TRANSLATION_KEYS[value].description),
            }))}
        />
    );
}

export function JpegTooltip() {
    const { t } = useTranslation();

    return (
        <TooltipContent
            title={t('tooltips.jpegTitle')}
            items={JPEG_QUALITY_OPTIONS.map(({ id, value }) => ({
                title: value === undefined ? t('outputPanel.auto') : String(value),
                description: t(JPEG_QUALITY_DESCRIPTION_KEYS[id]),
            }))}
        />
    );
}

export function DpiTooltip() {
    const { t } = useTranslation();

    return (
        <TooltipContent
            title={t('tooltips.dpiTitle')}
            items={TARGET_DPI_OPTIONS.map(({ id, value }) => ({
                title: value === undefined ? t('outputPanel.off') : `${value} DPI`,
                description: t(TARGET_DPI_DESCRIPTION_KEYS[id]),
            }))}
        />
    );
}
