import { motion } from 'motion/react';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { useTranslation } from '@/shared/i18n';
import { TutorialCard } from './TutorialCard';
import { getBackdropClipPath, getTargetRect, getTooltipStyle } from './tutorial.layout';
import type { TargetRect, TooltipSize } from './tutorial.positioning';
import {
    TUTORIAL_ESSENTIAL_STEP_COUNT,
    TUTORIAL_EXTRA_STEP_COUNT,
    TUTORIAL_STEPS,
} from './tutorial.steps';

const DEFAULT_CARD_SIZE: TooltipSize = { width: 320, height: 120 };

interface Props {
    currentStep: number;
    onNext: () => void;
    onSkip: () => void;
    onComplete: () => void;
}

type TutorialSpotlightVars = CSSProperties & {
    '--tutorial-spotlight-top': string;
    '--tutorial-spotlight-left': string;
    '--tutorial-spotlight-width': string;
    '--tutorial-spotlight-height': string;
};

function getStepLabel(currentStep: number, t: ReturnType<typeof useTranslation>['t']): string {
    if (currentStep < TUTORIAL_ESSENTIAL_STEP_COUNT) {
        return `${currentStep + 1} / ${TUTORIAL_ESSENTIAL_STEP_COUNT}`;
    }

    return t('tutorial.extraStepLabel', {
        current: currentStep - TUTORIAL_ESSENTIAL_STEP_COUNT + 1,
        total: TUTORIAL_EXTRA_STEP_COUNT,
    });
}

function sameTargetRect(a: TargetRect | null, b: TargetRect | null): boolean {
    if (a === b) return true;
    if (!a || !b) return false;

    return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

export function TutorialOverlay({ currentStep, onNext, onSkip, onComplete }: Props) {
    const { t } = useTranslation();
    const [cardEl, setCardEl] = useState<HTMLDivElement | null>(null);
    const [cardSize, setCardSize] = useState(DEFAULT_CARD_SIZE);
    const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
    const step = TUTORIAL_STEPS[currentStep];
    const target = step.target;
    const isLast = currentStep === TUTORIAL_STEPS.length - 1;
    const isEssentialEnd = currentStep === TUTORIAL_ESSENTIAL_STEP_COUNT - 1;
    const canShowExtraSteps = isEssentialEnd && TUTORIAL_EXTRA_STEP_COUNT > 0;
    const text = t(step.i18nKey);
    const stepLabel = getStepLabel(currentStep, t);
    const primaryLabel = isLast || isEssentialEnd ? t('tutorial.finish') : t('tutorial.next');
    const secondaryLabel = canShowExtraSteps
        ? t('tutorial.more')
        : isLast
          ? undefined
          : t('tutorial.skip');
    const onPrimary = isEssentialEnd ? onComplete : onNext;
    const onSecondary = canShowExtraSteps ? onNext : isLast ? undefined : onSkip;

    const measureTarget = useCallback(() => {
        const nextRect = getTargetRect(target);
        setTargetRect((current) => (sameTargetRect(current, nextRect) ? current : nextRect));
    }, [target]);

    useLayoutEffect(() => {
        measureTarget();
        const frame = window.requestAnimationFrame(measureTarget);
        const timeout = window.setTimeout(measureTarget, 50);

        return () => {
            window.cancelAnimationFrame(frame);
            window.clearTimeout(timeout);
        };
    }, [measureTarget]);

    useLayoutEffect(() => {
        const node = cardEl;
        if (!node) return;
        const measuredNode: HTMLDivElement = node;

        function updateCardSize() {
            setCardSize((current) => {
                const next = {
                    width: measuredNode.offsetWidth || DEFAULT_CARD_SIZE.width,
                    height: measuredNode.offsetHeight || DEFAULT_CARD_SIZE.height,
                };

                return current.width === next.width && current.height === next.height
                    ? current
                    : next;
            });
        }

        updateCardSize();

        const observer = new ResizeObserver(updateCardSize);
        observer.observe(measuredNode);

        return () => observer.disconnect();
    }, [cardEl]);

    useEffect(() => {
        window.addEventListener('resize', measureTarget);
        window.addEventListener('scroll', measureTarget, true);
        return () => {
            window.removeEventListener('resize', measureTarget);
            window.removeEventListener('scroll', measureTarget, true);
        };
    }, [measureTarget]);

    const rect = targetRect;
    const fadeProps = {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.2 },
    };

    if (!rect) {
        return (
            <motion.div
                className="dialog-backdrop dialog-backdrop-padded bg-black/55 z-[60]"
                {...fadeProps}
            >
                <TutorialCard
                    key={currentStep}
                    className="dialog-panel dialog-panel-bordered w-full max-w-xs rounded-xl p-4"
                    cardRef={setCardEl}
                    text={text}
                    stepLabel={stepLabel}
                    primaryLabel={primaryLabel}
                    secondaryLabel={secondaryLabel}
                    onPrimary={onPrimary}
                    onSecondary={onSecondary}
                />
            </motion.div>
        );
    }

    const tooltipStyle = getTooltipStyle(rect, window.innerWidth, window.innerHeight, cardSize);
    const spotlightVars = {
        '--tutorial-spotlight-top': `${rect.top}px`,
        '--tutorial-spotlight-left': `${rect.left}px`,
        '--tutorial-spotlight-width': `${rect.width}px`,
        '--tutorial-spotlight-height': `${rect.height}px`,
    } satisfies TutorialSpotlightVars;

    return (
        <motion.div className="fixed inset-0 z-[60]" {...fadeProps}>
            {/* Dark backdrop with spotlight cutout via box-shadow */}
            <motion.div
                className="pointer-events-none absolute rounded-xl"
                animate={spotlightVars}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                style={{
                    top: 'var(--tutorial-spotlight-top)',
                    left: 'var(--tutorial-spotlight-left)',
                    width: 'var(--tutorial-spotlight-width)',
                    height: 'var(--tutorial-spotlight-height)',
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
                }}
            />

            {/* Click-blocker on the dark area (not the spotlight) */}
            <div
                className="absolute inset-0"
                onClick={(e) => e.stopPropagation()}
                style={{ clipPath: getBackdropClipPath(rect) }}
            />

            {/* Tooltip card */}
            <TutorialCard
                key={currentStep}
                className="dialog-panel dialog-panel-bordered absolute max-w-xs rounded-xl p-4"
                cardRef={setCardEl}
                style={tooltipStyle}
                text={text}
                stepLabel={stepLabel}
                primaryLabel={primaryLabel}
                secondaryLabel={secondaryLabel}
                onPrimary={onPrimary}
                onSecondary={onSecondary}
            />
        </motion.div>
    );
}
