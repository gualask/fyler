import type { AvailableUpdate } from '@/infra/platform/updater';

export interface AppUpdaterState {
    update: AvailableUpdate | null;
    available: boolean;
    version: string | null;
    installing: boolean;
    progress: number | null;
    dismissed: boolean;
    error: string | null;
}

export type AppUpdaterAction =
    | { type: 'update-found'; update: AvailableUpdate }
    | { type: 'install-started' }
    | { type: 'install-progress'; progress: number | null }
    | { type: 'install-failed'; error: string }
    | { type: 'dismissed' };

export const initialAppUpdaterState: AppUpdaterState = {
    update: null,
    available: false,
    version: null,
    installing: false,
    progress: null,
    dismissed: false,
    error: null,
};

export function appUpdaterReducer(
    state: AppUpdaterState,
    action: AppUpdaterAction,
): AppUpdaterState {
    switch (action.type) {
        case 'update-found':
            return {
                ...state,
                update: action.update,
                available: true,
                version: action.update.version,
            };
        case 'install-started':
            return {
                ...state,
                installing: true,
                progress: 0,
                error: null,
            };
        case 'install-progress':
            return {
                ...state,
                progress: action.progress,
            };
        case 'install-failed':
            return {
                ...state,
                installing: false,
                progress: null,
                error: action.error,
            };
        case 'dismissed':
            return {
                ...state,
                dismissed: true,
                error: null,
            };
        default:
            return state;
    }
}
