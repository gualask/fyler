import {
    COMPRESSION_PRESET_LABELS,
    COMPRESSION_PRESET_VALUES,
    JPEG_QUALITY_DESCRIPTIONS,
    JPEG_QUALITY_LABELS,
    JPEG_QUALITY_VALUES,
} from '@/capabilities/compression-profiles';
import type { TranslationKey } from '@/shared/i18n';
import type { CompositionCompressionPreset, CompositionJpegQuality } from '../model';

export const PRESETS = COMPRESSION_PRESET_VALUES;
export const QUALITIES = JPEG_QUALITY_VALUES;

export const PRESET_COPY = {
    light: {
        label: COMPRESSION_PRESET_LABELS.light,
        description: 'pageComposition.settings.lightDescription',
    },
    balanced: {
        label: COMPRESSION_PRESET_LABELS.balanced,
        description: 'pageComposition.settings.balancedDescription',
    },
    compact: {
        label: COMPRESSION_PRESET_LABELS.compact,
        description: 'pageComposition.settings.compactDescription',
    },
} as const satisfies Record<
    CompositionCompressionPreset,
    { label: TranslationKey; description: TranslationKey }
>;

export const QUALITY_LABELS = JPEG_QUALITY_LABELS satisfies Record<
    CompositionJpegQuality,
    TranslationKey
>;
export const QUALITY_DESCRIPTIONS = JPEG_QUALITY_DESCRIPTIONS satisfies Record<
    CompositionJpegQuality,
    TranslationKey
>;
