import { motion, useReducedMotion } from 'motion/react';
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
const FADE_PROPS = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
};

interface Props {
    currentStep: number;
    onNext: () => void;
    onSkip: () => void;
    onComplete: () => void;
}

type TutorialSpotlightVars = {
    '--tutorial-spotlight-top': string;
    '--tutorial-spotlight-left': string;
    '--tutorial-spotlight-width': string;
    '--tutorial-spotlight-height': string;
};

type TutorialTranslate = ReturnType<typeof useTranslation>['t'];

type TutorialCardContent = {
    text: string;
    stepLabel: string;
    primaryLabel: string;
    secondaryLabel?: string;
    onPrimary: () => void;
    onSecondary?: () => void;
};

type TutorialCardProps = TutorialCardContent & {
    cardRef: (node: HTMLDivElement | null) => void;
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

function measuredTooltipSize(node: HTMLDivElement): TooltipSize {
    return {
        width: node.offsetWidth || DEFAULT_CARD_SIZE.width,
        height: node.offsetHeight || DEFAULT_CARD_SIZE.height,
    };
}

function sameTooltipSize(a: TooltipSize, b: TooltipSize): boolean {
    return a.width === b.width && a.height === b.height;
}

function useMeasuredTutorialCard() {
    const [cardSize, setCardSize] = useState(DEFAULT_CARD_SIZE);
    const [cardEl, setCardEl] = useState<HTMLDivElement | null>(null);

    useLayoutEffect(() => {
        const measuredNode = cardEl;
        if (!measuredNode) return;
        const node: HTMLDivElement = measuredNode;

        function updateCardSize() {
            setCardSize((current) => {
                const next = measuredTooltipSize(node);
                return sameTooltipSize(current, next) ? current : next;
            });
        }

        updateCardSize();

        const observer = new ResizeObserver(updateCardSize);
        observer.observe(node);

        return () => observer.disconnect();
    }, [cardEl]);

    return { cardSize, setCardEl };
}

function useTutorialTargetRect(target: string): TargetRect | null {
    const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

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

    useEffect(() => {
        window.addEventListener('resize', measureTarget);
        window.addEventListener('scroll', measureTarget, true);
        return () => {
            window.removeEventListener('resize', measureTarget);
            window.removeEventListener('scroll', measureTarget, true);
        };
    }, [measureTarget]);

    return targetRect;
}

function getTutorialCardContent(
    currentStep: number,
    t: TutorialTranslate,
    { onNext, onSkip, onComplete }: Pick<Props, 'onNext' | 'onSkip' | 'onComplete'>,
): TutorialCardContent {
    const step = TUTORIAL_STEPS[currentStep];
    const isLast = currentStep === TUTORIAL_STEPS.length - 1;
    const isEssentialEnd = currentStep === TUTORIAL_ESSENTIAL_STEP_COUNT - 1;
    const canShowExtraSteps = isEssentialEnd && TUTORIAL_EXTRA_STEP_COUNT > 0;

    return {
        text: t(step.i18nKey),
        stepLabel: getStepLabel(currentStep, t),
        primaryLabel: isLast || isEssentialEnd ? t('tutorial.finish') : t('tutorial.next'),
        secondaryLabel: canShowExtraSteps
            ? t('tutorial.more')
            : isLast
              ? undefined
              : t('tutorial.skip'),
        onPrimary: isEssentialEnd ? onComplete : onNext,
        onSecondary: canShowExtraSteps ? onNext : isLast ? undefined : onSkip,
    };
}

function getSpotlightVars(rect: TargetRect): TutorialSpotlightVars {
    return {
        '--tutorial-spotlight-top': `${rect.top}px`,
        '--tutorial-spotlight-left': `${rect.left}px`,
        '--tutorial-spotlight-width': `${rect.width}px`,
        '--tutorial-spotlight-height': `${rect.height}px`,
    };
}

function TutorialFallbackOverlay({
    currentStep,
    cardProps,
}: {
    currentStep: number;
    cardProps: TutorialCardProps;
}) {
    return (
        <motion.div
            className="dialog-backdrop dialog-backdrop-padded bg-black/55 z-[60]"
            {...FADE_PROPS}
        >
            <TutorialCard
                key={currentStep}
                className="dialog-panel dialog-panel-bordered w-full max-w-xs rounded-xl p-4"
                {...cardProps}
            />
        </motion.div>
    );
}

function TutorialSpotlightMask({
    rect,
    reduceMotion,
}: {
    rect: TargetRect;
    reduceMotion: boolean | null;
}) {
    return (
        <motion.div
            className="pointer-events-none absolute rounded-xl"
            animate={getSpotlightVars(rect)}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
                top: 'var(--tutorial-spotlight-top)',
                left: 'var(--tutorial-spotlight-left)',
                width: 'var(--tutorial-spotlight-width)',
                height: 'var(--tutorial-spotlight-height)',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
            }}
        />
    );
}

function TutorialBackdropBlocker({ rect }: { rect: TargetRect }) {
    return (
        <div
            className="absolute inset-0"
            onClick={(event) => event.stopPropagation()}
            style={{ clipPath: getBackdropClipPath(rect) }}
        />
    );
}

function TutorialSpotlightOverlay({
    currentStep,
    rect,
    cardSize,
    cardProps,
    reduceMotion,
}: {
    currentStep: number;
    rect: TargetRect;
    cardSize: TooltipSize;
    cardProps: TutorialCardProps;
    reduceMotion: boolean | null;
}) {
    const tooltipStyle = getTooltipStyle(rect, window.innerWidth, window.innerHeight, cardSize);
    return (
        <motion.div className="fixed inset-0 z-[60]" {...FADE_PROPS}>
            <TutorialSpotlightMask rect={rect} reduceMotion={reduceMotion} />
            <TutorialBackdropBlocker rect={rect} />
            <TutorialCard
                key={currentStep}
                className="dialog-panel dialog-panel-bordered absolute max-w-xs rounded-xl p-4"
                style={tooltipStyle}
                {...cardProps}
            />
        </motion.div>
    );
}

export function TutorialOverlay({ currentStep, onNext, onSkip, onComplete }: Props) {
    const { t } = useTranslation();
    const reduceMotion = useReducedMotion();
    const step = TUTORIAL_STEPS[currentStep];
    const rect = useTutorialTargetRect(step.target);
    const { cardSize, setCardEl } = useMeasuredTutorialCard();
    const cardContent = getTutorialCardContent(currentStep, t, {
        onNext,
        onSkip,
        onComplete,
    });

    const cardProps = {
        ...cardContent,
        cardRef: setCardEl,
    };

    if (!rect) return <TutorialFallbackOverlay currentStep={currentStep} cardProps={cardProps} />;

    return (
        <TutorialSpotlightOverlay
            currentStep={currentStep}
            rect={rect}
            cardSize={cardSize}
            cardProps={cardProps}
            reduceMotion={reduceMotion}
        />
    );
}
