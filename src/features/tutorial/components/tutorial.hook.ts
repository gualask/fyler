import { useCallback, useEffect, useRef, useState } from 'react';
import { usePreferences } from '@/shared/preferences';
import { TUTORIAL_STEPS } from './tutorial.steps';

export function useTutorial() {
    const { tutorialSeen, markTutorialSeen } = usePreferences();
    const [currentStep, setCurrentStep] = useState<number | null>(null);
    const startTimeoutRef = useRef<number | null>(null);
    const markSeenOnCloseRef = useRef(false);
    const autoStartRequestedRef = useRef(false);

    const isActive = currentStep !== null;

    const complete = useCallback(() => {
        if (startTimeoutRef.current !== null) {
            window.clearTimeout(startTimeoutRef.current);
            startTimeoutRef.current = null;
        }
        markSeenOnCloseRef.current = false;
        autoStartRequestedRef.current = false;
        setCurrentStep(null);
        markTutorialSeen();
    }, [markTutorialSeen]);

    const start = useCallback(() => {
        if (startTimeoutRef.current !== null) {
            window.clearTimeout(startTimeoutRef.current);
            startTimeoutRef.current = null;
        }
        autoStartRequestedRef.current = false;
        setCurrentStep(0);
    }, []);

    const next = useCallback(() => {
        setCurrentStep((step) => {
            if (step === null) return null;
            if (step >= TUTORIAL_STEPS.length - 1) {
                markSeenOnCloseRef.current = true;
                return null;
            }
            return step + 1;
        });
    }, []);

    const requestAutoStart = useCallback(() => {
        if (tutorialSeen) return;
        autoStartRequestedRef.current = true;
    }, [tutorialSeen]);

    const maybeAutoStart = useCallback(
        (isReady: boolean) => {
            if (!isReady) return;
            if (tutorialSeen) {
                autoStartRequestedRef.current = false;
                return;
            }
            if (!autoStartRequestedRef.current) return;
            if (currentStep !== null) return;
            if (startTimeoutRef.current !== null) return;

            // Delay to let the workspace layout settle before measuring tutorial targets.
            startTimeoutRef.current = window.setTimeout(() => {
                startTimeoutRef.current = null;
                if (!autoStartRequestedRef.current) return;
                autoStartRequestedRef.current = false;
                setCurrentStep(0);
            }, 300);
        },
        [currentStep, tutorialSeen],
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
        if (!markSeenOnCloseRef.current) return;
        markSeenOnCloseRef.current = false;
        markTutorialSeen();
    }, [currentStep, markTutorialSeen]);

    return {
        currentStep,
        isActive,
        start,
        next,
        skip: complete,
        requestAutoStart,
        maybeAutoStart,
    };
}
