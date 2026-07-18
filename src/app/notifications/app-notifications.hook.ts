import { type Dispatch, useCallback, useEffect, useMemo, useReducer } from 'react';

import type {
    AppNotificationsApi,
    AppStatusTone,
    AppToastTone,
} from '@/shared/contracts/app-notifications.api';
import type { AppStatusPayload, MergeProgressStep } from '@/shared/diagnostics';
import { formatUserFacingError } from '@/shared/errors';
import { formatImportWarning, type TranslationKey, useTranslation } from '@/shared/i18n';

import {
    type AppNotificationsAction,
    appNotificationsReducer,
    initialAppNotificationsState,
    type LoadingState,
    type StatusState,
} from './app-notifications.reducer';
import { useGlobalErrorHandlers } from './global-error-handlers.hook';
import { useTauriNotificationEvents } from './tauri-notification-events.hook';

type AppNotificationsDispatch = Dispatch<AppNotificationsAction>;
type Translate = ReturnType<typeof useTranslation>['t'];
type TranslatePlural = ReturnType<typeof useTranslation>['tp'];

const MERGE_PROGRESS_TRANSLATION_KEYS = {
    'preparing-documents': 'progress.steps.preparing-documents',
    'merging-pages': 'progress.steps.merging-pages',
    'optimizing-images': 'progress.steps.optimizing-images',
    saving: 'progress.steps.saving',
} as const satisfies Record<MergeProgressStep, TranslationKey>;

function useStatusAutoClear(status: StatusState | null, dispatch: AppNotificationsDispatch) {
    useEffect(() => {
        if (!status) return;
        const timeoutId = window.setTimeout(() => dispatch({ type: 'clear-status' }), 4000);
        return () => window.clearTimeout(timeoutId);
    }, [dispatch, status]);
}

function useNotificationEventHandlers(dispatch: AppNotificationsDispatch) {
    const handleError = useCallback(
        (message: string) => {
            dispatch({ type: 'show-error', message });
        },
        [dispatch],
    );

    const handleImportWarning = useCallback(
        (payload: AppStatusPayload) => {
            dispatch({ type: 'show-import-warning', payload });
        },
        [dispatch],
    );

    const handleMergeProgress = useCallback(
        (step: MergeProgressStep, progress: number) => {
            dispatch({ type: 'show-merge-progress', step, progress });
        },
        [dispatch],
    );

    useGlobalErrorHandlers(handleError);
    useTauriNotificationEvents({
        onError: handleError,
        onImportWarning: handleImportWarning,
        onMergeProgress: handleMergeProgress,
    });
}

function useNotificationActions(dispatch: AppNotificationsDispatch, t: Translate) {
    const showOpeningFiles = useCallback(() => {
        dispatch({ type: 'show-opening-files' });
    }, [dispatch]);

    const showMergePreparing = useCallback(() => {
        dispatch({ type: 'show-merge-preparing' });
    }, [dispatch]);

    const clearLoading = useCallback(() => {
        dispatch({ type: 'clear-loading' });
    }, [dispatch]);

    const showExportCompleted = useCallback(() => {
        dispatch({ type: 'show-export-completed' });
    }, [dispatch]);

    const showExportCompletedWithOptimizationWarning = useCallback(
        (count: number) => {
            dispatch({ type: 'show-export-completed-with-optimization-warning', count });
        },
        [dispatch],
    );

    const showError = useCallback(
        (error: unknown) => {
            dispatch({
                type: 'show-error',
                message: formatUserFacingError(error, t),
            });
        },
        [dispatch, t],
    );

    const showToast = useCallback(
        (tone: AppToastTone, message: string) => {
            dispatch({ type: 'show-toast', tone, message });
        },
        [dispatch],
    );

    return {
        showOpeningFiles,
        showMergePreparing,
        clearLoading,
        showExportCompleted,
        showExportCompletedWithOptimizationWarning,
        showError,
        showToast,
    };
}

function statusMessageFor(
    status: StatusState | null,
    t: Translate,
    tp: TranslatePlural,
): string | null {
    if (!status) return null;
    switch (status.kind) {
        case 'error':
            return t('status.errorPrefix', { message: status.message });
        case 'toast':
            return status.message;
        case 'export-completed':
            return t('status.exportCompleted');
        case 'export-completed-with-optimization-warning':
            return tp('status.optimizationWarning', status.count);
        case 'import-warning':
            return formatImportWarning(status.payload, t, tp);
    }
}

function statusToneFor(status: StatusState | null): AppStatusTone | null {
    if (!status) return null;
    if (status.kind === 'error') return 'error';
    if (status.kind === 'toast') return status.tone;
    if (status.kind === 'export-completed') return 'success';
    return 'warning';
}

function loadingMessageFor(loading: LoadingState | null, t: Translate): string | null {
    if (!loading) return null;
    return loading.kind === 'opening-files'
        ? t('progress.openingFiles')
        : t(MERGE_PROGRESS_TRANSLATION_KEYS[loading.step]);
}

export function useAppNotifications(): AppNotificationsApi {
    const { t, tp } = useTranslation();
    const [state, dispatch] = useReducer(appNotificationsReducer, initialAppNotificationsState);
    const { status, loading } = state;

    useStatusAutoClear(status, dispatch);
    useNotificationEventHandlers(dispatch);
    const actions = useNotificationActions(dispatch, t);

    const statusMessage = useMemo(() => {
        return statusMessageFor(status, t, tp);
    }, [status, t, tp]);

    const statusTone = useMemo<'success' | 'error' | 'warning' | null>(() => {
        return statusToneFor(status);
    }, [status]);

    const loadingMessage = useMemo(() => {
        return loadingMessageFor(loading, t);
    }, [loading, t]);

    return {
        statusMessage,
        statusTone,
        loadingMessage,
        loadingProgress: loading?.kind === 'merge-progress' ? loading.progress : undefined,
        ...actions,
    };
}
