import assert from 'node:assert/strict';
import { describe, test } from 'vitest';

import {
    batchWorkspaceReducer,
    createBatchSources,
    currentSummary,
    DEFAULT_BATCH_SETTINGS,
    INITIAL_BATCH_WORKSPACE,
    runnableSources,
    settingsFingerprint,
} from './batch-compression.model';
import type {
    BatchCompressionResult,
    BatchSource,
    BatchWorkspaceState,
} from './batch-compression.types';

function source(name: string, id = name): BatchSource {
    return createBatchSources(
        [{ name, path: `/source/${name}`, originalBytes: 1_000 }],
        new Set(),
        () => id,
    )[0];
}

function completedState(sources: BatchSource[]): BatchWorkspaceState {
    const started = batchWorkspaceReducer(
        { ...INITIAL_BATCH_WORKSPACE, sources, destinationPath: '/output' },
        { type: 'runStarted', sourceIds: sources.map((item) => item.id) },
    );
    const result: BatchCompressionResult = {
        files: sources.map((item) => ({
            sourceId: item.id,
            sourcePath: item.path,
            outputPath: `/output/${item.name}`,
            status: 'compressed',
            originalBytes: 1_000,
            outputBytes: 600,
        })),
        summary: {
            compressed: sources.length,
            alreadyOptimized: 0,
            skipped: 0,
            failed: 0,
            originalBytes: sources.length * 1_000,
            outputBytes: sources.length * 600,
        },
    };
    return batchWorkspaceReducer(started, {
        type: 'runCompleted',
        result,
        settings: DEFAULT_BATCH_SETTINGS,
    });
}

describe('batch compression settings fingerprints', () => {
    test('preserves source metadata collected before a run', () => {
        const [picked] = createBatchSources(
            [
                {
                    name: 'document.pdf',
                    path: '/source/document.pdf',
                    originalBytes: 42,
                    originalDimensions: { width: 1200, height: 800 },
                    pageCount: 7,
                },
            ],
            new Set(),
            () => 'document',
        );

        assert.deepEqual(picked.originalDimensions, { width: 1200, height: 800 });
        assert.equal(picked.pageCount, 7);
    });

    test('PDF ignores image-only settings', () => {
        const pdf = source('document.pdf');
        const changed = {
            ...DEFAULT_BATCH_SETTINGS,
            imageOutputMode: 'convertToJpeg' as const,
            jpegBackground: [12, 34, 56] as [number, number, number],
        };

        assert.equal(
            settingsFingerprint(pdf, DEFAULT_BATCH_SETTINGS),
            settingsFingerprint(pdf, changed),
        );
    });

    test('source-format WebP ignores JPEG quality and background but not its preset', () => {
        const webp = source('photo.webp');
        const sourceFormat = {
            ...DEFAULT_BATCH_SETTINGS,
            imageOutputMode: 'keepSourceFormat' as const,
        };
        const irrelevant = {
            ...sourceFormat,
            jpegQuality: 85 as const,
            jpegBackground: [12, 34, 56] as [number, number, number],
        };
        const relevant = { ...irrelevant, preset: 'compact' as const };

        assert.equal(
            settingsFingerprint(webp, sourceFormat),
            settingsFingerprint(webp, irrelevant),
        );
        assert.notEqual(settingsFingerprint(webp, irrelevant), settingsFingerprint(webp, relevant));
    });

    test('JPEG conversion background affects transparent source formats only', () => {
        const png = source('photo.png');
        const jpeg = source('photo.jpg');
        const base = { ...DEFAULT_BATCH_SETTINGS, imageOutputMode: 'convertToJpeg' as const };
        const changed = { ...base, jpegBackground: [0, 0, 0] as [number, number, number] };

        assert.notEqual(settingsFingerprint(png, base), settingsFingerprint(png, changed));
        assert.equal(settingsFingerprint(jpeg, base), settingsFingerprint(jpeg, changed));
    });
});

describe('batch workspace reducer', () => {
    test('settles files progressively and preserves completed results after a fatal failure', () => {
        const first = source('first.png');
        const second = source('second.png');
        const started = batchWorkspaceReducer(
            {
                ...INITIAL_BATCH_WORKSPACE,
                sources: [first, second],
                destinationPath: '/output',
            },
            { type: 'runStarted', sourceIds: [first.id, second.id] },
        );
        const progressed = batchWorkspaceReducer(started, {
            type: 'runFileCompleted',
            file: {
                sourceId: first.id,
                sourcePath: first.path,
                outputPath: '/output/first.jpg',
                status: 'compressed',
                originalBytes: 1_000,
                outputBytes: 600,
            },
            settings: DEFAULT_BATCH_SETTINGS,
        });

        assert.deepEqual(progressed.runProgress, { completed: 1, total: 2 });
        assert.deepEqual(
            progressed.sources.map((item) => item.state),
            ['compressed', 'running'],
        );
        assert.equal(currentSummary(progressed).compressed, 1);

        const failed = batchWorkspaceReducer(progressed, {
            type: 'runFailed',
            sourceIds: [first.id, second.id],
            message: 'The compression service stopped',
            settings: DEFAULT_BATCH_SETTINGS,
        });

        assert.equal(failed.runProgress, null);
        assert.deepEqual(
            failed.sources.map((item) => item.state),
            ['compressed', 'failed'],
        );
    });

    test('marks only sources affected by a settings change and restores them when reverted', () => {
        const initial = completedState([source('document.pdf'), source('photo.webp')]);
        const changedSettings = {
            ...DEFAULT_BATCH_SETTINGS,
            imageOutputMode: 'keepSourceFormat' as const,
        };

        const changed = batchWorkspaceReducer(initial, {
            type: 'settingsChanged',
            settings: changedSettings,
        });

        assert.deepEqual(
            changed.sources.map((item) => item.state),
            ['compressed', 'needsUpdate'],
        );
        assert.deepEqual(
            runnableSources(changed).map((item) => item.name),
            ['photo.webp'],
        );

        const reverted = batchWorkspaceReducer(changed, {
            type: 'settingsChanged',
            settings: DEFAULT_BATCH_SETTINGS,
        });
        assert.deepEqual(
            reverted.sources.map((item) => item.state),
            ['compressed', 'compressed'],
        );
    });

    test('excludes stale results from current aggregate totals', () => {
        const initial = completedState([source('document.pdf'), source('photo.png')]);
        const changed = batchWorkspaceReducer(initial, {
            type: 'settingsChanged',
            settings: { ...DEFAULT_BATCH_SETTINGS, preset: 'compact' },
        });

        assert.deepEqual(currentSummary(changed), {
            compressed: 0,
            alreadyOptimized: 0,
            skipped: 0,
            failed: 0,
            originalBytes: 0,
            outputBytes: 0,
        });
    });

    test('changing destination invalidates successful outputs but not skipped rows', () => {
        const supported = source('photo.png');
        const unsupported = source('archive.gif');
        let state = completedState([supported]);
        state = {
            ...state,
            sources: [
                ...state.sources,
                {
                    ...unsupported,
                    state: 'skipped',
                    completedFingerprint: 'skip:unsupportedFormat',
                    result: {
                        sourceId: unsupported.id,
                        sourcePath: unsupported.path,
                        status: 'skipped',
                        skipReason: 'unsupportedFormat',
                    },
                },
            ],
        };

        const changed = batchWorkspaceReducer(state, {
            type: 'destinationChanged',
            path: '/other-output',
        });

        assert.deepEqual(
            changed.sources.map((item) => item.state),
            ['needsUpdate', 'skipped'],
        );
    });

    test('choosing the current destination keeps completed outputs valid', () => {
        const state = completedState([source('photo.png')]);

        const unchanged = batchWorkspaceReducer(state, {
            type: 'destinationChanged',
            path: state.destinationPath,
        });

        assert.equal(unchanged, state);
    });

    test('attributes a fatal run failure to the settings used by that attempt', () => {
        const png = source('photo.png');
        const settings = { ...DEFAULT_BATCH_SETTINGS, preset: 'compact' as const };
        const failed = batchWorkspaceReducer(
            {
                ...INITIAL_BATCH_WORKSPACE,
                sources: [{ ...png, state: 'running' }],
                settings,
                destinationPath: '/output',
                isRunning: true,
            },
            {
                type: 'runFailed',
                sourceIds: [png.id],
                message: 'The compression service stopped',
                settings,
            },
        );

        assert.equal(failed.sources[0].state, 'failed');
        assert.equal(currentSummary(failed).failed, 1);
    });
});
