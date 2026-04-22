import assert from 'node:assert/strict';
import { test } from 'vitest';
import { resolveSelectionAfterAdd } from './added-file-selection.js';

test('keeps the current selection when nothing is added', () => {
    assert.deepEqual(resolveSelectionAfterAdd('current', []), {
        kind: 'preserve',
    });
});

test('selects the newly added pdf when exactly one pdf is added', () => {
    assert.deepEqual(resolveSelectionAfterAdd('current', [{ id: 'new-file', kind: 'pdf' }]), {
        kind: 'select-file',
        fileId: 'new-file',
    });
});

test('focuses the newly added image in the final document when exactly one image is added', () => {
    assert.deepEqual(resolveSelectionAfterAdd('current', [{ id: 'new-image', kind: 'image' }]), {
        kind: 'focus-source',
        fileId: 'new-image',
        target: { kind: 'image' },
        flashTarget: 'final',
    });
});

test('keeps the current selection when multiple files are added', () => {
    assert.deepEqual(
        resolveSelectionAfterAdd('current', [
            { id: 'first-new', kind: 'pdf' },
            { id: 'second-new', kind: 'image' },
        ]),
        { kind: 'preserve' },
    );
});

test('selects the first added file when multiple files are added into an empty workspace', () => {
    assert.deepEqual(
        resolveSelectionAfterAdd(null, [
            { id: 'first-new', kind: 'pdf' },
            { id: 'second-new', kind: 'image' },
        ]),
        {
            kind: 'select-file',
            fileId: 'first-new',
        },
    );
});
