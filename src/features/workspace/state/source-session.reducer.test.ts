import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { FileEdits, SourceFile } from '@/shared/domain';
import { initialSourceSessionState, sourceSessionReducer } from './source-session.reducer.js';

const PDF_FILE: SourceFile = {
    id: 'pdf-file',
    originalPath: '/tmp/a.pdf',
    name: 'a.pdf',
    byteSize: 100,
    pageCount: null,
    kind: 'pdf',
};

const IMAGE_FILE: SourceFile = {
    id: 'image-file',
    originalPath: '/tmp/a.jpg',
    name: 'a.jpg',
    byteSize: 50,
    pageCount: 1,
    kind: 'image',
};

const FILE_EDITS = {
    revision: 1,
    pageRotations: { 1: 1 },
    imageRotation: 0,
} satisfies FileEdits;

test('adds files to the end of the session', () => {
    const state = sourceSessionReducer(initialSourceSessionState, {
        type: 'add-files',
        files: [PDF_FILE, IMAGE_FILE],
    });

    assert.deepEqual(state, {
        files: [PDF_FILE, IMAGE_FILE],
        editsByFile: {},
    });
});

test('removes a file and clears its edits', () => {
    const state = sourceSessionReducer(
        {
            files: [PDF_FILE, IMAGE_FILE],
            editsByFile: {
                [PDF_FILE.id]: FILE_EDITS,
            },
        },
        { type: 'remove-file', fileId: PDF_FILE.id },
    );

    assert.deepEqual(state, {
        files: [IMAGE_FILE],
        editsByFile: {},
    });
});

test('clears the whole source session', () => {
    const state = sourceSessionReducer(
        {
            files: [PDF_FILE],
            editsByFile: {
                [PDF_FILE.id]: FILE_EDITS,
            },
        },
        { type: 'clear' },
    );

    assert.deepEqual(state, initialSourceSessionState);
});

test('reorders files by id', () => {
    const state = sourceSessionReducer(
        {
            files: [PDF_FILE, IMAGE_FILE],
            editsByFile: {},
        },
        { type: 'reorder-files', fromId: IMAGE_FILE.id, toId: PDF_FILE.id },
    );

    assert.deepEqual(state.files, [IMAGE_FILE, PDF_FILE]);
});

test('updates the page count for a file', () => {
    const state = sourceSessionReducer(
        {
            files: [PDF_FILE],
            editsByFile: {},
        },
        { type: 'update-file-page-count', fileId: PDF_FILE.id, count: 6 },
    );

    assert.equal(state.files[0].pageCount, 6);
});

test('stores file edits by file id', () => {
    const state = sourceSessionReducer(
        {
            files: [PDF_FILE],
            editsByFile: {},
        },
        { type: 'set-file-edits', fileId: PDF_FILE.id, edits: FILE_EDITS },
    );

    assert.deepEqual(state.editsByFile, {
        [PDF_FILE.id]: FILE_EDITS,
    });
});
