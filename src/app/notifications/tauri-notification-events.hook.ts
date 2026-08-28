import { useEffect } from 'react';

import { onTauriEvent } from '@/infrastructure/platform/events';
import {
    isMergeOperationProgressPayload,
    isPageCompositionOperationProgressPayload,
    type MergeOperationProgressPayload,
    OPERATION_PROGRESS_EVENT,
    type PageCompositionOperationProgressPayload,
} from '@/shared/contracts/operation-progress';
import { useDiagnostics } from '@/shared/diagnostics';

import type { AppStatusPayload } from './app-events.types';

interface TauriNotificationCallbacks {
    onError: (message: string) => void;
    onImportWarning: (payload: AppStatusPayload) => void;
    onImportProgress: (completed: number, total: number) => void;
    onOperationProgress: (
        payload: MergeOperationProgressPayload | PageCompositionOperationProgressPayload,
    ) => void;
}

export function useTauriNotificationEvents({
    onError,
    onImportWarning,
    onImportProgress,
    onOperationProgress,
}: TauriNotificationCallbacks) {
    const { record } = useDiagnostics();

    useEffect(() => {
        return onTauriEvent<string>('app-error', (event) => {
            record({ category: 'app', severity: 'error', message: `Rust panic: ${event.payload}` });
            onError(event.payload);
        });
    }, [onError, record]);

    useEffect(() => {
        return onTauriEvent<AppStatusPayload>('app-status', (event) => {
            record({
                category: 'files',
                severity: 'warn',
                message: 'Import warning received',
                metadata: {
                    skippedCount: event.payload.skippedCount,
                    hasMore: event.payload.hasMore,
                },
            });
            onImportWarning(event.payload);
        });
    }, [onImportWarning, record]);

    useEffect(() => {
        return onTauriEvent<{ completed: number; total: number }>('import-progress', (event) => {
            onImportProgress(event.payload.completed, event.payload.total);
        });
    }, [onImportProgress]);

    useEffect(() => {
        return onTauriEvent<unknown>(OPERATION_PROGRESS_EVENT, (event) => {
            if (
                isMergeOperationProgressPayload(event.payload) ||
                isPageCompositionOperationProgressPayload(event.payload)
            ) {
                onOperationProgress(event.payload);
            }
        });
    }, [onOperationProgress]);
}
