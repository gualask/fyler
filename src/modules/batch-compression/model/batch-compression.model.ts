import type {
    BatchCompressionResult,
    BatchCompressionSettings,
    BatchFileResult,
    BatchSource,
    BatchSourceKind,
    BatchSummary,
    BatchWorkspaceState,
    PickedBatchSource,
} from './batch-compression.types';

export const DEFAULT_BATCH_SETTINGS: BatchCompressionSettings = {
    preset: 'balanced',
    imageOutputMode: 'convertToJpeg',
    jpegQuality: 92,
    jpegBackground: [255, 255, 255],
};

export const INITIAL_BATCH_WORKSPACE: BatchWorkspaceState = {
    sources: [],
    settings: DEFAULT_BATCH_SETTINGS,
    destinationPath: '',
    isRunning: false,
    runProgress: null,
};

export type BatchWorkspaceAction =
    | { type: 'sourcesAdded'; sources: BatchSource[] }
    | { type: 'sourceRemoved'; sourceId: string }
    | { type: 'sourcesCleared' }
    | { type: 'settingsChanged'; settings: BatchCompressionSettings }
    | { type: 'destinationChanged'; path: string }
    | { type: 'runStarted'; sourceIds: string[] }
    | {
          type: 'runFileCompleted';
          file: BatchFileResult;
          settings: BatchCompressionSettings;
      }
    | {
          type: 'runCompleted';
          result: BatchCompressionResult;
          settings: BatchCompressionSettings;
      }
    | {
          type: 'runFailed';
          sourceIds: string[];
          message: string;
          settings: BatchCompressionSettings;
      };

const PDF_EXTENSIONS = new Set(['pdf']);
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'bmp']);
export const BATCH_IMAGE_PREVIEW_LONG_SIDE = 96;

function extensionFromName(name: string): string {
    const index = name.lastIndexOf('.');
    return index > 0 ? name.slice(index + 1).toLowerCase() : '';
}

function sourceKind(extension: string): BatchSourceKind {
    if (PDF_EXTENSIONS.has(extension)) return 'pdf';
    if (IMAGE_EXTENSIONS.has(extension)) return 'image';
    return 'unsupported';
}

export function createBatchSources(
    picked: PickedBatchSource[],
    existingPaths: ReadonlySet<string>,
    createId: () => string,
): BatchSource[] {
    const paths = new Set(existingPaths);
    const sources: BatchSource[] = [];
    for (const source of picked) {
        if (paths.has(source.path)) continue;
        paths.add(source.path);
        const extension = extensionFromName(source.name);
        sources.push({
            id: createId(),
            path: source.path,
            name: source.name,
            extension,
            kind: sourceKind(extension),
            pickedOriginalBytes: source.originalBytes,
            originalDimensions: source.originalDimensions,
            pageCount: source.pageCount,
            state: 'ready',
        });
    }
    return sources;
}

function outputsJpeg(source: BatchSource, settings: BatchCompressionSettings): boolean {
    if (settings.imageOutputMode === 'convertToJpeg') return true;
    return source.extension === 'jpg' || source.extension === 'jpeg';
}

function backgroundIsRelevant(source: BatchSource, settings: BatchCompressionSettings): boolean {
    return outputsJpeg(source, settings) && ['png', 'webp'].includes(source.extension);
}

function skipFingerprint(result: BatchFileResult | undefined): string | undefined {
    if (result?.status !== 'skipped' || !result.skipReason) return undefined;
    return `skip:${result.skipReason}`;
}

export function settingsFingerprint(
    source: BatchSource,
    settings: BatchCompressionSettings,
): string {
    const stableSkip = skipFingerprint(source.result);
    if (stableSkip) return stableSkip;
    if (source.kind === 'unsupported') return 'unsupported';
    if (source.kind === 'pdf') {
        return `pdf|${settings.preset}|q:${settings.jpegQuality}`;
    }

    const parts = [`image|${settings.preset}|mode:${settings.imageOutputMode}`];
    if (outputsJpeg(source, settings)) parts.push(`q:${settings.jpegQuality}`);
    if (backgroundIsRelevant(source, settings)) {
        parts.push(`bg:${settings.jpegBackground.join(',')}`);
    }
    return parts.join('|');
}

function completedFingerprint(
    source: BatchSource,
    result: BatchFileResult,
    settings: BatchCompressionSettings,
): string {
    if (result.status === 'skipped' && result.skipReason) return `skip:${result.skipReason}`;
    return settingsFingerprint({ ...source, result: undefined }, settings);
}

function stateFromResult(result: BatchFileResult): BatchSource['state'] {
    return result.status;
}

function sourcesForSettings(
    sources: BatchSource[],
    settings: BatchCompressionSettings,
): BatchSource[] {
    return sources.map((source) => {
        if (!source.completedFingerprint || source.state === 'failed') return source;
        const current = settingsFingerprint(source, settings);
        return current === source.completedFingerprint
            ? { ...source, state: source.result ? stateFromResult(source.result) : source.state }
            : { ...source, state: 'needsUpdate' };
    });
}

function sourcesForDestination(sources: BatchSource[]): BatchSource[] {
    return sources.map((source) =>
        source.result && ['compressed', 'alreadyOptimized'].includes(source.result.status)
            ? { ...source, state: 'needsUpdate' }
            : source,
    );
}

function startedSources(sources: BatchSource[], sourceIds: string[]): BatchSource[] {
    const running = new Set(sourceIds);
    return sources.map((source) =>
        running.has(source.id) ? { ...source, state: 'running' } : source,
    );
}

function completedSources(
    sources: BatchSource[],
    result: BatchCompressionResult,
    settings: BatchCompressionSettings,
): BatchSource[] {
    const results = new Map(result.files.map((file) => [file.sourceId, file]));
    return sources.map((source) => {
        const file = results.get(source.id);
        if (!file) return source;
        return {
            ...source,
            state: stateFromResult(file),
            result: file,
            completedFingerprint: completedFingerprint(source, file, settings),
        };
    });
}

function completedSource(
    sources: BatchSource[],
    file: BatchFileResult,
    settings: BatchCompressionSettings,
): BatchSource[] {
    return sources.map((source) => {
        if (source.id !== file.sourceId || source.state !== 'running') return source;
        return {
            ...source,
            state: stateFromResult(file),
            result: file,
            completedFingerprint: completedFingerprint(source, file, settings),
        };
    });
}

function failedSources(
    sources: BatchSource[],
    sourceIds: string[],
    message: string,
    settings: BatchCompressionSettings,
): BatchSource[] {
    const failed = new Set(sourceIds);
    return sources.map((source) =>
        failed.has(source.id) && source.state === 'running'
            ? {
                  ...source,
                  state: 'failed',
                  result: {
                      sourceId: source.id,
                      sourcePath: source.path,
                      status: 'failed',
                      message,
                  },
                  completedFingerprint: settingsFingerprint(
                      { ...source, result: undefined },
                      settings,
                  ),
              }
            : source,
    );
}

export function batchWorkspaceReducer(
    state: BatchWorkspaceState,
    action: BatchWorkspaceAction,
): BatchWorkspaceState {
    switch (action.type) {
        case 'sourcesAdded':
            return { ...state, sources: [...state.sources, ...action.sources] };
        case 'sourceRemoved':
            return {
                ...state,
                sources: state.sources.filter((source) => source.id !== action.sourceId),
            };
        case 'sourcesCleared':
            return { ...state, sources: [] };
        case 'settingsChanged':
            return {
                ...state,
                settings: action.settings,
                sources: sourcesForSettings(state.sources, action.settings),
            };
        case 'destinationChanged':
            if (action.path === state.destinationPath) return state;
            return {
                ...state,
                destinationPath: action.path,
                sources: sourcesForDestination(state.sources),
            };
        case 'runStarted':
            return {
                ...state,
                isRunning: true,
                runProgress: { completed: 0, total: action.sourceIds.length },
                sources: startedSources(state.sources, action.sourceIds),
            };
        case 'runFileCompleted': {
            const wasRunning = state.sources.some(
                (source) => source.id === action.file.sourceId && source.state === 'running',
            );
            return {
                ...state,
                runProgress:
                    wasRunning && state.runProgress
                        ? {
                              ...state.runProgress,
                              completed: Math.min(
                                  state.runProgress.completed + 1,
                                  state.runProgress.total,
                              ),
                          }
                        : state.runProgress,
                sources: completedSource(state.sources, action.file, action.settings),
            };
        }
        case 'runCompleted':
            return {
                ...state,
                isRunning: false,
                runProgress: null,
                sources: completedSources(state.sources, action.result, action.settings),
            };
        case 'runFailed':
            return {
                ...state,
                isRunning: false,
                runProgress: null,
                sources: failedSources(
                    state.sources,
                    action.sourceIds,
                    action.message,
                    action.settings,
                ),
            };
    }
}

export function runnableSources(state: BatchWorkspaceState): BatchSource[] {
    return state.sources.filter((source) =>
        ['ready', 'failed', 'needsUpdate'].includes(source.state),
    );
}

export function currentSummary(state: BatchWorkspaceState): BatchSummary {
    const summary: BatchSummary = {
        compressed: 0,
        alreadyOptimized: 0,
        skipped: 0,
        failed: 0,
        originalBytes: 0,
        outputBytes: 0,
    };
    for (const source of state.sources) {
        const result = source.result;
        if (
            !result ||
            source.completedFingerprint !== settingsFingerprint(source, state.settings)
        ) {
            continue;
        }
        summary[result.status] += 1;
        summary.originalBytes += result.originalBytes ?? 0;
        summary.outputBytes += result.outputBytes ?? 0;
    }
    return summary;
}
