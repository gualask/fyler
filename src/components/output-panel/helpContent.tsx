import {
    JPEG_QUALITY_OPTIONS,
    MAX_PX_OPTIONS,
    OPTIMIZATION_PRESETS,
} from '../../optimizationConfig';
import type { ImageFit } from '../../domain';
import { useTranslation } from '../../i18n';

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

function ResizeGuidePreview() {
    const { t } = useTranslation();

    return (
        <span className="resize-guide" aria-hidden="true">
            <span className="resize-guide-label">{t('tooltips.resizeGuideLabel')}</span>
            <span className="resize-guide-rule" />
            <span className="resize-guide-cap resize-guide-cap-start" />
            <span className="resize-guide-cap resize-guide-cap-end" />
            <span className="resize-guide-frame">
                <span className="resize-guide-photo" />
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
                const key: 'off' | '95' | '90' | '85' = value === undefined
                    ? 'off'
                    : (String(value) as '95' | '90' | '85');
                return {
                    title: value === undefined ? t('outputPanel.off') : String(value),
                    description: t(`tooltips.jpegDescriptions.${key}`),
                };
            })}
        />
    );
}

export function ResizeTooltip() {
    const { t } = useTranslation();

    return (
        <TooltipContent
            title={t('tooltips.resizeTitle')}
            leadVisual={<ResizeGuidePreview />}
            items={MAX_PX_OPTIONS.map(({ value }) => {
                const key: 'off' | '2500' | '2000' | '1500' = value === undefined
                    ? 'off'
                    : (String(value) as '2500' | '2000' | '1500');
                return {
                    title: value === undefined ? t('outputPanel.off') : `${value}px`,
                    description: t(`tooltips.resizeDescriptions.${key}`),
                };
            })}
        />
    );
}

export function ImageFitTooltip() {
    const { t } = useTranslation();
    const imageFitTooltipItems: TooltipItem[] = (['contain', 'fit', 'cover'] as ImageFit[]).map((mode) => ({
        title: t(`tooltips.imageFitItems.${mode}.title`),
        description: t(`tooltips.imageFitItems.${mode}.description`),
        visual: <FitPreview mode={mode} />,
    }));

    return (
        <TooltipContent
            title={t('tooltips.imageFitTitle')}
            items={imageFitTooltipItems}
        />
    );
}
