export interface QuickAddState {
    isQuickAdd: boolean;
    isTransitioning: boolean;
    quickAddFileOrder: string[];
    isQuickAddSessionActive: boolean;
}

export type QuickAddAction =
    | { type: 'enter-started' }
    | { type: 'enter-completed' }
    | { type: 'exit-started' }
    | { type: 'exit-completed' }
    | { type: 'transition-finished' }
    | { type: 'files-added'; ids: string[] }
    | { type: 'file-removed'; id: string };

export const initialQuickAddState: QuickAddState = {
    isQuickAdd: false,
    isTransitioning: false,
    quickAddFileOrder: [],
    isQuickAddSessionActive: false,
};

export function prependRecentQuickAddIds(previousIds: string[], addedIds: string[]): string[] {
    const addedSet = new Set(addedIds);
    return [...addedIds, ...previousIds.filter((id) => !addedSet.has(id))];
}

export function removeQuickAddId(previousIds: string[], removedId: string): string[] {
    return previousIds.filter((id) => id !== removedId);
}

export function quickAddReducer(state: QuickAddState, action: QuickAddAction): QuickAddState {
    switch (action.type) {
        case 'enter-started':
            return {
                ...state,
                isTransitioning: true,
                quickAddFileOrder: [],
                isQuickAddSessionActive: true,
            };
        case 'enter-completed':
            return {
                ...state,
                isQuickAdd: true,
            };
        case 'exit-started':
            return {
                ...state,
                isTransitioning: true,
                isQuickAddSessionActive: false,
            };
        case 'exit-completed':
            return {
                ...state,
                isQuickAdd: false,
                quickAddFileOrder: [],
            };
        case 'transition-finished':
            return {
                ...state,
                isTransitioning: false,
            };
        case 'files-added':
            if (!state.isQuickAddSessionActive) return state;
            return {
                ...state,
                quickAddFileOrder: prependRecentQuickAddIds(state.quickAddFileOrder, action.ids),
            };
        case 'file-removed':
            if (!state.isQuickAddSessionActive) return state;
            return {
                ...state,
                quickAddFileOrder: removeQuickAddId(state.quickAddFileOrder, action.id),
            };
        default:
            return state;
    }
}
