import type { ImageFit } from '@/shared/domain';
import type { TranslationKey } from '@/shared/i18n';
import type { BasicOptimizationPreset, ImageOptimizationPreset } from '../../optimization.types';
import {
    type JPEG_QUALITY_OPTIONS,
    OPTIMIZATION_PRESETS,
    type TARGET_DPI_OPTIONS,
} from '../../optimization-presets';
import type { SelectOption } from './SelectControl';

type PresetTranslationKeys = {
    label: TranslationKey;
    description: TranslationKey;
};

type JpegQualityOptionId = (typeof JPEG_QUALITY_OPTIONS)[number]['id'];
type TargetDpiOptionId = (typeof TARGET_DPI_OPTIONS)[number]['id'];
type Translate = (key: TranslationKey) => string;

const IMAGE_FIT_ORDER: ImageFit[] = ['contain', 'fit', 'cover'];

export const IMAGE_FIT_TRANSLATION_KEYS = {
    contain: 'outputPanel.imageFitOptions.contain',
    fit: 'outputPanel.imageFitOptions.fit',
    cover: 'outputPanel.imageFitOptions.cover',
} as const satisfies Record<ImageFit, TranslationKey>;

export const OPTIMIZATION_PRESET_TRANSLATION_KEYS = {
    original: {
        label: 'outputPanel.presets.original.label',
        description: 'outputPanel.presets.original.description',
    },
    light: {
        label: 'outputPanel.presets.light.label',
        description: 'outputPanel.presets.light.description',
    },
    balanced: {
        label: 'outputPanel.presets.balanced.label',
        description: 'outputPanel.presets.balanced.description',
    },
    compact: {
        label: 'outputPanel.presets.compact.label',
        description: 'outputPanel.presets.compact.description',
    },
} as const satisfies Record<BasicOptimizationPreset, PresetTranslationKeys>;

export const JPEG_QUALITY_DESCRIPTION_KEYS = {
    off: 'tooltips.jpegDescriptions.off',
    '95': 'tooltips.jpegDescriptions.95',
    '90': 'tooltips.jpegDescriptions.90',
    '85': 'tooltips.jpegDescriptions.85',
} as const satisfies Record<JpegQualityOptionId, TranslationKey>;

export const TARGET_DPI_DESCRIPTION_KEYS = {
    off: 'tooltips.dpiDescriptions.off',
    '220': 'tooltips.dpiDescriptions.220',
    '170': 'tooltips.dpiDescriptions.170',
    '120': 'tooltips.dpiDescriptions.120',
} as const satisfies Record<TargetDpiOptionId, TranslationKey>;

/** Builds translated options for the Image Fit toggle group (stable order). */
export function buildImageFitOptions(t: Translate): SelectOption<ImageFit>[] {
    return IMAGE_FIT_ORDER.map((value) => ({
        value,
        label: t(IMAGE_FIT_TRANSLATION_KEYS[value]),
    }));
}

/** Builds optimization preset options for the preset select. */
export function buildPresetSelectOptions(
    t: Translate,
    customLabel: string,
): SelectOption<ImageOptimizationPreset>[] {
    const baseOptions: SelectOption<ImageOptimizationPreset>[] = OPTIMIZATION_PRESETS.map(
        ({ value }) => ({
            value,
            label: t(OPTIMIZATION_PRESET_TRANSLATION_KEYS[value].label),
        }),
    );
    return [...baseOptions, { value: 'custom', label: customLabel }];
}
