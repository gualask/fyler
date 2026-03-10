export type BasicOptimizationPreset = 'original' | 'light' | 'balanced' | 'compact';
export type ImageOptimizationPreset = BasicOptimizationPreset | 'custom';

export type OptimizationSettings = {
    jpegQuality?: number;
    maxPx?: number;
};

type OptimizationPresetDefinition = OptimizationSettings & {
    value: BasicOptimizationPreset;
    label: string;
    description: string;
};

type NumericOptionDefinition = {
    value: number | undefined;
    label: string;
    title: string;
    description: string;
};

export const OPTIMIZATION_PRESETS: OptimizationPresetDefinition[] = [
    {
        value: 'original',
        label: 'Originale',
        description: 'Nessun resize e nessuna ricodifica JPEG.',
    },
    {
        value: 'light',
        label: 'Leggera',
        description: 'Riduce solo le immagini molto grandi e usa JPEG 95%.',
        jpegQuality: 95,
        maxPx: 2500,
    },
    {
        value: 'balanced',
        label: 'Bilanciata',
        description: 'Porta il lato lungo a max 2000px e usa JPEG 90%.',
        jpegQuality: 90,
        maxPx: 2000,
    },
    {
        value: 'compact',
        label: 'Compatta',
        description: 'Porta il lato lungo a max 1500px e usa JPEG 85% per PDF piu leggeri.',
        jpegQuality: 85,
        maxPx: 1500,
    },
];

export const JPEG_QUALITY_OPTIONS: NumericOptionDefinition[] = [
    {
        value: undefined,
        label: 'Off',
        title: 'Off',
        description: 'Non ricodifica in JPEG: mantiene i dati immagine originali.',
    },
    {
        value: 95,
        label: '95',
        title: '95',
        description: 'Qualita molto conservativa, utile dopo un resize leggero.',
    },
    {
        value: 90,
        label: '90',
        title: '90',
        description: 'Buon compromesso per export generali e condivisione.',
    },
    {
        value: 85,
        label: '85',
        title: '85',
        description: 'Riduce di piu il peso, con perdita visiva piu probabile.',
    },
];

export const MAX_PX_OPTIONS: NumericOptionDefinition[] = [
    {
        value: undefined,
        label: 'Off',
        title: 'Off',
        description: "Non ridimensiona: il lato lungo resta quello originale.",
    },
    {
        value: 2500,
        label: '2500',
        title: '2500px',
        description: 'Interviene solo sulle immagini molto grandi.',
    },
    {
        value: 2000,
        label: '2000',
        title: '2000px',
        description: 'Compromesso equilibrato per la maggior parte dei PDF.',
    },
    {
        value: 1500,
        label: '1500',
        title: '1500px',
        description: 'Riduce di piu il dettaglio per alleggerire il file finale.',
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
