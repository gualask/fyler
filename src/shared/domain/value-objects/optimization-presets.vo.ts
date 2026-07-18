import type { BasicOptimizationPreset, OptimizationSettings } from '../dto/optimization.dto';

/** Default preset used for new sessions. */
export const DEFAULT_OPTIMIZATION_PRESET: BasicOptimizationPreset = 'light';

type OptimizationPresetDefinition = OptimizationSettings & {
    value: BasicOptimizationPreset;
};

type NumericOptionDefinition = {
    id: string;
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

export const JPEG_QUALITY_OPTIONS = [
    {
        id: 'off',
        value: undefined,
    },
    {
        id: '95',
        value: 95,
    },
    {
        id: '90',
        value: 90,
    },
    {
        id: '85',
        value: 85,
    },
] as const satisfies readonly NumericOptionDefinition[];

export const TARGET_DPI_OPTIONS = [
    {
        id: 'off',
        value: undefined,
    },
    {
        id: '220',
        value: 220,
    },
    {
        id: '170',
        value: 170,
    },
    {
        id: '120',
        value: 120,
    },
] as const satisfies readonly NumericOptionDefinition[];

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
