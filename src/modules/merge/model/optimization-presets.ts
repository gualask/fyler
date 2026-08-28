import {
    COMPRESSION_PROFILES,
    getCompressionProfile,
    OPTIONAL_JPEG_QUALITY_OPTIONS,
} from '@/capabilities/compression-profiles';

export const DEFAULT_OPTIMIZATION_PRESET = 'light' as const;
export const OPTIMIZATION_PRESETS = COMPRESSION_PROFILES;
export const getOptimizationSettings = getCompressionProfile;

type NumericOptionDefinition = {
    id: string;
    value: number | undefined;
};

export const JPEG_QUALITY_OPTIONS =
    OPTIONAL_JPEG_QUALITY_OPTIONS satisfies readonly NumericOptionDefinition[];

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
