import assert from 'node:assert/strict';
import { test } from 'vitest';
import { initialWorkspaceUiState, workspaceUiReducer } from './workspace-ui.reducer.js';

test('selects a file and clears focused source', () => {
    const state = workspaceUiReducer(
        {
            ...initialWorkspaceUiState,
            selectedId: 'old-file',
            selectedFileScrollKey: 2,
            focusedSource: {
                fileId: 'old-file',
                target: { kind: 'image' },
                flashKey: 2,
                flashTarget: 'final',
            },
            uiSignalKey: 2,
        },
        { type: 'file-selected', fileId: 'new-file' },
    );

    assert.deepEqual(state, {
        selectedId: 'new-file',
        selectedFileScrollKey: 3,
        focusedSource: null,
        uiSignalKey: 3,
    });
});

test('focuses a source and reuses the same signal for scroll and flash', () => {
    const state = workspaceUiReducer(initialWorkspaceUiState, {
        type: 'source-focused',
        fileId: 'image-file',
        target: { kind: 'image' },
        flashTarget: 'final',
    });

    assert.deepEqual(state, {
        selectedId: 'image-file',
        selectedFileScrollKey: 1,
        focusedSource: {
            fileId: 'image-file',
            target: { kind: 'image' },
            flashKey: 1,
            flashTarget: 'final',
        },
        uiSignalKey: 1,
    });
});

test('focuses the final document when one image is added', () => {
    const state = workspaceUiReducer(
        {
            ...initialWorkspaceUiState,
            selectedId: 'current-file',
            uiSignalKey: 4,
            selectedFileScrollKey: 4,
        },
        { type: 'files-added', files: [{ id: 'new-image', kind: 'image' }] },
    );

    assert.deepEqual(state, {
        selectedId: 'new-image',
        selectedFileScrollKey: 5,
        focusedSource: {
            fileId: 'new-image',
            target: { kind: 'image' },
            flashKey: 5,
            flashTarget: 'final',
        },
        uiSignalKey: 5,
    });
});

test('preserves the current selection when multiple files are added', () => {
    const state = workspaceUiReducer(
        {
            ...initialWorkspaceUiState,
            selectedId: 'current-file',
            selectedFileScrollKey: 3,
            uiSignalKey: 3,
        },
        {
            type: 'files-added',
            files: [
                { id: 'new-pdf', kind: 'pdf' },
                { id: 'new-image', kind: 'image' },
            ],
        },
    );

    assert.deepEqual(state, {
        selectedId: 'current-file',
        selectedFileScrollKey: 3,
        focusedSource: null,
        uiSignalKey: 3,
    });
});

test('selects the first remaining file when removing the current selection', () => {
    const state = workspaceUiReducer(
        {
            selectedId: 'selected-file',
            selectedFileScrollKey: 2,
            focusedSource: {
                fileId: 'selected-file',
                target: { kind: 'image' },
                flashKey: 2,
                flashTarget: 'final',
            },
            uiSignalKey: 2,
        },
        {
            type: 'file-removed',
            fileId: 'selected-file',
            remainingIds: ['next-file', 'other-file'],
        },
    );

    assert.deepEqual(state, {
        selectedId: 'next-file',
        selectedFileScrollKey: 3,
        focusedSource: null,
        uiSignalKey: 3,
    });
});
