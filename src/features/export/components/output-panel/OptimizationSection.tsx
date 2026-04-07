import type { ImageOptimizationPreset } from '@/shared/domain/optimization-config';
import { useTranslation } from '@/shared/i18n';
import { OptimizationAdvancedPanel } from './OptimizationAdvancedPanel';
import { buildPresetSelectOptions } from './output-panel.options';
import { SelectControl, type SelectOption } from './SelectControl';
import { OptimizationTooltip } from './Tooltips';

interface Props {
    optimizationPreset: ImageOptimizationPreset;
    jpegQuality?: number;
    targetDpi?: number;
    onJpegQualityChange: (v: number | undefined) => void;
    onTargetDpiChange: (v: number | undefined) => void;
    onOptimizationPresetChange: (v: ImageOptimizationPreset) => void;
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
    const presetOptions: SelectOption<ImageOptimizationPreset>[] = buildPresetSelectOptions(
        {
            original: t('outputPanel.presets.original.label'),
            light: t('outputPanel.presets.light.label'),
            balanced: t('outputPanel.presets.balanced.label'),
            compact: t('outputPanel.presets.compact.label'),
        },
        t('outputPanel.customLong'),
    );

    return (
        <div className="output-panel-group output-panel-optimization">
            <SelectControl
                label={t('outputPanel.optimization')}
                helpContent={<OptimizationTooltip />}
                helpAlign="start"
                options={presetOptions}
                value={optimizationPreset}
                onChange={onOptimizationPresetChange}
            />

            {optimizationPreset === 'custom' ? (
                <OptimizationAdvancedPanel
                    jpegQuality={jpegQuality}
                    targetDpi={targetDpi}
                    onJpegQualityChange={onJpegQualityChange}
                    onTargetDpiChange={onTargetDpiChange}
                />
            ) : null}
        </div>
    );
}
