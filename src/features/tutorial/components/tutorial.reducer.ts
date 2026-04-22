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

export function tutorialReducer(state: TutorialState, action: TutorialAction): TutorialState {
    switch (action.type) {
        case 'start':
            return {
                currentStep: 0,
                autoStartRequested: false,
                markSeenOnClose: false,
            };
        case 'complete':
            return initialTutorialState;
        case 'next':
            if (state.currentStep === null) return state;
            if (state.currentStep >= action.totalSteps - 1) {
                return {
                    currentStep: null,
                    autoStartRequested: false,
                    markSeenOnClose: true,
                };
            }
            return {
                ...state,
                currentStep: state.currentStep + 1,
            };
        case 'request-auto-start':
            return {
                ...state,
                autoStartRequested: true,
            };
        case 'cancel-auto-start-request':
            return state.autoStartRequested ? { ...state, autoStartRequested: false } : state;
        case 'auto-start-fired':
            if (!state.autoStartRequested || state.currentStep !== null) return state;
            return {
                currentStep: 0,
                autoStartRequested: false,
                markSeenOnClose: false,
            };
        case 'mark-seen-handled':
            return state.markSeenOnClose ? { ...state, markSeenOnClose: false } : state;
        default:
            return state;
    }
}
