import { describe, expect, it } from 'vitest';
import type { SourceFile } from '@/capabilities/document-sources';
import {
    canExportComposition,
    EMPTY_PAGE_COMPOSITION,
    ownedSourceIds,
    pageCompositionReducer,
    releasedSourceIds,
    toExportRequest,
} from './page-composition.model';

function file(id: string, kind: SourceFile['kind'] = 'image'): SourceFile {
    return { id, kind, name: id, originalPath: `/tmp/${id}`, byteSize: 1, pageCount: 1 };
}

describe('page composition model', () => {
    it('assigns, rotates, swaps, and removes complete region values', () => {
        const top = pageCompositionReducer(EMPTY_PAGE_COMPOSITION, {
            type: 'assign',
            region: 'top',
            source: { kind: 'image', file: file('front') },
        });
        const rotated = pageCompositionReducer(top, {
            type: 'rotate',
            region: 'top',
            direction: 'ccw',
        });
        expect(rotated.regions.top.rotation).toBe(3);
        const swapped = pageCompositionReducer(rotated, { type: 'swap' });
        expect(swapped.regions.bottom.source?.file.id).toBe('front');
        expect(swapped.regions.bottom.rotation).toBe(3);
        expect(pageCompositionReducer(swapped, { type: 'remove', region: 'bottom' })).toEqual(
            EMPTY_PAGE_COMPOSITION,
        );
    });

    it('retains shared originals while releasing independently generated rasters', () => {
        const pdf = file('document', 'pdf');
        let composition = pageCompositionReducer(EMPTY_PAGE_COMPOSITION, {
            type: 'assign',
            region: 'top',
            source: { kind: 'pdf-page', file: pdf, pageNum: 1, rasterFile: file('raster-1') },
        });
        composition = pageCompositionReducer(composition, {
            type: 'assign',
            region: 'bottom',
            source: { kind: 'pdf-page', file: pdf, pageNum: 2, rasterFile: file('raster-2') },
        });
        const after = pageCompositionReducer(composition, { type: 'remove', region: 'top' });
        expect(releasedSourceIds(composition, after)).toEqual(['raster-1']);
        expect(ownedSourceIds(after)).toEqual(['document', 'raster-2']);
    });

    it('changes orientation without losing sources or rotations', () => {
        let composition = pageCompositionReducer(EMPTY_PAGE_COMPOSITION, {
            type: 'assign',
            region: 'top',
            source: { kind: 'image', file: file('front') },
        });
        composition = pageCompositionReducer(composition, {
            type: 'rotate',
            region: 'top',
            direction: 'cw',
        });

        const horizontal = pageCompositionReducer(composition, {
            type: 'layoutChanged',
            layout: 'a4-side-by-side-halves',
        });

        expect(horizontal.layout).toBe('a4-side-by-side-halves');
        expect(horizontal.regions).toEqual(composition.regions);
    });

    it('exports only a complete composition through raster image references', () => {
        expect(canExportComposition(EMPTY_PAGE_COMPOSITION)).toBe(false);
        const pdf = file('pdf', 'pdf');
        let composition = pageCompositionReducer(EMPTY_PAGE_COMPOSITION, {
            type: 'assign',
            region: 'top',
            source: { kind: 'image', file: file('image') },
        });
        composition = pageCompositionReducer(composition, {
            type: 'assign',
            region: 'bottom',
            source: { kind: 'pdf-page', file: pdf, pageNum: 2, rasterFile: file('raster') },
        });
        composition = pageCompositionReducer(composition, {
            type: 'layoutChanged',
            layout: 'a4-side-by-side-halves',
        });
        const request = toExportRequest(composition, '/tmp/output.jpg', 'jpeg', 'light', 92);
        expect(request.outputFormat).toBe('jpeg');
        expect(request.layout).toBe('a4-side-by-side-halves');
        expect(request.regions).toEqual({
            top: { fileId: 'image', rotation: 0 },
            bottom: { fileId: 'raster', rotation: 0 },
        });
        expect(request.optimization).toEqual({ preset: 'light', jpegQuality: 92 });
    });
});
