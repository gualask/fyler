import { describe, expect, it } from 'vitest';
import { requiredPdfRasterSize } from './pdf-page-raster';

describe('PDF page raster resolution', () => {
    it('covers 300 effective DPI for landscape pages under both orientations', () => {
        const size = requiredPdfRasterSize(2);
        expect(size.width).toBeGreaterThanOrEqual(Math.ceil((190 / 25.4) * 300));
        expect(size.height).toBe(Math.ceil(size.width / 2));
    });

    it('covers portrait pages without synthesizing a different aspect ratio', () => {
        const size = requiredPdfRasterSize(0.7);
        expect(size.height).toBe(Math.ceil(size.width / 0.7));
        expect(size.width * size.height).toBeLessThanOrEqual(64 * 1024 * 1024);
    });

    it('rejects invalid page geometry', () => {
        expect(() => requiredPdfRasterSize(0)).toThrow();
        expect(() => requiredPdfRasterSize(Number.NaN)).toThrow();
    });
});
