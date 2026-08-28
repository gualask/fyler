import { describe, expect, it } from 'vitest';
import { COMPRESSION_PROFILES, getCompressionProfile } from './compression-profiles';

describe('compression profiles', () => {
    it('maps automatic PDF targets to the shared quality', () => {
        expect(COMPRESSION_PROFILES).toEqual([
            { value: 'original' },
            { value: 'light', jpegQuality: 92, targetDpi: 220 },
            { value: 'balanced', jpegQuality: 92, targetDpi: 170 },
            { value: 'compact', jpegQuality: 92, targetDpi: 120 },
        ]);
    });

    it('returns a copy instead of exposing the profile table', () => {
        expect(getCompressionProfile('balanced')).toEqual({
            value: 'balanced',
            jpegQuality: 92,
            targetDpi: 170,
        });
    });
});
