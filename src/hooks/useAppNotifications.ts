import { useCallback, useEffect, useMemo, useState } from 'react';
import { listen } from '@tauri-apps/api/event';

import type { AppStatusPayload, MergeProgressStep } from '../appEvents';
import { formatImportWarning, useTranslation } from '../i18n';

function toErrorMessage(value: unknown): string {
    return value instanceof Error ? value.message : String(value);
}

type StatusState =
    | { kind: 'error'; message: string }
    | { kind: 'export-completed' }
    | { kind: 'import-warning'; payload: AppStatusPayload };

type LoadingState =
    | { kind: 'opening-files' }
    | { kind: 'merge-progress'; step: MergeProgressStep; progress: number };

export function useAppNotifications() {
    const { t, tp } = useTranslation();
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
            setStatus({ kind: 'error', message: toErrorMessage(event.error ?? event.message) });
        };
        const handleRejection = (event: PromiseRejectionEvent) => {
            event.preventDefault();
            setStatus({ kind: 'error', message: toErrorMessage(event.reason) });
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, []);

    useEffect(() => {
        let unlisten: (() => void) | undefined;
        void listen<string>('app-error', (event) => {
            setStatus({ kind: 'error', message: event.payload });
        }).then((fn) => {
            unlisten = fn;
        });
        return () => unlisten?.();
    }, []);

    useEffect(() => {
        let unlisten: (() => void) | undefined;
        void listen<AppStatusPayload>('app-status', (event) => {
            setStatus({ kind: 'import-warning', payload: event.payload });
        }).then((fn) => {
            unlisten = fn;
        });
        return () => unlisten?.();
    }, []);

    useEffect(() => {
        let unlisten: (() => void) | undefined;
        void listen<{ step: MergeProgressStep; progress: number }>('merge-progress', (event) => {
            setLoading({ kind: 'merge-progress', step: event.payload.step, progress: event.payload.progress });
        }).then((fn) => {
            unlisten = fn;
        });
        return () => unlisten?.();
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

    const statusMessage = useMemo(() => {
        if (!status) return null;
        if (status.kind === 'error') {
            return t('status.errorPrefix', { message: status.message });
        }
        if (status.kind === 'export-completed') {
            return t('status.exportCompleted');
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
    };
}
