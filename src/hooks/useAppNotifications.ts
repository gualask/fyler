import { useCallback, useEffect, useMemo, useState } from 'react';
import { listen } from '@tauri-apps/api/event';

import type { AppStatusPayload, MergeProgressStep } from '../appEvents';
import { useDiagnostics } from '../diagnostics/useDiagnostics';
import { formatImportWarning, useTranslation } from '../i18n';

function toErrorMessage(value: unknown): string {
    return value instanceof Error ? value.message : String(value);
}

function attachEventListener<T>(eventName: string, listener: (event: { payload: T }) => void): () => void {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    void listen<T>(eventName, listener).then((fn) => {
        if (disposed) {
            fn();
        } else {
            unlisten = fn;
        }
    });

    return () => {
        disposed = true;
        unlisten?.();
    };
}

type StatusState =
    | { kind: 'error'; message: string }
    | { kind: 'export-completed' }
    | { kind: 'export-completed-with-optimization-warning'; count: number }
    | { kind: 'import-warning'; payload: AppStatusPayload };

type LoadingState =
    | { kind: 'opening-files' }
    | { kind: 'merge-progress'; step: MergeProgressStep; progress: number };

export function useAppNotifications() {
    const { t, tp } = useTranslation();
    const { record } = useDiagnostics();
    const [status, setStatus] = useState<StatusState | null>(null);
    const [loading, setLoading] = useState<LoadingState | null>(null);

    useEffect(() => {
        if (!status) return;
        const timeoutId = window.setTimeout(() => setStatus(null), 4000);
        return () => window.clearTimeout(timeoutId);
    }, [status]);

    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            event.preventDefault();
            const message = toErrorMessage(event.error ?? event.message);
            record({ category: 'app', severity: 'error', message: `Unhandled window error: ${message}` });
            setStatus({ kind: 'error', message });
        };
        const handleRejection = (event: PromiseRejectionEvent) => {
            event.preventDefault();
            const message = toErrorMessage(event.reason);
            record({ category: 'app', severity: 'error', message: `Unhandled promise rejection: ${message}` });
            setStatus({ kind: 'error', message });
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, [record]);

    useEffect(() => {
        return attachEventListener<string>('app-error', (event) => {
            record({ category: 'app', severity: 'error', message: `Rust panic: ${event.payload}` });
            setStatus({ kind: 'error', message: event.payload });
        });
    }, [record]);

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
            setStatus({ kind: 'import-warning', payload: event.payload });
        });
    }, [record]);

    useEffect(() => {
        return attachEventListener<{ step: MergeProgressStep; progress: number }>('merge-progress', (event) => {
            setLoading({ kind: 'merge-progress', step: event.payload.step, progress: event.payload.progress });
        });
    }, []);

    const showOpeningFiles = useCallback(() => {
        setLoading({ kind: 'opening-files' });
    }, []);

    const showMergePreparing = useCallback(() => {
        setLoading({ kind: 'merge-progress', step: 'preparing-documents', progress: 0 });
    }, []);

    const clearLoading = useCallback(() => {
        setLoading(null);
    }, []);

    const showExportCompleted = useCallback(() => {
        setStatus({ kind: 'export-completed' });
    }, []);

    const showExportCompletedWithOptimizationWarning = useCallback((count: number) => {
        setStatus({ kind: 'export-completed-with-optimization-warning', count });
    }, []);

    const showError = useCallback((error: unknown) => {
        setStatus({ kind: 'error', message: toErrorMessage(error) });
    }, []);

    const statusMessage = useMemo(() => {
        if (!status) return null;
        if (status.kind === 'error') {
            return t('status.errorPrefix', { message: status.message });
        }
        if (status.kind === 'export-completed') {
            return t('status.exportCompleted');
        }
        if (status.kind === 'export-completed-with-optimization-warning') {
            return tp('status.optimizationWarning', status.count);
        }
        return formatImportWarning(status.payload, tp);
    }, [status, t, tp]);

    const loadingMessage = useMemo(() => {
        if (!loading) return null;
        return loading.kind === 'opening-files'
            ? t('progress.openingFiles')
            : t(`progress.steps.${loading.step}`);
    }, [loading, t]);

    return {
        statusMessage,
        loadingMessage,
        loadingProgress: loading?.kind === 'merge-progress' ? loading.progress : undefined,
        showOpeningFiles,
        showMergePreparing,
        clearLoading,
        showExportCompleted,
        showExportCompletedWithOptimizationWarning,
        showError,
    };
}
