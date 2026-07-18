import { useEffect } from 'react';

import { onTauriEvent } from '@/infra/platform/events';
import type { AppStatusPayload, MergeProgressStep } from '@/shared/diagnostics';
import { useDiagnostics } from '@/shared/diagnostics';

interface TauriNotificationCallbacks {
    onError: (message: string) => void;
    onImportWarning: (payload: AppStatusPayload) => void;
    onImportProgress: (completed: number, total: number) => void;
    onMergeProgress: (step: MergeProgressStep, progress: number) => void;
}

export function useTauriNotificationEvents({
    onError,
    onImportWarning,
    onImportProgress,
    onMergeProgress,
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
        return onTauriEvent<{ step: MergeProgressStep; progress: number }>(
            'merge-progress',
            (event) => {
                onMergeProgress(event.payload.step, event.payload.progress);
            },
        );
    }, [onMergeProgress]);
}
