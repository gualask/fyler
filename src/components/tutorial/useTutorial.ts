import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppPreferences } from '@/i18n/context';
import { TUTORIAL_STEPS } from './steps';

export function useTutorial() {
    const { tutorialSeen, markTutorialSeen } = useAppPreferences();
    const [currentStep, setCurrentStep] = useState<number | null>(null);
    const startTimeoutRef = useRef<number | null>(null);
    const markSeenOnCloseRef = useRef(false);

    const isActive = currentStep !== null;

    const complete = useCallback(() => {
        if (startTimeoutRef.current !== null) {
            window.clearTimeout(startTimeoutRef.current);
            startTimeoutRef.current = null;
        }
        markSeenOnCloseRef.current = false;
        setCurrentStep(null);
        markTutorialSeen();
    }, [markTutorialSeen]);

    const start = useCallback(() => {
        if (startTimeoutRef.current !== null) {
            window.clearTimeout(startTimeoutRef.current);
            startTimeoutRef.current = null;
        }
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

    // Called when first files are added — triggers tutorial if not seen
    const onFirstFilesAdded = useCallback(() => {
        if (tutorialSeen) return;
        if (currentStep !== null) return;
        if (startTimeoutRef.current !== null) return;

        // Delay to let the 3-column layout render before measuring
        startTimeoutRef.current = window.setTimeout(() => {
            startTimeoutRef.current = null;
            setCurrentStep(0);
        }, 300);
    }, [currentStep, tutorialSeen]);

    useEffect(() => () => {
        if (startTimeoutRef.current !== null) {
            window.clearTimeout(startTimeoutRef.current);
            startTimeoutRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (currentStep !== null) return;
        if (!markSeenOnCloseRef.current) return;
        markSeenOnCloseRef.current = false;
        markTutorialSeen();
    }, [currentStep, markTutorialSeen]);

    return { currentStep, isActive, start, next, skip: complete, onFirstFilesAdded };
}
