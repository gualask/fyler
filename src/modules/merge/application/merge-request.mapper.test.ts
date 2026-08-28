import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { FileEdits, FinalPage } from '../model/merge.types';
import { buildMergeRequest } from './merge-request.mapper';

test('maps ordered final pages and merge options without changing edit identity', () => {
    const finalPages: FinalPage[] = [
        { id: 'pdf:2', fileId: 'pdf', kind: 'pdf', pageNum: 2 },
        { id: 'image:image', fileId: 'image', kind: 'image' },
    ];
    const edits: Record<string, FileEdits> = {
        pdf: { revision: 1, pageRotations: { 2: 1 } },
    };

    const request = buildMergeRequest(finalPages, edits, '/tmp/out.pdf', 'contain', {
        jpegQuality: 90,
        targetDpi: 170,
    });

    assert.deepEqual(request.pages, [
        { kind: 'pdf', fileId: 'pdf', pageNum: 2 },
        { kind: 'image', fileId: 'image' },
    ]);
    assert.equal(request.edits, edits);
    assert.equal(request.outputPath, '/tmp/out.pdf');
    assert.equal(request.imageFit, 'contain');
    assert.deepEqual(request.optimize, { jpegQuality: 90, targetDpi: 170 });
});

test('preserves named preset identity for native policy resolution', () => {
    const request = buildMergeRequest([], {}, '/tmp/out.pdf', 'contain', {
        preset: 'balanced',
    });

    assert.deepEqual(request.optimize, { preset: 'balanced' });
});
