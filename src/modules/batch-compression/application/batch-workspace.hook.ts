import {
    type Dispatch,
    useCallback,
    useEffect,
    useEffectEvent,
    useMemo,
    useReducer,
    useState,
} from 'react';

import { usePrefetchImagePreview } from '@/capabilities/document-preview';
import { toDiagnosticMessage, useDiagnostics } from '@/shared/diagnostics';
import type { TranslationKey } from '@/shared/i18n';
import {
    BATCH_IMAGE_PREVIEW_LONG_SIDE,
    type BatchCompressionSettings,
    type BatchSource,
    type BatchWorkspaceAction,
    batchWorkspaceReducer,
    createBatchSources,
    currentSummary,
    INITIAL_BATCH_WORKSPACE,
    type PickedBatchSource,
    runnableSources,
} from '../model';
import {
    type BatchCompressionPort,
    type BatchFileDragEvent,
    useBatchCompressionPort,
} from './batch-compression.port';

type Translate = (key: TranslationKey, values?: Record<string, string | number>) => string;
type BatchNotifications = {
    isBusy: boolean;
    beginOpeningFiles(): boolean;
    updateOpeningFilesProgress(completed: number, total: number): void;
    finishOpeningFiles(): void;
    showError(error: unknown): void;
    showToast(tone: 'success' | 'warning', message: string): void;
};
type RecordDiagnostic = ReturnType<typeof useDiagnostics>['record'];
type PrefetchImagePreview = ReturnType<typeof usePrefetchImagePreview>;
const BATCH_IMAGE_PREVIEW_CONCURRENCY = 4;

const createSourceId = () =>
    globalThis.crypto?.randomUUID?.() ?? `batch-${Date.now()}-${Math.random()}`;

function prefetchImagePreview(
    source: BatchSource,
    prefetch: PrefetchImagePreview,
    onSettled: () => void,
) {
    return prefetch({
        fileId: source.id,
        originalPath: source.path,
        maxSide: BATCH_IMAGE_PREVIEW_LONG_SIDE,
    }).finally(onSettled);
}

async function prefetchAddedImagePreviews(
    sources: BatchSource[],
    prefetch: PrefetchImagePreview,
    updateProgress: (completed: number, total: number) => void,
) {
    const images = sources.filter((source) => source.kind === 'image');
    const total = sources.length;
    let completed = total - images.length;
    updateProgress(completed, total);

    const markSettled = () => {
        completed += 1;
        updateProgress(completed, total);
    };
    for (let index = 0; index < images.length; index += BATCH_IMAGE_PREVIEW_CONCURRENCY) {
        const batch = images.slice(index, index + BATCH_IMAGE_PREVIEW_CONCURRENCY);
        await Promise.allSettled(
            batch.map((source) => prefetchImagePreview(source, prefetch, markSettled)),
        );
    }
}

function useSourceAcquisition({
    port,
    sources,
    isRunning,
    notifications,
    record,
    t,
    dispatch,
}: {
    port: BatchCompressionPort;
    sources: BatchSource[];
    isRunning: boolean;
    notifications: BatchNotifications;
    record: RecordDiagnostic;
    t: Translate;
    dispatch: Dispatch<BatchWorkspaceAction>;
}) {
    const [isDragActive, setDragActive] = useState(false);
    const prefetchImagePreview = usePrefetchImagePreview();
    const commitPickedSources = useCallback(
        (picked: PickedBatchSource[]) => {
            const existingPaths = new Set(sources.map((source) => source.path));
            const added = createBatchSources(picked, existingPaths, createSourceId);
            if (!added.length) return [];
            dispatch({ type: 'sourcesAdded', sources: added });
            record({
                category: 'files',
                severity: 'info',
                message: 'Added batch compression sources',
                metadata: { added: added.length },
            });
            return added;
        },
        [dispatch, record, sources],
    );
    const acquireSources = useCallback(
        async (load: () => Promise<PickedBatchSource[]>, diagnosticMessage: string) => {
            if (isRunning || !notifications.beginOpeningFiles()) return;
            setDragActive(false);
            try {
                const added = commitPickedSources(await load());
                await prefetchAddedImagePreviews(
                    added,
                    prefetchImagePreview,
                    notifications.updateOpeningFilesProgress,
                );
            } catch (error) {
                record({
                    category: 'files',
                    severity: 'error',
                    message: `${diagnosticMessage}: ${toDiagnosticMessage(error)}`,
                });
                notifications.showError(error);
            } finally {
                notifications.finishOpeningFiles();
            }
        },
        [commitPickedSources, isRunning, notifications, prefetchImagePreview, record],
    );
    const addSources = useCallback(
        () =>
            acquireSources(
                () => port.pickSources(t('batch.dialog.files')),
                'Add batch sources failed',
            ),
        [acquireSources, port, t],
    );

    const handleFileDrag = useEffectEvent((event: BatchFileDragEvent) => {
        if (isRunning || notifications.isBusy) return setDragActive(false);
        if (event.type === 'enter' || event.type === 'over') return setDragActive(true);
        setDragActive(false);
        if (event.type !== 'drop' || !event.paths.length) return;
        void acquireSources(
            () => port.inspectSources(event.paths),
            'Inspect dropped sources failed',
        );
    });

    useEffect(() => port.listenForFileDrag(handleFileDrag), [port]);
    return { addSources, isDragActive };
}

function useBatchRun({
    port,
    pending,
    isRunning,
    settings,
    notifications,
    record,
    t,
    dispatch,
}: {
    port: BatchCompressionPort;
    pending: BatchSource[];
    isRunning: boolean;
    settings: BatchCompressionSettings;
    notifications: BatchNotifications;
    record: RecordDiagnostic;
    t: Translate;
    dispatch: Dispatch<BatchWorkspaceAction>;
}) {
    return useCallback(
        async (destinationPath: string) => {
            if (isRunning || !destinationPath || !pending.length) return;
            const sourceIds = pending.map((source) => source.id);
            dispatch({ type: 'runStarted', sourceIds });
            record({
                category: 'export',
                severity: 'info',
                message: 'Batch compression started',
                metadata: { files: sourceIds.length, preset: settings.preset },
            });
            try {
                const result = await port.compress(
                    {
                        destinationPath,
                        files: pending.map((source) => ({
                            sourceId: source.id,
                            sourcePath: source.path,
                        })),
                        settings,
                    },
                    (file) => dispatch({ type: 'runFileCompleted', file, settings }),
                );
                dispatch({ type: 'runCompleted', result, settings });
                const hasIssues = result.summary.failed > 0 || result.summary.skipped > 0;
                notifications.showToast(
                    hasIssues ? 'warning' : 'success',
                    t(hasIssues ? 'batch.toast.completedWithIssues' : 'batch.toast.completed'),
                );
                record({
                    category: 'export',
                    severity: hasIssues ? 'warn' : 'info',
                    message: 'Batch compression completed',
                    metadata: { ...result.summary },
                });
            } catch (error) {
                const message = toDiagnosticMessage(error);
                dispatch({ type: 'runFailed', sourceIds, message, settings });
                record({
                    category: 'export',
                    severity: 'error',
                    message: `Batch compression failed: ${message}`,
                });
                notifications.showError(error);
            }
        },
        [dispatch, isRunning, notifications, pending, port, record, settings, t],
    );
}

export function useBatchWorkspace(notifications: BatchNotifications, t: Translate) {
    const port = useBatchCompressionPort();
    const { record } = useDiagnostics();
    const [state, dispatch] = useReducer(batchWorkspaceReducer, INITIAL_BATCH_WORKSPACE);
    const pending = useMemo(() => runnableSources(state), [state]);
    const summary = useMemo(() => currentSummary(state), [state]);
    const { addSources, isDragActive } = useSourceAcquisition({
        port,
        sources: state.sources,
        isRunning: state.isRunning,
        notifications,
        record,
        t,
        dispatch,
    });

    const requestDestination = useCallback(async (): Promise<string> => {
        try {
            const path = await port.pickDestination();
            if (path) dispatch({ type: 'destinationChanged', path });
            return path;
        } catch (error) {
            notifications.showError(error);
            return '';
        }
    }, [notifications, port]);

    const chooseDestination = useCallback(async () => {
        await requestDestination();
    }, [requestDestination]);

    const executeRun = useBatchRun({
        port,
        pending,
        isRunning: state.isRunning,
        settings: state.settings,
        notifications,
        record,
        t,
        dispatch,
    });

    const run = useCallback(async () => {
        if (state.isRunning || !pending.length) return;
        const destinationPath = state.destinationPath || (await requestDestination());
        if (!destinationPath) return;
        await executeRun(destinationPath);
    }, [executeRun, pending.length, requestDestination, state.destinationPath, state.isRunning]);

    const changeSettings = useCallback((settings: BatchCompressionSettings) => {
        dispatch({ type: 'settingsChanged', settings });
    }, []);

    return {
        state,
        isBusy: state.isRunning || notifications.isBusy,
        pendingCount: pending.length,
        summary,
        isDragActive,
        addSources,
        chooseDestination,
        run,
        changeSettings,
        removeSource: (sourceId: string) => dispatch({ type: 'sourceRemoved', sourceId }),
        clearSources: () => dispatch({ type: 'sourcesCleared' }),
    };
}
