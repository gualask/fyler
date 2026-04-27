import { useCallback, useEffect, useReducer, useRef } from 'react';
import { usePreferences } from '@/shared/preferences';
import { initialTutorialState, tutorialReducer } from './tutorial.reducer';
import { TUTORIAL_STEPS } from './tutorial.steps';

type TutorialAutoStartEffect = 'arm-timeout' | 'cancel-request' | 'clear-timeout' | 'none';

export function resolveTutorialAutoStartEffect({
    isReady,
    tutorialSeen,
    autoStartRequested,
    currentStep,
    hasPendingTimeout,
}: {
    isReady: boolean;
    tutorialSeen: boolean;
    autoStartRequested: boolean;
    currentStep: number | null;
    hasPendingTimeout: boolean;
}): TutorialAutoStartEffect {
    if (!isReady) return 'clear-timeout';
    if (tutorialSeen) return 'cancel-request';
    if (!autoStartRequested) return 'none';
    if (currentStep !== null) return 'none';
    if (hasPendingTimeout) return 'none';

    return 'arm-timeout';
}

export function useTutorial() {
    const { tutorialSeen, markTutorialSeen } = usePreferences();
    const [state, dispatch] = useReducer(tutorialReducer, initialTutorialState);
    const { currentStep, autoStartRequested, markSeenOnClose } = state;
    const startTimeoutRef = useRef<number | null>(null);

    const isActive = currentStep !== null;

    const clearStartTimeout = useCallback(() => {
        if (startTimeoutRef.current !== null) {
            window.clearTimeout(startTimeoutRef.current);
            startTimeoutRef.current = null;
        }
    }, []);

    const complete = useCallback(() => {
        clearStartTimeout();
        dispatch({ type: 'complete' });
        markTutorialSeen();
    }, [clearStartTimeout, markTutorialSeen]);

    const start = useCallback(() => {
        clearStartTimeout();
        dispatch({ type: 'start' });
    }, [clearStartTimeout]);

    const next = useCallback(() => {
        dispatch({ type: 'next', totalSteps: TUTORIAL_STEPS.length });
    }, []);

    const requestAutoStart = useCallback(() => {
        if (tutorialSeen) return;
        dispatch({ type: 'request-auto-start' });
    }, [tutorialSeen]);

    const maybeAutoStart = useCallback(
        (isReady: boolean) => {
            const effect = resolveTutorialAutoStartEffect({
                isReady,
                tutorialSeen,
                autoStartRequested,
                currentStep,
                hasPendingTimeout: startTimeoutRef.current !== null,
            });

            if (effect === 'clear-timeout') {
                clearStartTimeout();
                return;
            }

            if (effect === 'cancel-request') {
                clearStartTimeout();
                dispatch({ type: 'cancel-auto-start-request' });
                return;
            }

            if (effect !== 'arm-timeout') return;

            // Delay to let the workspace layout settle before measuring tutorial targets.
            startTimeoutRef.current = window.setTimeout(() => {
                startTimeoutRef.current = null;
                dispatch({ type: 'auto-start-fired' });
            }, 300);
        },
        [autoStartRequested, clearStartTimeout, currentStep, tutorialSeen],
    );

    useEffect(() => clearStartTimeout, [clearStartTimeout]);

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
