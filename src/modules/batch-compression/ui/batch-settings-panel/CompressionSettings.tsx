import { useId } from 'react';

import {
    COMPRESSION_PRESET_LABELS,
    COMPRESSION_PRESET_VALUES,
    type CompressionPresetValue,
} from '@/capabilities/compression-profiles';
import { type TranslationKey, useTranslation } from '@/shared/i18n';
import { ToggleGroup } from '@/shared/ui/controls/ToggleGroup';
import { InfoTooltip, InfoTooltipContent } from '@/shared/ui/feedback/tooltip';
import type { BatchCompressionSettings } from '../../model';
import { AdvancedSettings } from './AdvancedSettings';

const PRESET_DESCRIPTIONS = {
    light: {
        description: 'batch.settings.lightDescription',
    },
    balanced: {
        description: 'batch.settings.balancedDescription',
    },
    compact: {
        description: 'batch.settings.compactDescription',
    },
} as const satisfies Record<CompressionPresetValue, { description: TranslationKey }>;

type CompressionSettingsProps = {
    settings: BatchCompressionSettings;
    busy: boolean;
    hasImageSources: boolean;
    onSettingsChange: (settings: BatchCompressionSettings) => void;
};

function ImageFormatSetting({
    settings,
    busy,
    onSettingsChange,
}: Omit<CompressionSettingsProps, 'hasImageSources'>) {
    const { t } = useTranslation();
    const imageFormatId = useId();
    return (
        <div className="mt-5">
            <label htmlFor={imageFormatId} className="text-sm font-semibold text-ui-text">
                {t('batch.settings.imageFormat')}
            </label>
            <select
                id={imageFormatId}
                className="select-base mt-2 h-10 bg-ui-surface"
                value={settings.imageOutputMode}
                disabled={busy}
                onChange={(event) =>
                    onSettingsChange({
                        ...settings,
                        imageOutputMode: event.target
                            .value as BatchCompressionSettings['imageOutputMode'],
                    })
                }
            >
                <option value="convertToJpeg">{t('batch.settings.convertToJpeg')}</option>
                <option value="keepSourceFormat">{t('batch.settings.keepSourceFormat')}</option>
            </select>
        </div>
    );
}

export function CompressionSettings({
    settings,
    busy,
    hasImageSources,
    onSettingsChange,
}: CompressionSettingsProps) {
    const { t } = useTranslation();
    return (
        <div>
            <div className="mb-2 flex items-center gap-1.5">
                <h3 className="text-sm font-semibold text-ui-text">
                    {t('compression.presetLabel')}
                </h3>
                <InfoTooltip label={t('compression.presetLabel')}>
                    <InfoTooltipContent
                        title={t('batch.settings.presetTooltipTitle')}
                        items={COMPRESSION_PRESET_VALUES.map((preset) => ({
                            title: t(COMPRESSION_PRESET_LABELS[preset]),
                            description: t(PRESET_DESCRIPTIONS[preset].description),
                        }))}
                    />
                </InfoTooltip>
            </div>
            <ToggleGroup
                ariaLabel={t('batch.settings.title')}
                className="h-10"
                value={settings.preset}
                onChange={(preset) => onSettingsChange({ ...settings, preset })}
                options={COMPRESSION_PRESET_VALUES.map((preset) => ({
                    value: preset,
                    label: t(COMPRESSION_PRESET_LABELS[preset]),
                    disabled: busy,
                }))}
            />
            {hasImageSources ? (
                <ImageFormatSetting
                    settings={settings}
                    busy={busy}
                    onSettingsChange={onSettingsChange}
                />
            ) : null}
            <AdvancedSettings
                settings={settings}
                busy={busy}
                hasImageSources={hasImageSources}
                onSettingsChange={onSettingsChange}
            />
        </div>
    );
}
