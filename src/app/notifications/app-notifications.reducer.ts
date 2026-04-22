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

export function appNotificationsReducer(
    state: AppNotificationsState,
    action: AppNotificationsAction,
): AppNotificationsState {
    switch (action.type) {
        case 'clear-status':
            return { ...state, status: null };
        case 'show-error':
            return { ...state, status: { kind: 'error', message: action.message } };
        case 'show-import-warning':
            return { ...state, status: { kind: 'import-warning', payload: action.payload } };
        case 'show-merge-progress':
            return {
                ...state,
                loading: {
                    kind: 'merge-progress',
                    step: action.step,
                    progress: action.progress,
                },
            };
        case 'show-opening-files':
            return { ...state, loading: { kind: 'opening-files' } };
        case 'show-merge-preparing':
            return {
                ...state,
                loading: { kind: 'merge-progress', step: 'preparing-documents', progress: 0 },
            };
        case 'clear-loading':
            return { ...state, loading: null };
        case 'show-export-completed':
            return { ...state, status: { kind: 'export-completed' } };
        case 'show-export-completed-with-optimization-warning':
            return {
                ...state,
                status: {
                    kind: 'export-completed-with-optimization-warning',
                    count: action.count,
                },
            };
        case 'show-toast':
            return {
                ...state,
                status: { kind: 'toast', tone: action.tone, message: action.message },
            };
        default:
            return state;
    }
}
