export const PROGRESS_MODAL_SHOW_DELAY_MS = 180;
export const PROGRESS_MODAL_MIN_VISIBLE_MS = 300;

interface ProgressModalTimingCallbacks {
    onProcessingStarted: (startedAt: number) => void;
    onShow: () => void;
    onHide: () => void;
}

type TimeoutId = ReturnType<typeof setTimeout>;

interface ProgressModalTimingScheduler {
    now: () => number;
    setTimeout: (callback: () => void, delayMs: number) => TimeoutId;
    clearTimeout: (timeoutId: TimeoutId) => void;
}

const browserTimingScheduler: ProgressModalTimingScheduler = {
    now: () => performance.now(),
    setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
    clearTimeout: (timeoutId) => clearTimeout(timeoutId),
};

export function createProgressModalTimingController(
    callbacks: ProgressModalTimingCallbacks,
    scheduler: ProgressModalTimingScheduler = browserTimingScheduler,
) {
    let active = false;
    let visibleSince: number | null = null;
    let timeoutId: TimeoutId | undefined;

    const clearScheduledTransition = () => {
        if (timeoutId === undefined) return;
        scheduler.clearTimeout(timeoutId);
        timeoutId = undefined;
    };

    const hide = () => {
        timeoutId = undefined;
        if (active) return;
        visibleSince = null;
        callbacks.onHide();
    };

    const show = () => {
        timeoutId = undefined;
        if (!active) return;
        visibleSince = scheduler.now();
        callbacks.onShow();
    };

    const activate = () => {
        const processingStartedAt = scheduler.now();
        callbacks.onProcessingStarted(processingStartedAt);

        if (visibleSince !== null) {
            visibleSince = processingStartedAt;
            return;
        }

        timeoutId = scheduler.setTimeout(show, PROGRESS_MODAL_SHOW_DELAY_MS);
    };

    const deactivate = () => {
        if (visibleSince === null) {
            callbacks.onHide();
            return;
        }

        const remainingVisibleMs = Math.max(
            0,
            PROGRESS_MODAL_MIN_VISIBLE_MS - (scheduler.now() - visibleSince),
        );
        timeoutId = scheduler.setTimeout(hide, remainingVisibleMs);
    };

    return {
        setActive(nextActive: boolean) {
            active = nextActive;
            clearScheduledTransition();

            if (active) {
                activate();
                return;
            }
            deactivate();
        },

        dispose() {
            clearScheduledTransition();
            active = false;
            visibleSince = null;
        },
    };
}
