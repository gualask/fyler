import type { ImageFit } from '@/domain';
import {
    JPEG_QUALITY_OPTIONS,
    OPTIMIZATION_PRESETS,
    TARGET_DPI_OPTIONS,
} from '@/domain/optimization-config';
import { useTranslation } from '@/i18n';

import { TooltipContent, type TooltipItem } from './InfoTooltip';

function FitPreview({ mode }: { mode: ImageFit }) {
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
                title: t(`outputPanel.presets.${value}.label`),
                description: t(`outputPanel.presets.${value}.description`),
            }))}
        />
    );
}

export function JpegTooltip() {
    const { t } = useTranslation();

    return (
        <TooltipContent
            title={t('tooltips.jpegTitle')}
            items={JPEG_QUALITY_OPTIONS.map(({ value }) => {
                const key: 'off' | '95' | '90' | '85' =
                    value === undefined ? 'off' : (String(value) as '95' | '90' | '85');
                return {
                    title: value === undefined ? t('outputPanel.auto') : String(value),
                    description: t(`tooltips.jpegDescriptions.${key}`),
                };
            })}
        />
    );
}

export function DpiTooltip() {
    const { t } = useTranslation();

    return (
        <TooltipContent
            title={t('tooltips.dpiTitle')}
            items={TARGET_DPI_OPTIONS.map(({ value }) => {
                const key: 'off' | '220' | '170' | '120' =
                    value === undefined ? 'off' : (String(value) as '220' | '170' | '120');
                return {
                    title: value === undefined ? t('outputPanel.off') : `${value} DPI`,
                    description: t(`tooltips.dpiDescriptions.${key}`),
                };
            })}
        />
    );
}

export function ImageFitTooltip() {
    const { t } = useTranslation();
    const imageFitTooltipItems: TooltipItem[] = (['contain', 'fit', 'cover'] as ImageFit[]).map(
        (mode) => ({
            title: t(`tooltips.imageFitItems.${mode}.title`),
            description: t(`tooltips.imageFitItems.${mode}.description`),
            visual: <FitPreview mode={mode} />,
        }),
    );

    return <TooltipContent title={t('tooltips.imageFitTitle')} items={imageFitTooltipItems} />;
}
