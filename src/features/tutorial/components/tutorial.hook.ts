import { useCallback, useEffect, useReducer, useRef } from 'react';
import { usePreferences } from '@/shared/preferences';
import { initialTutorialState, tutorialReducer } from './tutorial.reducer';
import { TUTORIAL_STEPS } from './tutorial.steps';

export function useTutorial() {
    const { tutorialSeen, markTutorialSeen } = usePreferences();
    const [state, dispatch] = useReducer(tutorialReducer, initialTutorialState);
    const { currentStep, autoStartRequested, markSeenOnClose } = state;
    const startTimeoutRef = useRef<number | null>(null);

    const isActive = currentStep !== null;

    const complete = useCallback(() => {
        if (startTimeoutRef.current !== null) {
            window.clearTimeout(startTimeoutRef.current);
            startTimeoutRef.current = null;
        }
        dispatch({ type: 'complete' });
        markTutorialSeen();
    }, [markTutorialSeen]);

    const start = useCallback(() => {
        if (startTimeoutRef.current !== null) {
            window.clearTimeout(startTimeoutRef.current);
            startTimeoutRef.current = null;
        }
        dispatch({ type: 'start' });
    }, []);

    const next = useCallback(() => {
        dispatch({ type: 'next', totalSteps: TUTORIAL_STEPS.length });
    }, []);

    const requestAutoStart = useCallback(() => {
        if (tutorialSeen) return;
        dispatch({ type: 'request-auto-start' });
    }, [tutorialSeen]);

    const maybeAutoStart = useCallback(
        (isReady: boolean) => {
            if (!isReady) return;
            if (tutorialSeen) {
                dispatch({ type: 'cancel-auto-start-request' });
                return;
            }
            if (!autoStartRequested) return;
            if (currentStep !== null) return;
            if (startTimeoutRef.current !== null) return;

            // Delay to let the workspace layout settle before measuring tutorial targets.
            startTimeoutRef.current = window.setTimeout(() => {
                startTimeoutRef.current = null;
                dispatch({ type: 'auto-start-fired' });
            }, 300);
        },
        [autoStartRequested, currentStep, tutorialSeen],
    );

    useEffect(
        () => () => {
            if (startTimeoutRef.current !== null) {
                window.clearTimeout(startTimeoutRef.current);
                startTimeoutRef.current = null;
            }
        },
        [],
    );

    useEffect(() => {
        if (currentStep !== null) return;
        if (!markSeenOnClose) return;
        markTutorialSeen();
        dispatch({ type: 'mark-seen-handled' });
    }, [currentStep, markSeenOnClose, markTutorialSeen]);

    return {
        currentStep,
        isActive,
        start,
        next,
        complete,
        skip: complete,
        requestAutoStart,
        maybeAutoStart,
    };
}
