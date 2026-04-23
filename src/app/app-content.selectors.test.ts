import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
    buildAppContentRootClassName,
    buildSupportDiagnosticsParams,
    deriveFocusedSourceState,
    isTutorialReadyForAutoStart,
} from './app-content.selectors.js';

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

test('marks the tutorial ready only when quick add is inactive and the workspace is populated', () => {
    assert.equal(
        isTutorialReadyForAutoStart(
            { isQuickAdd: false, isTransitioning: false },
            {
                files: [{ id: 'file-1' } as never],
                selectedFile: { id: 'file-1' },
                finalPages: [{ id: 'page-1' } as never],
            },
        ),
        true,
    );

    assert.equal(
        isTutorialReadyForAutoStart(
            { isQuickAdd: true, isTransitioning: false },
            {
                files: [{ id: 'file-1' } as never],
                selectedFile: { id: 'file-1' },
                finalPages: [{ id: 'page-1' } as never],
            },
        ),
        false,
    );

    assert.equal(
        isTutorialReadyForAutoStart(
            { isQuickAdd: false, isTransitioning: true },
            {
                files: [{ id: 'file-1' } as never],
                selectedFile: { id: 'file-1' },
                finalPages: [{ id: 'page-1' } as never],
            },
        ),
        false,
    );
});

test('builds the app root class name for steady and transitioning quick add states', () => {
    assert.match(buildAppContentRootClassName(false), /\bblur-none opacity-100 scale-100\b/);
    assert.match(buildAppContentRootClassName(true), /\bblur-md opacity-0 scale-95\b/);
});

test('maps overlay support diagnostics params from app state counts and optimize values', () => {
    assert.deepEqual(
        buildSupportDiagnosticsParams({
            isDark: true,
            quickAdd: { isQuickAdd: true },
            workspace: {
                files: [{ id: 'file-1' } as never, { id: 'file-2' } as never],
                finalPages: [{ id: 'page-1' } as never],
            },
            optimize: {
                optimizationPreset: 'balanced',
                imageFit: 'contain',
                targetDpi: 150,
                jpegQuality: 82,
            },
        }),
        {
            isDark: true,
            isQuickAdd: true,
            fileCount: 2,
            finalPageCount: 1,
            optimizationPreset: 'balanced',
            imageFit: 'contain',
            targetDpi: 150,
            jpegQuality: 82,
        },
    );
});
