import { useEffect, useRef, useState } from 'react';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

import type {
    BasicOptimizationPreset,
    ImageOptimizationPreset,
} from '../optimizationConfig';
import {
    JPEG_QUALITY_OPTIONS,
    MAX_PX_OPTIONS,
    OPTIMIZATION_PRESETS,
    TARGET_DPI_OPTIONS,
} from '../optimizationConfig';
import type { ImageFit } from '../domain';
import { useTranslation } from '../i18n';

import { InfoTooltip } from './output-panel/InfoTooltip';
import {
    ImageFitTooltip,
    DpiTooltip,
    JpegTooltip,
    OptimizationTooltip,
    ResizeTooltip,
} from './output-panel/helpContent';
import {
    SegmentButtons,
    SegmentedControl,
    type SegmentOption,
} from './output-panel/SegmentedControl';
import './output-panel/output-panel.css';

interface Props {
    imageFit: ImageFit;
    jpegQuality?: number;
    maxPx?: number;
    targetDpi?: number;
    optimizationPreset: ImageOptimizationPreset;
    onImageFitChange: (v: ImageFit) => void;
    onJpegQualityChange: (v: number | undefined) => void;
    onMaxPxChange: (v: number | undefined) => void;
    onTargetDpiChange: (v: number | undefined) => void;
    onOptimizationPresetChange: (v: BasicOptimizationPreset) => void;
}

const IMAGE_FIT_OPTIONS: SegmentOption<ImageFit>[] = [
    { value: 'contain', label: '' },
    { value: 'fit', label: '' },
    { value: 'cover', label: '' },
];

function buildPresetOptions(
    preset: ImageOptimizationPreset,
    presetLabels: Record<BasicOptimizationPreset, string>,
    customLabel: string,
): SegmentOption<ImageOptimizationPreset>[] {
    const baseOptions: SegmentOption<ImageOptimizationPreset>[] = OPTIMIZATION_PRESETS.map(({ value }) => ({
        value,
        label: presetLabels[value],
    }));
    if (preset !== 'custom') return baseOptions;
    return [...baseOptions, { value: 'custom', label: customLabel, disabled: true }];
}

function encodeOptionalNumberOption(value: number | undefined) {
    return value === undefined ? 'off' : String(value);
}

function decodeOptionalNumberOption(option: string): number | undefined {
    if (option === 'off') return undefined;
    return Number(option);
}

function OptimizationAdvancedPanel({
    jpegQuality,
    maxPx,
    targetDpi,
    onJpegQualityChange,
    onMaxPxChange,
    onTargetDpiChange,
}: {
    jpegQuality?: number;
    maxPx?: number;
    targetDpi?: number;
    onJpegQualityChange: (v: number | undefined) => void;
    onMaxPxChange: (v: number | undefined) => void;
    onTargetDpiChange: (v: number | undefined) => void;
}) {
    const { t } = useTranslation();
    const jpegOptions: SegmentOption<string>[] = JPEG_QUALITY_OPTIONS.map(({ value }) => ({
        value: value === undefined ? 'off' : String(value),
        label: value === undefined ? t('outputPanel.off') : String(value),
    }));
    const targetDpiOptions: SegmentOption<string>[] = TARGET_DPI_OPTIONS.map(({ value }) => ({
        value: value === undefined ? 'off' : String(value),
        label: value === undefined ? t('outputPanel.off') : String(value),
    }));
    const maxLongSideOptions: SegmentOption<string>[] = MAX_PX_OPTIONS.map(({ value }) => ({
        value: value === undefined ? 'off' : String(value),
        label: value === undefined ? t('outputPanel.off') : String(value),
    }));

    return (
        <div className="output-panel-advanced-panel">
            <div className="output-panel-advanced-grid">
                <SegmentedControl
                    label={t('outputPanel.targetDpi')}
                    helpContent={<DpiTooltip />}
                    helpAlign="start"
                    className="output-panel-group-fill"
                    options={targetDpiOptions}
                    value={encodeOptionalNumberOption(targetDpi)}
                    onChange={(value) => onTargetDpiChange(decodeOptionalNumberOption(value))}
                />
                <SegmentedControl
                    label={t('outputPanel.jpegQuality')}
                    helpContent={<JpegTooltip />}
                    helpAlign="center"
                    className="output-panel-group-fill"
                    options={jpegOptions}
                    value={encodeOptionalNumberOption(jpegQuality)}
                    onChange={(value) => onJpegQualityChange(decodeOptionalNumberOption(value))}
                />
                <SegmentedControl
                    label={t('outputPanel.maxLongSide')}
                    helpContent={<ResizeTooltip />}
                    helpAlign="end"
                    className="output-panel-group-fill output-panel-advanced-span"
                    options={maxLongSideOptions}
                    value={encodeOptionalNumberOption(maxPx)}
                    onChange={(value) => onMaxPxChange(decodeOptionalNumberOption(value))}
                />
            </div>
        </div>
    );
}

export function OutputPanel({
    imageFit,
    jpegQuality,
    maxPx,
    targetDpi,
    optimizationPreset,
    onImageFitChange,
    onJpegQualityChange,
    onMaxPxChange,
    onTargetDpiChange,
    onOptimizationPresetChange,
}: Props) {
    const { t } = useTranslation();
    const imageFitOptions: SegmentOption<ImageFit>[] = IMAGE_FIT_OPTIONS.map(({ value }) => ({
        value,
        label: t(`outputPanel.imageFitOptions.${value}`),
    }));
    const presetOptions = buildPresetOptions(
        optimizationPreset,
        {
            original: t('outputPanel.presets.original.label'),
            light: t('outputPanel.presets.light.label'),
            balanced: t('outputPanel.presets.balanced.label'),
            compact: t('outputPanel.presets.compact.label'),
        },
        t('outputPanel.customShort'),
    );
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const advancedRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!isAdvancedOpen) return;

        const handleMouseDown = (event: MouseEvent) => {
            if (!advancedRef.current?.contains(event.target as Node)) {
                setIsAdvancedOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsAdvancedOpen(false);
        };

        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isAdvancedOpen]);

    return (
        <div className="relative z-20 flex items-start gap-6 overflow-visible px-6 py-3">
            <div className="output-panel-group output-panel-optimization">
                <span className="output-panel-label">
                    {t('outputPanel.optimization')}
                    <InfoTooltip label={t('outputPanel.optimization')} align="start">
                        <OptimizationTooltip />
                    </InfoTooltip>
                </span>
                <div ref={advancedRef} className="output-panel-advanced-anchor">
                    <div className="output-panel-advanced-trigger-row">
                        <SegmentButtons
                            className="output-panel-preset-shell"
                            options={presetOptions}
                            value={optimizationPreset}
                            onChange={(value) => {
                                if (value !== 'custom') onOptimizationPresetChange(value);
                            }}
                        />
                        <button
                            type="button"
                            aria-label={t('outputPanel.advancedSettings')}
                            aria-expanded={isAdvancedOpen}
                            onClick={() => setIsAdvancedOpen((current) => !current)}
                            className={[
                                'btn-icon',
                                isAdvancedOpen ? 'btn-icon-active' : '',
                            ].filter(Boolean).join(' ')}
                        >
                            <Cog6ToothIcon className="h-4 w-4" />
                        </button>
                    </div>

                    {isAdvancedOpen ? (
                        <OptimizationAdvancedPanel
                            jpegQuality={jpegQuality}
                            maxPx={maxPx}
                            targetDpi={targetDpi}
                            onJpegQualityChange={onJpegQualityChange}
                            onMaxPxChange={onMaxPxChange}
                            onTargetDpiChange={onTargetDpiChange}
                        />
                    ) : null}
                </div>
            </div>

            <div className="my-0.5 w-px shrink-0 self-stretch bg-ui-border" />

            <SegmentedControl
                label={t('outputPanel.pageFit')}
                helpContent={<ImageFitTooltip />}
                helpAlign="end"
                className="output-panel-page-fit"
                options={imageFitOptions}
                value={imageFit}
                onChange={onImageFitChange}
            />
        </div>
    );
}
