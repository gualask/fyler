import type { AppStatusPayload, MergeProgressStep } from '@/shared/diagnostics';

export type StatusState =
    | { kind: 'error'; message: string }
    | { kind: 'toast'; tone: 'success' | 'warning'; message: string }
    | { kind: 'export-completed' }
    | { kind: 'export-completed-with-optimization-warning'; count: number }
    | { kind: 'import-warning'; payload: AppStatusPayload };

export type LoadingState =
    | { kind: 'opening-files' }
    | { kind: 'merge-progress'; step: MergeProgressStep; progress: number };

export interface AppNotificationsState {
    status: StatusState | null;
    loading: LoadingState | null;
}

export type AppNotificationsAction =
    | { type: 'clear-status' }
    | { type: 'show-error'; message: string }
    | { type: 'show-import-warning'; payload: AppStatusPayload }
    | { type: 'show-merge-progress'; step: MergeProgressStep; progress: number }
    | { type: 'show-opening-files' }
    | { type: 'show-merge-preparing' }
    | { type: 'clear-loading' }
    | { type: 'show-export-completed' }
    | { type: 'show-export-completed-with-optimization-warning'; count: number }
    | { type: 'show-toast'; tone: 'success' | 'warning'; message: string };

export const initialAppNotificationsState: AppNotificationsState = {
    status: null,
    loading: null,
};

function statusForAction(action: AppNotificationsAction): StatusState | null | undefined {
    switch (action.type) {
        case 'clear-status':
            return null;
        case 'show-error':
            return { kind: 'error', message: action.message };
        case 'show-import-warning':
            return { kind: 'import-warning', payload: action.payload };
        case 'show-export-completed':
            return { kind: 'export-completed' };
        case 'show-export-completed-with-optimization-warning':
            return {
                kind: 'export-completed-with-optimization-warning',
                count: action.count,
            };
        case 'show-toast':
            return { kind: 'toast', tone: action.tone, message: action.message };
        default:
            return undefined;
    }
}

function loadingForAction(action: AppNotificationsAction): LoadingState | null | undefined {
    switch (action.type) {
        case 'show-merge-progress':
            return {
                kind: 'merge-progress',
                step: action.step,
                progress: action.progress,
            };
        case 'show-opening-files':
            return { kind: 'opening-files' };
        case 'show-merge-preparing':
            return { kind: 'merge-progress', step: 'preparing-documents', progress: 0 };
        case 'clear-loading':
            return null;
        default:
            return undefined;
    }
}

export function appNotificationsReducer(
    state: AppNotificationsState,
    action: AppNotificationsAction,
): AppNotificationsState {
    const status = statusForAction(action);
    if (status !== undefined) return { ...state, status };

    const loading = loadingForAction(action);
    if (loading !== undefined) return { ...state, loading };

    return state;
}
