import type { ImageFit } from '@/shared/domain';
import type {
    BasicOptimizationPreset,
    ImageOptimizationPreset,
} from '@/shared/domain/optimization-config';
import { OPTIMIZATION_PRESETS } from '@/shared/domain/optimization-config';
import type { SegmentOption } from './SegmentedControl';

const IMAGE_FIT_OPTIONS: SegmentOption<ImageFit>[] = [
    { value: 'contain', label: '' },
    { value: 'fit', label: '' },
    { value: 'cover', label: '' },
];

export function buildImageFitOptions(
    getLabel: (fit: ImageFit) => string,
): SegmentOption<ImageFit>[] {
    return IMAGE_FIT_OPTIONS.map(({ value }) => ({
        value,
        label: getLabel(value),
    }));
}

export function buildPresetOptions(
    preset: ImageOptimizationPreset,
    presetLabels: Record<BasicOptimizationPreset, string>,
    customLabel: string,
): SegmentOption<ImageOptimizationPreset>[] {
    const baseOptions: SegmentOption<ImageOptimizationPreset>[] = OPTIMIZATION_PRESETS.map(
        ({ value }) => ({
            value,
            label: presetLabels[value],
        }),
    );
    if (preset !== 'custom') return baseOptions;
    return [...baseOptions, { value: 'custom', label: customLabel, disabled: true }];
}
