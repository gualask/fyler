import type { TranslationKey } from '@/shared/i18n';
import type { BasicCompressionPreset } from './compression-profiles';

export type CompressionPresetValue = Exclude<BasicCompressionPreset, 'original'>;
export const COMPRESSION_PRESET_VALUES = [
    'light',
    'balanced',
    'compact',
] as const satisfies readonly CompressionPresetValue[];

export const JPEG_QUALITY_VALUES = [95, 92, 90, 85] as const;
export type JpegQualityValue = (typeof JPEG_QUALITY_VALUES)[number];

export const OPTIONAL_JPEG_QUALITY_OPTIONS = [
    { id: 'off', value: undefined },
    ...JPEG_QUALITY_VALUES.map((value) => ({
        id: String(value) as `${JpegQualityValue}`,
        value,
    })),
] satisfies readonly { id: 'off' | `${JpegQualityValue}`; value: JpegQualityValue | undefined }[];

export const COMPRESSION_PRESET_LABELS = {
    original: 'compression.presets.original',
    light: 'compression.presets.light',
    balanced: 'compression.presets.balanced',
    compact: 'compression.presets.compact',
} as const satisfies Record<BasicCompressionPreset, TranslationKey>;

export const JPEG_QUALITY_LABELS = {
    95: 'compression.jpegQuality.maximum',
    92: 'compression.jpegQuality.high',
    90: 'compression.jpegQuality.medium',
    85: 'compression.jpegQuality.low',
} as const satisfies Record<JpegQualityValue, TranslationKey>;

export const JPEG_QUALITY_DESCRIPTIONS = {
    95: 'compression.jpegQuality.maximumDescription',
    92: 'compression.jpegQuality.highDescription',
    90: 'compression.jpegQuality.mediumDescription',
    85: 'compression.jpegQuality.lowDescription',
} as const satisfies Record<JpegQualityValue, TranslationKey>;
