export type BasicCompressionPreset = 'original' | 'light' | 'balanced' | 'compact';

export type CompressionProfile = {
    value: BasicCompressionPreset;
    jpegQuality?: number;
    targetDpi?: number;
};

/** Display values for named profiles. Native policy remains authoritative at export time. */
export const COMPRESSION_PROFILES: readonly CompressionProfile[] = [
    { value: 'original' },
    { value: 'light', jpegQuality: 92, targetDpi: 220 },
    { value: 'balanced', jpegQuality: 92, targetDpi: 170 },
    { value: 'compact', jpegQuality: 92, targetDpi: 120 },
];

export function getCompressionProfile(preset: BasicCompressionPreset): CompressionProfile {
    const found = COMPRESSION_PROFILES.find((candidate) => candidate.value === preset);
    if (!found) throw new Error(`Unsupported preset: ${preset}`);
    return { ...found };
}
