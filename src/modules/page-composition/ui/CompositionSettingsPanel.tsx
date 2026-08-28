import { useId } from 'react';

import { useTranslation } from '@/shared/i18n';
import { ProgressiveDisclosure, ToggleGroup, WorkspaceSettingsPanel } from '@/shared/ui';
import type {
    CompositionCompressionPreset,
    CompositionJpegQuality,
    CompositionLayout,
    CompositionOutputFormat,
} from '../model';
import { CompressionInfo, QualityInfo } from './CompositionSettingsInfo';
import { PRESET_COPY, PRESETS, QUALITIES, QUALITY_LABELS } from './composition-settings.constants';

type SettingsPanelProps = {
    layout: CompositionLayout;
    outputFormat: CompositionOutputFormat;
    preset: CompositionCompressionPreset;
    jpegQuality: CompositionJpegQuality;
    busy: boolean;
    onLayoutChange: (layout: CompositionLayout) => void;
    onOutputFormatChange: (format: CompositionOutputFormat) => void;
    onPresetChange: (preset: CompositionCompressionPreset) => void;
    onJpegQualityChange: (quality: CompositionJpegQuality) => void;
};

function FormatSettings({
    value,
    busy,
    onChange,
}: {
    value: CompositionOutputFormat;
    busy: boolean;
    onChange: (format: CompositionOutputFormat) => void;
}) {
    const { t } = useTranslation();
    const titleId = useId();
    return (
        <section aria-labelledby={titleId}>
            <h3 id={titleId} className="mb-2 text-sm font-semibold text-ui-text">
                {t('pageComposition.settings.format')}
            </h3>
            <ToggleGroup
                ariaLabel={t('pageComposition.settings.format')}
                className="h-10"
                value={value}
                onChange={onChange}
                options={[
                    { value: 'pdf', label: t('pageComposition.settings.pdf'), disabled: busy },
                    { value: 'jpeg', label: t('pageComposition.settings.jpeg'), disabled: busy },
                ]}
            />
        </section>
    );
}

function LayoutSettings({
    value,
    busy,
    onChange,
}: {
    value: CompositionLayout;
    busy: boolean;
    onChange: (layout: CompositionLayout) => void;
}) {
    const { t } = useTranslation();
    const titleId = useId();
    return (
        <section className="mt-6 border-t border-ui-border pt-5" aria-labelledby={titleId}>
            <h3 id={titleId} className="mb-2 text-sm font-semibold text-ui-text">
                {t('pageComposition.settings.layout')}
            </h3>
            <ToggleGroup
                ariaLabel={t('pageComposition.settings.orientation')}
                className="h-10"
                value={value}
                onChange={onChange}
                options={[
                    {
                        value: 'a4-stacked-halves',
                        label: t('pageComposition.settings.vertical'),
                        disabled: busy,
                    },
                    {
                        value: 'a4-side-by-side-halves',
                        label: t('pageComposition.settings.horizontal'),
                        disabled: busy,
                    },
                ]}
            />
        </section>
    );
}

function JpegQualitySettings({
    id,
    value,
    busy,
    onChange,
}: {
    id: string;
    value: CompositionJpegQuality;
    busy: boolean;
    onChange: (quality: CompositionJpegQuality) => void;
}) {
    const { t } = useTranslation();
    return (
        <div className="mt-2 rounded-xl bg-ui-surface-subtle p-4">
            <div className="mb-2 flex items-center gap-1.5">
                <label htmlFor={id} className="text-xs font-semibold text-ui-text-secondary">
                    {t('compression.jpegQuality.label')}
                </label>
                <QualityInfo />
            </div>
            <select
                id={id}
                className="select-base h-9 bg-ui-surface"
                value={value}
                disabled={busy}
                onChange={(event) => onChange(Number(event.target.value) as CompositionJpegQuality)}
            >
                {QUALITIES.map((quality) => (
                    <option key={quality} value={quality}>
                        {t(QUALITY_LABELS[quality], { quality })}
                    </option>
                ))}
            </select>
        </div>
    );
}

function CompressionSettings({
    preset,
    jpegQuality,
    busy,
    onPresetChange,
    onJpegQualityChange,
}: Pick<
    SettingsPanelProps,
    'preset' | 'jpegQuality' | 'busy' | 'onPresetChange' | 'onJpegQualityChange'
>) {
    const { t } = useTranslation();
    const qualityId = useId();
    const titleId = useId();
    return (
        <section className="mt-6 border-t border-ui-border pt-5" aria-labelledby={titleId}>
            <div className="mb-2 flex items-center gap-1.5">
                <h3 id={titleId} className="text-sm font-semibold text-ui-text">
                    {t('compression.presetLabel')}
                </h3>
                <CompressionInfo />
            </div>
            <ToggleGroup
                ariaLabel={t('compression.presetLabel')}
                className="h-10"
                value={preset}
                onChange={onPresetChange}
                options={PRESETS.map((value) => ({
                    value,
                    label: t(PRESET_COPY[value].label),
                    disabled: busy,
                }))}
            />
            <ProgressiveDisclosure
                collapsedLabel={t('compression.advancedOptions')}
                expandedLabel={t('compression.hideAdvancedOptions')}
                disabled={busy}
                contentClassName=""
            >
                <JpegQualitySettings
                    id={qualityId}
                    value={jpegQuality}
                    busy={busy}
                    onChange={onJpegQualityChange}
                />
            </ProgressiveDisclosure>
        </section>
    );
}

export function CompositionSettingsPanel({
    layout,
    outputFormat,
    preset,
    jpegQuality,
    busy,
    onLayoutChange,
    onOutputFormatChange,
    onPresetChange,
    onJpegQualityChange,
}: SettingsPanelProps) {
    const { t } = useTranslation();
    const titleId = useId();

    return (
        <WorkspaceSettingsPanel title={t('pageComposition.settings.title')} titleId={titleId}>
            <FormatSettings value={outputFormat} busy={busy} onChange={onOutputFormatChange} />
            <LayoutSettings value={layout} busy={busy} onChange={onLayoutChange} />
            <CompressionSettings
                preset={preset}
                jpegQuality={jpegQuality}
                busy={busy}
                onPresetChange={onPresetChange}
                onJpegQualityChange={onJpegQualityChange}
            />
        </WorkspaceSettingsPanel>
    );
}
