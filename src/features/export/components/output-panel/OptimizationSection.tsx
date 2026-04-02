import { IconSettings } from '@tabler/icons-react';
import { useCallback, useRef, useState } from 'react';
import type {
    BasicOptimizationPreset,
    ImageOptimizationPreset,
} from '@/shared/domain/optimization-config';
import { useTranslation } from '@/shared/i18n';
import { useDismiss } from '@/shared/ui';
import { InfoTooltip } from './InfoTooltip';
import { OptimizationAdvancedPanel } from './OptimizationAdvancedPanel';
import { buildPresetOptions } from './output-panel.options';
import { SegmentButtons, type SegmentOption } from './SegmentedControl';
import { OptimizationTooltip } from './Tooltips';

interface Props {
    optimizationPreset: ImageOptimizationPreset;
    jpegQuality?: number;
    targetDpi?: number;
    onJpegQualityChange: (v: number | undefined) => void;
    onTargetDpiChange: (v: number | undefined) => void;
    onOptimizationPresetChange: (v: BasicOptimizationPreset) => void;
}

export function OptimizationSection({
    optimizationPreset,
    jpegQuality,
    targetDpi,
    onJpegQualityChange,
    onTargetDpiChange,
    onOptimizationPresetChange,
}: Props) {
    const { t } = useTranslation();
    const presetOptions: SegmentOption<ImageOptimizationPreset>[] = buildPresetOptions(
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
    const closeAdvancedPanel = useCallback(() => setIsAdvancedOpen(false), []);
    const toggleAdvancedPanel = () => setIsAdvancedOpen((current) => !current);

    const handlePresetChange = (value: ImageOptimizationPreset) => {
        if (value !== 'custom') onOptimizationPresetChange(value);
    };

    useDismiss(isAdvancedOpen, advancedRef, closeAdvancedPanel);

    return (
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
                        onChange={handlePresetChange}
                    />
                    <button
                        type="button"
                        aria-label={t('outputPanel.advancedSettings')}
                        aria-expanded={isAdvancedOpen}
                        onClick={toggleAdvancedPanel}
                        className={['btn-icon', isAdvancedOpen ? 'btn-icon-active' : '']
                            .filter(Boolean)
                            .join(' ')}
                    >
                        <IconSettings className="h-4 w-4" />
                    </button>
                </div>

                {isAdvancedOpen ? (
                    <OptimizationAdvancedPanel
                        jpegQuality={jpegQuality}
                        targetDpi={targetDpi}
                        onJpegQualityChange={onJpegQualityChange}
                        onTargetDpiChange={onTargetDpiChange}
                    />
                ) : null}
            </div>
        </div>
    );
}
