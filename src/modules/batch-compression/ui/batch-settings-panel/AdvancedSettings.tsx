import { useId } from 'react';

import {
    JPEG_QUALITY_DESCRIPTIONS,
    JPEG_QUALITY_LABELS,
    JPEG_QUALITY_VALUES,
    type JpegQualityValue,
} from '@/capabilities/compression-profiles';
import { useTranslation } from '@/shared/i18n';
import { ProgressiveDisclosure } from '@/shared/ui';
import { InfoTooltip, InfoTooltipContent } from '@/shared/ui/feedback/tooltip';
import type { BatchCompressionSettings } from '../../model';

function rgbToHex([red, green, blue]: [number, number, number]): string {
    return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function hexToRgb(value: string): [number, number, number] {
    return [1, 3, 5].map((index) => Number.parseInt(value.slice(index, index + 2), 16)) as [
        number,
        number,
        number,
    ];
}

function JpegQualitySetting({
    settings,
    busy,
    onSettingsChange,
}: {
    settings: BatchCompressionSettings;
    busy: boolean;
    onSettingsChange: (settings: BatchCompressionSettings) => void;
}) {
    const { t } = useTranslation();
    const qualityId = useId();
    return (
        <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-ui-text-secondary">
                <label htmlFor={qualityId}>{t('compression.jpegQuality.label')}</label>
                <InfoTooltip label={t('compression.jpegQuality.label')}>
                    <InfoTooltipContent
                        title={t('compression.jpegQuality.tooltipTitle')}
                        items={JPEG_QUALITY_VALUES.map((quality) => ({
                            title: t(JPEG_QUALITY_LABELS[quality], { quality }),
                            description: t(JPEG_QUALITY_DESCRIPTIONS[quality]),
                        }))}
                    />
                </InfoTooltip>
            </div>
            <select
                id={qualityId}
                className="select-base h-9 w-[8.5rem] shrink-0 bg-ui-surface"
                value={settings.jpegQuality}
                disabled={busy}
                onChange={(event) =>
                    onSettingsChange({
                        ...settings,
                        jpegQuality: Number(event.target.value) as JpegQualityValue,
                    })
                }
            >
                {JPEG_QUALITY_VALUES.map((quality) => (
                    <option key={quality} value={quality}>
                        {t(JPEG_QUALITY_LABELS[quality], { quality })}
                    </option>
                ))}
            </select>
        </div>
    );
}

export function AdvancedSettings({
    settings,
    busy,
    hasImageSources,
    onSettingsChange,
}: {
    settings: BatchCompressionSettings;
    busy: boolean;
    hasImageSources: boolean;
    onSettingsChange: (settings: BatchCompressionSettings) => void;
}) {
    const { t } = useTranslation();
    return (
        <ProgressiveDisclosure
            collapsedLabel={t('compression.advancedOptions')}
            expandedLabel={t('compression.hideAdvancedOptions')}
            disabled={busy}
            contentClassName="mt-2 space-y-4 rounded-xl bg-ui-surface-subtle p-4"
        >
            <JpegQualitySetting
                settings={settings}
                busy={busy}
                onSettingsChange={onSettingsChange}
            />
            {hasImageSources && settings.imageOutputMode === 'convertToJpeg' ? (
                <label className="flex items-center justify-between gap-3 text-xs font-semibold text-ui-text-secondary">
                    {t('batch.settings.background')}
                    <input
                        type="color"
                        className="h-9 w-12 cursor-pointer rounded-lg border border-ui-border bg-ui-surface p-1"
                        value={rgbToHex(settings.jpegBackground)}
                        disabled={busy}
                        onChange={(event) =>
                            onSettingsChange({
                                ...settings,
                                jpegBackground: hexToRgb(event.target.value),
                            })
                        }
                    />
                </label>
            ) : null}
        </ProgressiveDisclosure>
    );
}
