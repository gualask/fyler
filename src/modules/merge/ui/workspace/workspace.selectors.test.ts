import assert from 'node:assert/strict';
import { test } from 'vitest';
import { deriveFocusedSourceState } from './workspace.selectors.js';

test('returns picker focus details only when the focused source matches the selected file', () => {
    assert.deepEqual(
        deriveFocusedSourceState({
            focusedSource: {
                fileId: 'pdf-file',
                target: { kind: 'pdf', pageNum: 3 },
                flashTarget: 'picker',
                flashKey: 7,
            },
            selectedFile: { id: 'pdf-file' },
        }),
        {
            focusedSourceTarget: { kind: 'pdf', pageNum: 3 },
            focusedSourceFlashKey: 7,
        },
    );

    assert.deepEqual(
        deriveFocusedSourceState({
            focusedSource: {
                fileId: 'pdf-file',
                target: { kind: 'pdf', pageNum: 3 },
                flashTarget: 'final',
                flashKey: 7,
            },
            selectedFile: { id: 'pdf-file' },
        }),
        {
            focusedSourceTarget: { kind: 'pdf', pageNum: 3 },
            focusedSourceFlashKey: undefined,
        },
    );

    assert.deepEqual(
        deriveFocusedSourceState({
            focusedSource: {
                fileId: 'other-file',
                target: { kind: 'image' },
                flashTarget: 'picker',
                flashKey: 4,
            },
            selectedFile: { id: 'selected-file' },
        }),
        {
            focusedSourceTarget: null,
            focusedSourceFlashKey: undefined,
        },
    );
});
