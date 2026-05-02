import { useCallback, useEffect, useMemo, useReducer } from 'react';

import type { AppNotificationsApi } from '@/shared/contracts/app-notifications.api';
import type { AppStatusPayload, MergeProgressStep } from '@/shared/diagnostics';
import { formatUserFacingError } from '@/shared/errors';
import { formatImportWarning, useTranslation } from '@/shared/i18n';

import { appNotificationsReducer, initialAppNotificationsState } from './app-notifications.reducer';
import { useGlobalErrorHandlers } from './global-error-handlers.hook';
import { useTauriNotificationEvents } from './tauri-notification-events.hook';

export function useAppNotifications(): AppNotificationsApi {
    const { t, tp } = useTranslation();
    const [state, dispatch] = useReducer(appNotificationsReducer, initialAppNotificationsState);
    const { status, loading } = state;

    useEffect(() => {
        if (!status) return;
        const timeoutId = window.setTimeout(() => dispatch({ type: 'clear-status' }), 4000);
        return () => window.clearTimeout(timeoutId);
    }, [status]);

    const handleError = useCallback((message: string) => {
        dispatch({ type: 'show-error', message });
    }, []);

    const handleImportWarning = useCallback((payload: AppStatusPayload) => {
        dispatch({ type: 'show-import-warning', payload });
    }, []);

    const handleMergeProgress = useCallback((step: MergeProgressStep, progress: number) => {
        dispatch({ type: 'show-merge-progress', step, progress });
    }, []);

    useGlobalErrorHandlers(handleError);
    useTauriNotificationEvents({
        onError: handleError,
        onImportWarning: handleImportWarning,
        onMergeProgress: handleMergeProgress,
    });

    const showOpeningFiles = useCallback(() => {
        dispatch({ type: 'show-opening-files' });
    }, []);

    const showMergePreparing = useCallback(() => {
        dispatch({ type: 'show-merge-preparing' });
    }, []);

    const clearLoading = useCallback(() => {
        dispatch({ type: 'clear-loading' });
    }, []);

    const showExportCompleted = useCallback(() => {
        dispatch({ type: 'show-export-completed' });
    }, []);

    const showExportCompletedWithOptimizationWarning = useCallback((count: number) => {
        dispatch({ type: 'show-export-completed-with-optimization-warning', count });
    }, []);

    const showError = useCallback(
        (error: unknown) => {
            dispatch({
                type: 'show-error',
                message: formatUserFacingError(error, t),
            });
        },
        [t],
    );

    const showToast = useCallback((tone: 'success' | 'warning', message: string) => {
        dispatch({ type: 'show-toast', tone, message });
    }, []);

    const statusMessage = useMemo(() => {
        if (!status) return null;
        if (status.kind === 'error') {
            return t('status.errorPrefix', { message: status.message });
        }
        if (status.kind === 'toast') {
            return status.message;
        }
        if (status.kind === 'export-completed') {
            return t('status.exportCompleted');
        }
        if (status.kind === 'export-completed-with-optimization-warning') {
            return tp('status.optimizationWarning', status.count);
        }
        return formatImportWarning(status.payload, t, tp);
    }, [status, t, tp]);

    const statusTone = useMemo<'success' | 'error' | 'warning' | null>(() => {
        if (!status) return null;
        if (status.kind === 'error') return 'error';
        if (status.kind === 'toast') return status.tone;
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
        showToast,
    };
}
