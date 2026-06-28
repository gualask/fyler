export interface TutorialState {
    currentStep: number | null;
    autoStartRequested: boolean;
    markSeenOnClose: boolean;
}

export type TutorialAction =
    | { type: 'start' }
    | { type: 'complete' }
    | { type: 'next'; totalSteps: number }
    | { type: 'request-auto-start' }
    | { type: 'cancel-auto-start-request' }
    | { type: 'auto-start-fired' }
    | { type: 'mark-seen-handled' };

export const initialTutorialState: TutorialState = {
    currentStep: null,
    autoStartRequested: false,
    markSeenOnClose: false,
};

function startTutorial(): TutorialState {
    return {
        currentStep: 0,
        autoStartRequested: false,
        markSeenOnClose: false,
    };
}

function closeTutorialAfterLastStep(): TutorialState {
    return {
        currentStep: null,
        autoStartRequested: false,
        markSeenOnClose: true,
    };
}

function advanceTutorialStep(state: TutorialState, totalSteps: number): TutorialState {
    if (state.currentStep === null) return state;
    if (state.currentStep >= totalSteps - 1) return closeTutorialAfterLastStep();

    return {
        ...state,
        currentStep: state.currentStep + 1,
    };
}

function cancelAutoStartRequest(state: TutorialState): TutorialState {
    return state.autoStartRequested ? { ...state, autoStartRequested: false } : state;
}

function fireAutoStart(state: TutorialState): TutorialState {
    if (!state.autoStartRequested || state.currentStep !== null) return state;
    return startTutorial();
}

function markSeenHandled(state: TutorialState): TutorialState {
    return state.markSeenOnClose ? { ...state, markSeenOnClose: false } : state;
}

export function tutorialReducer(state: TutorialState, action: TutorialAction): TutorialState {
    switch (action.type) {
        case 'start':
            return startTutorial();
        case 'complete':
            return initialTutorialState;
        case 'next':
            return advanceTutorialStep(state, action.totalSteps);
        case 'request-auto-start':
            return {
                ...state,
                autoStartRequested: true,
            };
        case 'cancel-auto-start-request':
            return cancelAutoStartRequest(state);
        case 'auto-start-fired':
            return fireAutoStart(state);
        case 'mark-seen-handled':
            return markSeenHandled(state);
        default:
            return state;
    }
}
