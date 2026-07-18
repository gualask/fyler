import {
    type Dispatch,
    type MutableRefObject,
    useCallback,
    useEffect,
    useReducer,
    useRef,
} from 'react';

import type {
    AppNotificationsApi,
    AppStatusTone,
    AppToastTone,
} from '@/shared/contracts/app-notifications.api';
import { type TranslationKey, useTranslation } from '@/shared/i18n';

import type { AppStatusPayload, MergeProgressStep } from './app-events.types';
import {
    type AppNotificationsAction,
    appNotificationsReducer,
    initialAppNotificationsState,
    type LoadingState,
    type StatusState,
} from './app-notifications.reducer';
import { useGlobalErrorHandlers } from './global-error-handlers.hook';
import { formatImportWarning, formatUserFacingError } from './notification-messages';
import { useTauriNotificationEvents } from './tauri-notification-events.hook';

type AppNotificationsDispatch = Dispatch<AppNotificationsAction>;
type LoadingOwner = LoadingState['kind'];
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

function useNotificationEventHandlers(
    dispatch: AppNotificationsDispatch,
    loadingOwnerRef: MutableRefObject<LoadingOwner | null>,
) {
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
            if (loadingOwnerRef.current !== 'merge-progress') return;
            dispatch({ type: 'show-merge-progress', step, progress });
        },
        [dispatch, loadingOwnerRef],
    );

    const handleImportProgress = useCallback(
        (completed: number, total: number) => {
            if (loadingOwnerRef.current !== 'opening-files') return;
            dispatch({ type: 'show-import-progress', completed, total });
        },
        [dispatch, loadingOwnerRef],
    );

    useGlobalErrorHandlers(handleError);
    useTauriNotificationEvents({
        onError: handleError,
        onImportWarning: handleImportWarning,
        onImportProgress: handleImportProgress,
        onMergeProgress: handleMergeProgress,
    });
}

function useNotificationActions(
    dispatch: AppNotificationsDispatch,
    loadingOwnerRef: MutableRefObject<LoadingOwner | null>,
    t: Translate,
) {
    const beginOpeningFiles = useCallback(() => {
        if (loadingOwnerRef.current !== null) return false;
        loadingOwnerRef.current = 'opening-files';
        dispatch({ type: 'show-opening-files' });
        return true;
    }, [dispatch, loadingOwnerRef]);

    const finishOpeningFiles = useCallback(() => {
        if (loadingOwnerRef.current !== 'opening-files') return;
        loadingOwnerRef.current = null;
        dispatch({ type: 'finish-opening-files' });
    }, [dispatch, loadingOwnerRef]);

    const beginMerge = useCallback(() => {
        if (loadingOwnerRef.current !== null) return false;
        loadingOwnerRef.current = 'merge-progress';
        dispatch({ type: 'show-merge-preparing' });
        return true;
    }, [dispatch, loadingOwnerRef]);

    const finishMerge = useCallback(() => {
        if (loadingOwnerRef.current !== 'merge-progress') return;
        loadingOwnerRef.current = null;
        dispatch({ type: 'finish-merge' });
    }, [dispatch, loadingOwnerRef]);

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
        beginOpeningFiles,
        finishOpeningFiles,
        beginMerge,
        finishMerge,
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
            return formatImportWarning(status.payload, tp);
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

function loadingProgressFor(loading: LoadingState | null): number | undefined {
    if (!loading) return undefined;
    if (loading.kind === 'merge-progress') return loading.progress;
    if (!loading.total) return undefined;
    return Math.round(((loading.completed ?? 0) / loading.total) * 100);
}

function loadingProgressLabelFor(loading: LoadingState | null, t: Translate): string | undefined {
    if (!loading) return undefined;
    if (loading.kind === 'merge-progress') return `${loading.progress}%`;
    if (!loading.total) return undefined;
    return t('progress.filesProcessed', {
        completed: loading.completed ?? 0,
        total: loading.total,
    });
}

export function useAppNotifications(): AppNotificationsApi {
    const { t, tp } = useTranslation();
    const [state, dispatch] = useReducer(appNotificationsReducer, initialAppNotificationsState);
    const { status, loading } = state;
    const loadingOwnerRef = useRef<LoadingOwner | null>(loading?.kind ?? null);
    loadingOwnerRef.current = loading?.kind ?? null;

    useStatusAutoClear(status, dispatch);
    useNotificationEventHandlers(dispatch, loadingOwnerRef);
    const actions = useNotificationActions(dispatch, loadingOwnerRef, t);

    return {
        statusMessage: statusMessageFor(status, t, tp),
        statusTone: statusToneFor(status),
        isBusy: loading !== null,
        loadingMessage: loadingMessageFor(loading, t),
        loadingProgress: loadingProgressFor(loading),
        loadingProgressLabel: loadingProgressLabelFor(loading, t),
        loadingElapsedTimeLabel:
            loading?.kind === 'opening-files' && (loading.total ?? 0) > 0
                ? t('progress.elapsedTime')
                : undefined,
        ...actions,
    };
}
