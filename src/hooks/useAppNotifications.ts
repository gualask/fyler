import { useCallback, useEffect, useMemo, useState } from 'react';

import type { AppStatusPayload, MergeProgressStep } from '@/diagnostics/appEvents';
import { formatImportWarning, useTranslation } from '@/i18n';

import { useGlobalErrorHandlers } from './useGlobalErrorHandlers';
import { useTauriNotificationEvents } from './useTauriNotificationEvents';

function toErrorMessage(value: unknown): string {
    return value instanceof Error ? value.message : String(value);
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
    const [status, setStatus] = useState<StatusState | null>(null);
    const [loading, setLoading] = useState<LoadingState | null>(null);

    useEffect(() => {
        if (!status) return;
        const timeoutId = window.setTimeout(() => setStatus(null), 4000);
        return () => window.clearTimeout(timeoutId);
    }, [status]);

    const handleError = useCallback((message: string) => {
        setStatus({ kind: 'error', message });
    }, []);

    const handleImportWarning = useCallback((payload: AppStatusPayload) => {
        setStatus({ kind: 'import-warning', payload });
    }, []);

    const handleMergeProgress = useCallback((step: MergeProgressStep, progress: number) => {
        setLoading({ kind: 'merge-progress', step, progress });
    }, []);

    useGlobalErrorHandlers(handleError);
    useTauriNotificationEvents({
        onError: handleError,
        onImportWarning: handleImportWarning,
        onMergeProgress: handleMergeProgress,
    });

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

    const statusTone = useMemo<'success' | 'error' | 'warning' | null>(() => {
        if (!status) return null;
        if (status.kind === 'error') return 'error';
        if (status.kind === 'export-completed') return 'success';
        return 'warning';
    }, [status]);

    const loadingMessage = useMemo(() => {
        if (!loading) return null;
        return loading.kind === 'opening-files'
            ? t('progress.openingFiles')
            : t(`progress.steps.${loading.step}`);
    }, [loading, t]);

    return {
        statusMessage,
        statusTone,
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
