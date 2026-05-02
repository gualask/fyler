import type { BasicOptimizationPreset, ImageFit, ImageOptimizationPreset } from '@/shared/domain';
import { OPTIMIZATION_PRESETS } from '@/shared/domain/value-objects/optimization-presets.vo';
import type { SelectOption } from './SelectControl';

const IMAGE_FIT_OPTIONS: SelectOption<ImageFit>[] = [
    { value: 'contain', label: '' },
    { value: 'fit', label: '' },
    { value: 'cover', label: '' },
];

/** Builds translated options for the Image Fit toggle group (stable order). */
export function buildImageFitOptions(
    getLabel: (fit: ImageFit) => string,
): SelectOption<ImageFit>[] {
    return IMAGE_FIT_OPTIONS.map(({ value }) => ({
        value,
        label: getLabel(value),
    }));
}

/** Builds optimization preset options for the preset select. */
export function buildPresetSelectOptions(
    presetLabels: Record<BasicOptimizationPreset, string>,
    customLabel: string,
): SelectOption<ImageOptimizationPreset>[] {
    const baseOptions: SelectOption<ImageOptimizationPreset>[] = OPTIMIZATION_PRESETS.map(
        ({ value }) => ({
            value,
            label: presetLabels[value],
        }),
    );
    return [...baseOptions, { value: 'custom', label: customLabel }];
}
