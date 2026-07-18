import { IconClock } from '@tabler/icons-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useModalFocus } from '@/shared/ui';
import { createProgressModalTimingController } from './progress-modal-timing';

export type ProgressModalVariant = 'standard' | 'compact';

interface Props {
    message: string;
    progress?: number; // 0-100, undefined = indeterminato
    progressLabel?: string;
    elapsedTimeLabel?: string;
    elapsedStartedAt?: number;
    variant?: ProgressModalVariant;
}

function elapsedSecondsSince(startedAt: number): number {
    return Math.max(0, Math.floor((performance.now() - startedAt) / 1000));
}

function ElapsedSeconds({ label, startedAt }: { label: string; startedAt?: number }) {
    const fallbackStartedAtRef = useRef<number | null>(null);
    if (fallbackStartedAtRef.current === null) {
        fallbackStartedAtRef.current = performance.now();
    }

    const origin = startedAt ?? fallbackStartedAtRef.current;
    const [seconds, setSeconds] = useState(() => elapsedSecondsSince(origin));

    useEffect(() => {
        let timeoutId: number | undefined;

        const update = () => {
            const elapsedMs = Math.max(0, performance.now() - origin);
            setSeconds(Math.floor(elapsedMs / 1000));
            const untilNextSecond = 1000 - (elapsedMs % 1000);
            timeoutId = window.setTimeout(update, Math.max(16, Math.ceil(untilNextSecond)));
        };

        update();

        return () => window.clearTimeout(timeoutId);
    }, [origin]);

    return (
        <div
            role="timer"
            aria-live="off"
            className="mt-2 flex min-h-4 items-center gap-1.5 text-[11px] text-ui-text-muted"
        >
            <IconClock size={13} stroke={1.75} aria-hidden="true" />
            <span>
                {label}: <span className="tabular-nums">{seconds} s</span>
            </span>
        </div>
    );
}

export function ProgressModal({
    message,
    progress,
    progressLabel,
    elapsedTimeLabel,
    elapsedStartedAt,
    variant = 'standard',
}: Props) {
    const dialogRef = useRef<HTMLDivElement | null>(null);
    const normalizedProgress =
        progress === undefined ? undefined : Math.min(100, Math.max(0, progress));
    const isCompact = variant === 'compact';

    useModalFocus({
        containerRef: dialogRef,
    });

    return (
        <motion.div
            className={
                isCompact
                    ? 'dialog-backdrop progress-backdrop-compact'
                    : 'dialog-backdrop dialog-backdrop-strong dialog-backdrop-blur'
            }
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
            <motion.div
                ref={dialogRef}
                role="alertdialog"
                aria-modal="true"
                aria-label={message}
                aria-busy="true"
                tabIndex={-1}
                className={
                    isCompact
                        ? 'flex w-full max-w-xs flex-col gap-3 px-5 outline-none focus:outline-none'
                        : 'dialog-panel flex w-72 flex-col gap-3 rounded-xl p-6 outline-none focus:outline-none'
                }
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
                <div className="w-full">
                    <div className="mb-2 flex min-h-5 items-center justify-between gap-4">
                        <span className="text-sm font-medium text-ui-text">{message}</span>
                        {progressLabel ? (
                            <span className="shrink-0 text-xs tabular-nums text-ui-text-muted">
                                <span aria-live="polite">{progressLabel}</span>
                            </span>
                        ) : null}
                    </div>
                    <div
                        role="progressbar"
                        aria-label={message}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={normalizedProgress}
                        aria-valuetext={progressLabel}
                        className="h-2 w-full overflow-hidden rounded-full bg-ui-border"
                    >
                        {normalizedProgress === undefined ? (
                            <motion.div
                                className="h-full w-1/3 rounded-full bg-ui-accent"
                                animate={{ x: ['-100%', '300%'] }}
                                transition={{
                                    duration: 1.1,
                                    ease: 'easeInOut',
                                    repeat: Number.POSITIVE_INFINITY,
                                }}
                            />
                        ) : (
                            <div
                                className="h-full w-full origin-left rounded-full bg-ui-accent transition-transform duration-300 will-change-transform"
                                style={{ transform: `scaleX(${normalizedProgress / 100})` }}
                            />
                        )}
                    </div>
                    {elapsedTimeLabel ? (
                        <ElapsedSeconds
                            key={elapsedStartedAt}
                            label={elapsedTimeLabel}
                            startedAt={elapsedStartedAt}
                        />
                    ) : null}
                </div>
            </motion.div>
        </motion.div>
    );
}

type TimedProgressModalProps = Omit<Props, 'message' | 'elapsedStartedAt'> & {
    message: string | null;
};

function useTimedProgressModal({
    message,
    progress,
    progressLabel,
    elapsedTimeLabel,
    variant,
}: TimedProgressModalProps): Props | null {
    const [isVisible, setIsVisible] = useState(false);
    const [processingStartedAt, setProcessingStartedAt] = useState<number | null>(null);
    const latestDisplayedRequestRef = useRef<Props | null>(null);
    const active = message !== null;
    const timingControllerRef = useRef<ReturnType<
        typeof createProgressModalTimingController
    > | null>(null);

    if (timingControllerRef.current === null) {
        timingControllerRef.current = createProgressModalTimingController({
            onProcessingStarted: setProcessingStartedAt,
            onShow: () => setIsVisible(true),
            onHide: () => {
                latestDisplayedRequestRef.current = null;
                setIsVisible(false);
                setProcessingStartedAt(null);
            },
        });
    }
    const timingController = timingControllerRef.current;

    const currentRequest: Props | null = message
        ? {
              message,
              progress,
              progressLabel,
              elapsedTimeLabel,
              elapsedStartedAt:
                  elapsedTimeLabel && processingStartedAt !== null
                      ? processingStartedAt
                      : undefined,
              variant,
          }
        : null;

    if (currentRequest) {
        latestDisplayedRequestRef.current = currentRequest;
    }

    useEffect(() => {
        timingController.setActive(active);
    }, [active, timingController]);

    useEffect(() => {
        return () => timingController.dispose();
    }, [timingController]);

    if (!isVisible) return null;
    return currentRequest ?? latestDisplayedRequestRef.current;
}

export function TimedProgressModal(props: TimedProgressModalProps) {
    const displayedRequest = useTimedProgressModal(props);

    return (
        <AnimatePresence>
            {displayedRequest ? <ProgressModal {...displayedRequest} /> : null}
        </AnimatePresence>
    );
}
