import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';

import type { AppStatusPayload, MergeProgressStep } from '@/diagnostics/appEvents';
import { useDiagnostics } from '@/diagnostics/useDiagnostics';

function attachEventListener<T>(eventName: string, listener: (event: { payload: T }) => void): () => void {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    void listen<T>(eventName, listener).then((fn) => {
        if (disposed) {
            fn();
        } else {
            unlisten = fn;
        }
    }).catch(() => { /* listener registration failed — swallowed intentionally */ });

    return () => {
        disposed = true;
        unlisten?.();
    };
}

interface TauriNotificationCallbacks {
    onError: (message: string) => void;
    onImportWarning: (payload: AppStatusPayload) => void;
    onMergeProgress: (step: MergeProgressStep, progress: number) => void;
}

export function useTauriNotificationEvents({ onError, onImportWarning, onMergeProgress }: TauriNotificationCallbacks) {
    const { record } = useDiagnostics();

    useEffect(() => {
        return attachEventListener<string>('app-error', (event) => {
            record({ category: 'app', severity: 'error', message: `Rust panic: ${event.payload}` });
            onError(event.payload);
        });
    }, [onError, record]);

    useEffect(() => {
        return attachEventListener<AppStatusPayload>('app-status', (event) => {
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
        return attachEventListener<{ step: MergeProgressStep; progress: number }>('merge-progress', (event) => {
            onMergeProgress(event.payload.step, event.payload.progress);
        });
    }, [onMergeProgress]);
}
