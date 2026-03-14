export type BasicOptimizationPreset = 'original' | 'light' | 'balanced' | 'compact';
export type ImageOptimizationPreset = BasicOptimizationPreset | 'custom';

export type OptimizationSettings = {
    jpegQuality?: number;
    maxPx?: number;
};

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
        jpegQuality: 95,
        maxPx: 2500,
    },
    {
        value: 'balanced',
        jpegQuality: 90,
        maxPx: 2000,
    },
    {
        value: 'compact',
        jpegQuality: 85,
        maxPx: 1500,
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

export const MAX_PX_OPTIONS: NumericOptionDefinition[] = [
    {
        value: undefined,
    },
    {
        value: 2500,
    },
    {
        value: 2000,
    },
    {
        value: 1500,
    },
];

export function getOptimizationSettings(preset: BasicOptimizationPreset): OptimizationSettings {
    const found = OPTIMIZATION_PRESETS.find((candidate) => candidate.value === preset);
    if (!found) {
        throw new Error(`Preset non supportato: ${preset}`);
    }
    return {
        jpegQuality: found.jpegQuality,
        maxPx: found.maxPx,
    };
}

export function deriveOptimizationPreset(
    jpegQuality: number | undefined,
    maxPx: number | undefined,
): ImageOptimizationPreset {
    const matched = OPTIMIZATION_PRESETS.find(
        (preset) => preset.jpegQuality === jpegQuality && preset.maxPx === maxPx,
    );
    return matched?.value ?? 'custom';
}
