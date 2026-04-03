import { useEffect, useReducer } from 'react';
import { useTranslation } from '@/shared/i18n';
import { TutorialCard } from './TutorialCard';
import { getBackdropClipPath, getTargetRect, getTooltipStyle } from './tutorial.layout';
import { TUTORIAL_STEPS } from './tutorial.steps';

interface Props {
    currentStep: number;
    onNext: () => void;
    onSkip: () => void;
}

export function TutorialOverlay({ currentStep, onNext, onSkip }: Props) {
    const { t } = useTranslation();
    const step = TUTORIAL_STEPS[currentStep];
    const isLast = currentStep === TUTORIAL_STEPS.length - 1;
    const text = t(step.i18nKey);
    const stepLabel = `${currentStep + 1} / ${TUTORIAL_STEPS.length}`;
    const skipLabel = t('tutorial.skip');
    const nextLabel = isLast ? t('tutorial.finish') : t('tutorial.next');

    // Force re-render on resize to recalculate rect
    const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
    useEffect(() => {
        window.addEventListener('resize', forceUpdate);
        window.addEventListener('scroll', forceUpdate, true);
        return () => {
            window.removeEventListener('resize', forceUpdate);
            window.removeEventListener('scroll', forceUpdate, true);
        };
    }, []);

    // Calculate rect during render (no setState needed)
    const rect = getTargetRect(step.target);
    if (!rect) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 px-4">
                <TutorialCard
                    className="w-full max-w-xs rounded-xl border border-ui-border bg-ui-surface p-4 shadow-2xl"
                    text={text}
                    stepLabel={stepLabel}
                    skipLabel={skipLabel}
                    nextLabel={nextLabel}
                    onNext={onNext}
                    onSkip={onSkip}
                />
            </div>
        );
    }

    const tooltipStyle = getTooltipStyle(rect);

    return (
        <div className="fixed inset-0 z-[60]">
            {/* Dark backdrop with spotlight cutout via box-shadow */}
            <div
                className="pointer-events-none absolute rounded-xl"
                style={{
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
                }}
            />

            {/* Click-blocker on the dark area (not the spotlight) */}
            <div
                className="absolute inset-0"
                onClick={(e) => e.stopPropagation()}
                style={{
                    clipPath: getBackdropClipPath(rect),
                }}
            />

            {/* Tooltip card */}
            <TutorialCard
                className="absolute max-w-xs rounded-xl border border-ui-border bg-ui-surface p-4 shadow-2xl"
                style={tooltipStyle}
                text={text}
                stepLabel={stepLabel}
                skipLabel={skipLabel}
                nextLabel={nextLabel}
                onNext={onNext}
                onSkip={onSkip}
            />
        </div>
    );
}
