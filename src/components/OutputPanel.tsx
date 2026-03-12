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
} from '../optimizationConfig';
import type { ImageFit } from '../domain';

import { InfoTooltip } from './output-panel/InfoTooltip';
import {
    ImageFitTooltip,
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
    optimizationPreset: ImageOptimizationPreset;
    onImageFitChange: (v: ImageFit) => void;
    onJpegQualityChange: (v: number | undefined) => void;
    onMaxPxChange: (v: number | undefined) => void;
    onOptimizationPresetChange: (v: BasicOptimizationPreset) => void;
}

const IMAGE_FIT_OPTIONS: SegmentOption<ImageFit>[] = [
    { value: 'contain', label: 'Contieni' },
    { value: 'fit', label: 'Adatta' },
    { value: 'cover', label: 'Ritaglia' },
];

const BASIC_PRESET_OPTIONS: SegmentOption<BasicOptimizationPreset>[] = OPTIMIZATION_PRESETS.map(
    ({ value, label }) => ({ value, label }),
);
const JPEG_OPTIONS: SegmentOption<string>[] = JPEG_QUALITY_OPTIONS.map(({ value, label }) => ({
    value: value === undefined ? 'off' : String(value),
    label,
}));
const MAX_LONG_SIDE_OPTIONS: SegmentOption<string>[] = MAX_PX_OPTIONS.map(({ value, label }) => ({
    value: value === undefined ? 'off' : String(value),
    label,
}));

function buildPresetOptions(preset: ImageOptimizationPreset): SegmentOption<ImageOptimizationPreset>[] {
    if (preset !== 'custom') return BASIC_PRESET_OPTIONS;
    return [...BASIC_PRESET_OPTIONS, { value: 'custom', label: 'Personal.', disabled: true }];
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
    onJpegQualityChange,
    onMaxPxChange,
}: {
    jpegQuality?: number;
    maxPx?: number;
    onJpegQualityChange: (v: number | undefined) => void;
    onMaxPxChange: (v: number | undefined) => void;
}) {
    return (
        <div className="output-panel-advanced-panel">
            <div className="output-panel-advanced-grid">
                <SegmentedControl
                    label="Qualita JPEG"
                    helpContent={<JpegTooltip />}
                    helpAlign="start"
                    className="output-panel-group-fill"
                    options={JPEG_OPTIONS}
                    value={encodeOptionalNumberOption(jpegQuality)}
                    onChange={(value) => onJpegQualityChange(decodeOptionalNumberOption(value))}
                />
                <SegmentedControl
                    label="Lato lungo max"
                    helpContent={<ResizeTooltip />}
                    helpAlign="end"
                    className="output-panel-group-fill"
                    options={MAX_LONG_SIDE_OPTIONS}
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
    optimizationPreset,
    onImageFitChange,
    onJpegQualityChange,
    onMaxPxChange,
    onOptimizationPresetChange,
}: Props) {
    const presetOptions = buildPresetOptions(optimizationPreset);
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
                    Ottimizzazione
                    <InfoTooltip label="Ottimizzazione" align="start">
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
                            aria-label="Apri impostazioni avanzate"
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
                            onJpegQualityChange={onJpegQualityChange}
                            onMaxPxChange={onMaxPxChange}
                        />
                    ) : null}
                </div>
            </div>

            <div className="my-0.5 w-px shrink-0 self-stretch bg-ui-border" />

            <SegmentedControl
                label="Adattamento pagina"
                helpContent={<ImageFitTooltip />}
                helpAlign="end"
                className="shrink-0"
                options={IMAGE_FIT_OPTIONS}
                value={imageFit}
                onChange={onImageFitChange}
            />
        </div>
    );
}
