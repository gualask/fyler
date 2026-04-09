import type {
    BasicOptimizationPreset,
    ImageOptimizationPreset,
    OptimizationSettings,
} from '../dto/optimization.dto';

/** Default preset used for new sessions. */
export const DEFAULT_OPTIMIZATION_PRESET: BasicOptimizationPreset = 'light';

type OptimizationPresetDefinition = OptimizationSettings & {
    value: BasicOptimizationPreset;
};

type NumericOptionDefinition = {
    value: number | undefined;
};

export const OPTIMIZATION_PRESETS: OptimizationPresetDefinition[] = [
    {
        value: 'original',
    },
    {
        value: 'light',
        targetDpi: 220,
    },
    {
        value: 'balanced',
        targetDpi: 170,
    },
    {
        value: 'compact',
        targetDpi: 120,
    },
];

export const JPEG_QUALITY_OPTIONS: NumericOptionDefinition[] = [
    {
        value: undefined,
    },
    {
        value: 95,
    },
    {
        value: 90,
    },
    {
        value: 85,
    },
];

export const TARGET_DPI_OPTIONS: NumericOptionDefinition[] = [
    {
        value: undefined,
    },
    {
        value: 220,
    },
    {
        value: 170,
    },
    {
        value: 120,
    },
];

/**
 * Maps a preset to concrete optimization settings.
 *
 * Note: the preset list is part of the UX contract (labels/options) and should remain stable.
 */
export function getOptimizationSettings(preset: BasicOptimizationPreset): OptimizationSettings {
    const found = OPTIMIZATION_PRESETS.find((candidate) => candidate.value === preset);
    if (!found) {
        throw new Error(`Unsupported preset: ${preset}`);
    }
    return {
        jpegQuality: found.jpegQuality,
        targetDpi: found.targetDpi,
    };
}

/**
 * Derives the matching preset for the provided settings.
 *
 * Returns `'custom'` when the pair does not exactly match a known preset.
 */
export function deriveOptimizationPreset(
    jpegQuality: number | undefined,
    targetDpi: number | undefined,
): ImageOptimizationPreset {
    const matched = OPTIMIZATION_PRESETS.find(
        (preset) => preset.jpegQuality === jpegQuality && preset.targetDpi === targetDpi,
    );
    return matched?.value ?? 'custom';
}
