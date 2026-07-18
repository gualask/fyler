import type { AppStatusPayload, MergeProgressStep } from './app-events.types';

export type StatusState =
    | { kind: 'error'; message: string }
    | { kind: 'toast'; tone: 'success' | 'warning'; message: string }
    | { kind: 'export-completed' }
    | { kind: 'export-completed-with-optimization-warning'; count: number }
    | { kind: 'import-warning'; payload: AppStatusPayload };

export type LoadingState =
    | { kind: 'opening-files'; completed?: number; total?: number }
    | { kind: 'merge-progress'; step: MergeProgressStep; progress: number };

export interface AppNotificationsState {
    status: StatusState | null;
    loading: LoadingState | null;
}

export type AppNotificationsAction =
    | { type: 'clear-status' }
    | { type: 'show-error'; message: string }
    | { type: 'show-import-warning'; payload: AppStatusPayload }
    | { type: 'show-import-progress'; completed: number; total: number }
    | { type: 'show-merge-progress'; step: MergeProgressStep; progress: number }
    | { type: 'show-opening-files' }
    | { type: 'finish-opening-files' }
    | { type: 'show-merge-preparing' }
    | { type: 'finish-merge' }
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

function normalizedImportProgress(
    loading: Extract<LoadingState, { kind: 'opening-files' }>,
    completed: number,
    total: number,
): Extract<LoadingState, { kind: 'opening-files' }> {
    const normalizedTotal = Math.max(0, Math.floor(total));
    const normalizedCompleted = Math.min(normalizedTotal, Math.max(0, Math.floor(completed)));
    const nextCompleted =
        loading.total === normalizedTotal
            ? Math.max(loading.completed ?? 0, normalizedCompleted)
            : normalizedCompleted;

    return {
        kind: 'opening-files',
        completed: nextCompleted,
        total: normalizedTotal,
    };
}

export function appNotificationsReducer(
    state: AppNotificationsState,
    action: AppNotificationsAction,
): AppNotificationsState {
    if (action.type === 'show-opening-files') {
        return state.loading === null ? { ...state, loading: { kind: 'opening-files' } } : state;
    }

    if (action.type === 'show-import-progress') {
        if (state.loading?.kind !== 'opening-files') return state;
        return {
            ...state,
            loading: normalizedImportProgress(state.loading, action.completed, action.total),
        };
    }

    if (action.type === 'finish-opening-files') {
        return state.loading?.kind === 'opening-files' ? { ...state, loading: null } : state;
    }

    if (action.type === 'show-merge-preparing') {
        if (state.loading !== null) return state;
        return {
            ...state,
            loading: { kind: 'merge-progress', step: 'preparing-documents', progress: 0 },
        };
    }

    if (action.type === 'show-merge-progress') {
        if (state.loading?.kind !== 'merge-progress') return state;
        return {
            ...state,
            loading: {
                kind: 'merge-progress',
                step: action.step,
                progress: action.progress,
            },
        };
    }

    if (action.type === 'finish-merge') {
        return state.loading?.kind === 'merge-progress' ? { ...state, loading: null } : state;
    }

    const status = statusForAction(action);
    if (status !== undefined) return { ...state, status };

    return state;
}
