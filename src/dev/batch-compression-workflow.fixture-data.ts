import {
    type BatchCompressionResult,
    type BatchFileResult,
    type BatchSource,
    type BatchWorkspaceState,
    batchWorkspaceReducer,
    createBatchSources,
    DEFAULT_BATCH_SETTINGS,
    type PickedBatchSource,
} from '@/modules/batch-compression/model';

export const DESTINATION = '/Users/example/Fyler compressed';

export const PICKED_SOURCES: PickedBatchSource[] = [
    {
        path: '/fixtures/sample-document.pdf',
        name: 'sample-document.pdf',
        originalBytes: 469_513,
        pageCount: 5,
    },
    {
        path: '/fixtures/hero.png',
        name: 'fyler-banner.png',
        originalBytes: 1_322_899,
        originalDimensions: { width: 1983, height: 793 },
    },
    {
        path: '/fixtures/sample-image.jpg',
        name: 'sample-image.jpg',
        originalBytes: 53_932,
        originalDimensions: { width: 1140, height: 641 },
    },
    {
        path: '/fixtures/video-demo.gif',
        name: 'animated-preview.webp',
        originalBytes: 4_384_913,
        originalDimensions: { width: 1280, height: 720 },
    },
];

function createFixtureSources(): BatchSource[] {
    let nextId = 0;
    return createBatchSources(PICKED_SOURCES, new Set(), () => `fixture-batch-${++nextId}`);
}

function successfulResult(source: BatchSource, index: number): BatchFileResult {
    const originalBytes = source.pickedOriginalBytes;
    const alreadyOptimized = index === 2;
    return {
        sourceId: source.id,
        sourcePath: source.path,
        outputPath: `${DESTINATION}/${source.name.replace(/\.png$/i, '.jpg')}`,
        status: alreadyOptimized ? 'alreadyOptimized' : 'compressed',
        originalBytes,
        outputBytes: alreadyOptimized ? originalBytes : Math.round(originalBytes * 0.58),
        originalDimensions: source.originalDimensions,
        outputDimensions: source.originalDimensions,
        pageCount: source.pageCount,
    };
}

export function fixtureResults(sources: BatchSource[], issues: boolean): BatchFileResult[] {
    return sources.map((source, index) => {
        if (issues && index === 2) {
            return {
                sourceId: source.id,
                sourcePath: source.path,
                status: 'failed',
                message: 'The output file could not be written.',
                originalBytes: source.pickedOriginalBytes,
            };
        }
        if (issues && index === 3) {
            return {
                sourceId: source.id,
                sourcePath: source.path,
                status: 'skipped',
                skipReason: 'animatedWebP',
                originalBytes: source.pickedOriginalBytes,
            };
        }
        return successfulResult(source, index);
    });
}

export function compressionResult(files: BatchFileResult[]): BatchCompressionResult {
    return {
        files,
        summary: {
            compressed: files.filter((file) => file.status === 'compressed').length,
            alreadyOptimized: files.filter((file) => file.status === 'alreadyOptimized').length,
            skipped: files.filter((file) => file.status === 'skipped').length,
            failed: files.filter((file) => file.status === 'failed').length,
            originalBytes: files.reduce((total, file) => total + (file.originalBytes ?? 0), 0),
            outputBytes: files.reduce((total, file) => total + (file.outputBytes ?? 0), 0),
        },
    };
}

export function initialBatchState(search: string): BatchWorkspaceState {
    const scenario = new URLSearchParams(search).get('state') ?? 'completed';
    const sources = scenario === 'empty' ? [] : createFixtureSources();
    let state: BatchWorkspaceState = {
        sources,
        settings: { ...DEFAULT_BATCH_SETTINGS },
        destinationPath: scenario === 'empty' ? '' : DESTINATION,
        isRunning: false,
        runProgress: null,
    };

    if (scenario === 'empty' || scenario === 'ready') return state;

    const results = fixtureResults(sources, scenario === 'issues');
    if (scenario === 'running') {
        state = batchWorkspaceReducer(state, {
            type: 'runStarted',
            sourceIds: sources.map((source) => source.id),
        });
        for (const file of results.slice(0, 2)) {
            state = batchWorkspaceReducer(state, {
                type: 'runFileCompleted',
                file,
                settings: state.settings,
            });
        }
        return state;
    }

    return batchWorkspaceReducer(state, {
        type: 'runCompleted',
        result: compressionResult(results),
        settings: state.settings,
    });
}
