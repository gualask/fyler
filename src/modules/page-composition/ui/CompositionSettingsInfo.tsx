import { useTranslation } from '@/shared/i18n';
import { InfoTooltip, InfoTooltipContent } from '@/shared/ui/feedback/tooltip';
import {
    PRESET_COPY,
    PRESETS,
    QUALITIES,
    QUALITY_DESCRIPTIONS,
    QUALITY_LABELS,
} from './composition-settings.constants';

export function CompressionInfo() {
    const { t } = useTranslation();
    const label = t('compression.presetLabel');
    return (
        <InfoTooltip label={label}>
            <InfoTooltipContent
                title={t('pageComposition.settings.presetTooltipTitle')}
                items={PRESETS.map((preset) => ({
                    title: t(PRESET_COPY[preset].label),
                    description: t(PRESET_COPY[preset].description),
                }))}
            />
        </InfoTooltip>
    );
}

export function QualityInfo() {
    const { t } = useTranslation();
    const label = t('compression.jpegQuality.label');
    return (
        <InfoTooltip label={label}>
            <InfoTooltipContent
                title={t('compression.jpegQuality.tooltipTitle')}
                items={QUALITIES.map((quality) => ({
                    title: t(QUALITY_LABELS[quality], { quality }),
                    description: t(QUALITY_DESCRIPTIONS[quality]),
                }))}
            />
        </InfoTooltip>
    );
}
