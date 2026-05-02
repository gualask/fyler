export interface QuickAddTransitionResult {
    started: boolean;
}

type QuickAddTransitionTask = () => Promise<void>;

const TRANSITION_STARTED_RESULT: QuickAddTransitionResult = { started: true };
const TRANSITION_IGNORED_RESULT: QuickAddTransitionResult = { started: false };

export function createQuickAddTransitionRunner() {
    let currentTransition: Promise<QuickAddTransitionResult> | null = null;

    return (task: QuickAddTransitionTask): Promise<QuickAddTransitionResult> => {
        if (currentTransition) return Promise.resolve(TRANSITION_IGNORED_RESULT);

        const transition = Promise.resolve()
            .then(task)
            .then(() => TRANSITION_STARTED_RESULT);
        currentTransition = transition;

        const clearTransition = () => {
            if (currentTransition === transition) currentTransition = null;
        };

        void transition.then(clearTransition, clearTransition);

        return transition;
    };
}
