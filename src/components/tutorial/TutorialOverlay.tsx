import { useEffect, useReducer } from 'react';
import { useTranslation } from '@/i18n';
import { TUTORIAL_STEPS } from './steps';

interface Props {
    currentStep: number;
    onNext: () => void;
    onSkip: () => void;
}

interface TargetRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

const TOOLTIP_WIDTH = 320;
const TOOLTIP_ESTIMATED_HEIGHT = 120;
const GAP = 12;

function TutorialCard({
    text,
    stepLabel,
    skipLabel,
    nextLabel,
    className,
    style,
    onNext,
    onSkip,
}: {
    text: string;
    stepLabel: string;
    skipLabel: string;
    nextLabel: string;
    className: string;
    style?: React.CSSProperties;
    onNext: () => void;
    onSkip: () => void;
}) {
    return (
        <div className={className} style={style}>
            <p className="text-sm text-ui-text">
                {text}
            </p>

            <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-ui-text-muted">
                    {stepLabel}
                </span>

                <div className="flex items-center gap-3">
                    <button
                        onClick={onSkip}
                        className="text-xs font-medium text-ui-text-muted transition-colors hover:text-ui-text"
                    >
                        {skipLabel}
                    </button>
                    <button
                        onClick={onNext}
                        className="btn-primary px-4 py-1.5 text-xs"
                    >
                        {nextLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

const PADDING = 8;

function getTargetRect(target: string): TargetRect | null {
    const el = document.querySelector(`[data-tutorial="${target}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
        top: r.top - PADDING,
        left: r.left - PADDING,
        width: r.width + PADDING * 2,
        height: r.height + PADDING * 2,
    };
}

function getTooltipStyle(rect: TargetRect): React.CSSProperties {
    const tooltipBelow = rect.top + rect.height + GAP;
    const fitsBelow = tooltipBelow + TOOLTIP_ESTIMATED_HEIGHT < window.innerHeight;
    const isTall = rect.height > window.innerHeight * 0.5;

    if (isTall) {
        const spaceRight = window.innerWidth - (rect.left + rect.width);
        const spaceLeft = rect.left;
        const placeRight = spaceRight >= spaceLeft;
        return {
            top: rect.top + rect.height / 2,
            transform: 'translateY(-50%)',
            ...(placeRight
                ? { left: rect.left + rect.width + GAP }
                : { left: rect.left - GAP, transform: 'translate(-100%, -50%)' }),
        };
    }

    const left = Math.min(rect.left, window.innerWidth - TOOLTIP_WIDTH);
    if (fitsBelow) {
        return { top: tooltipBelow, left };
    }
    return { top: rect.top - GAP, left, transform: 'translateY(-100%)' };
}

function getBackdropClipPath(rect: TargetRect): string {
    return `polygon(
        0% 0%, 100% 0%, 100% 100%, 0% 100%,
        0% ${rect.top}px,
        ${rect.left}px ${rect.top}px,
        ${rect.left}px ${rect.top + rect.height}px,
        ${rect.left + rect.width}px ${rect.top + rect.height}px,
        ${rect.left + rect.width}px ${rect.top}px,
        0% ${rect.top}px
    )`;
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
