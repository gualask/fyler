export interface QuickAddState {
    isQuickAdd: boolean;
    isTransitioning: boolean;
    quickAddFileOrder: string[];
    isQuickAddSessionActive: boolean;
}

export type QuickAddAction =
    | { type: 'enter-started' }
    | { type: 'enter-completed' }
    | { type: 'enter-failed' }
    | { type: 'exit-started' }
    | { type: 'exit-completed' }
    | { type: 'exit-failed' }
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

type QuickAddReducerMap = {
    [Action in QuickAddAction as Action['type']]: (
        state: QuickAddState,
        action: Action,
    ) => QuickAddState;
};

type QuickAddReducerHandler = (state: QuickAddState, action: QuickAddAction) => QuickAddState;

function enterStarted(state: QuickAddState): QuickAddState {
    return {
        ...state,
        isTransitioning: true,
        quickAddFileOrder: [],
        isQuickAddSessionActive: true,
    };
}

function enterCompleted(state: QuickAddState): QuickAddState {
    return {
        ...state,
        isQuickAdd: true,
    };
}

function enterFailed(state: QuickAddState): QuickAddState {
    return {
        ...state,
        isQuickAdd: false,
        isTransitioning: false,
        quickAddFileOrder: [],
        isQuickAddSessionActive: false,
    };
}

function exitStarted(state: QuickAddState): QuickAddState {
    return {
        ...state,
        isTransitioning: true,
        isQuickAddSessionActive: false,
    };
}

function exitCompleted(state: QuickAddState): QuickAddState {
    return {
        ...state,
        isQuickAdd: false,
        quickAddFileOrder: [],
    };
}

function exitFailed(state: QuickAddState): QuickAddState {
    return {
        ...state,
        isQuickAdd: true,
        isTransitioning: false,
        isQuickAddSessionActive: true,
    };
}

function transitionFinished(state: QuickAddState): QuickAddState {
    return {
        ...state,
        isTransitioning: false,
    };
}

function filesAdded(
    state: QuickAddState,
    action: Extract<QuickAddAction, { type: 'files-added' }>,
): QuickAddState {
    if (!state.isQuickAddSessionActive) return state;
    return {
        ...state,
        quickAddFileOrder: prependRecentQuickAddIds(state.quickAddFileOrder, action.ids),
    };
}

function fileRemoved(
    state: QuickAddState,
    action: Extract<QuickAddAction, { type: 'file-removed' }>,
): QuickAddState {
    if (!state.isQuickAddSessionActive) return state;
    return {
        ...state,
        quickAddFileOrder: removeQuickAddId(state.quickAddFileOrder, action.id),
    };
}

const quickAddReducers = {
    'enter-started': enterStarted,
    'enter-completed': enterCompleted,
    'enter-failed': enterFailed,
    'exit-started': exitStarted,
    'exit-completed': exitCompleted,
    'exit-failed': exitFailed,
    'transition-finished': transitionFinished,
    'files-added': filesAdded,
    'file-removed': fileRemoved,
} satisfies QuickAddReducerMap;

export function quickAddReducer(state: QuickAddState, action: QuickAddAction): QuickAddState {
    const reduce = quickAddReducers[action.type] as QuickAddReducerHandler;
    return reduce(state, action);
}
