import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
    windowGetLogicalSize,
    windowSetAlwaysOnTop,
    windowSetMaximizable,
    windowSetMaxSize,
    windowSetMinSize,
    windowSetSize,
} from '@/infra/platform';
import { initialQuickAddState, quickAddReducer } from './quick-add.reducer';
import { createQuickAddTransitionRunner } from './quick-add-transition.runner';
import {
    applyQuickAddWindow,
    captureQuickAddRestoreSize,
    NORMAL_WINDOW_MIN_SIZE,
    type QuickAddWindowOps,
    restoreNormalWindow,
} from './quick-add-window-transition';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const TRANSITION_MS = 400;
const PAINT_MS = 30;

export { prependRecentQuickAddIds, removeQuickAddId } from './quick-add.reducer';

const quickAddWindowOps: QuickAddWindowOps = {
    getLogicalSize: windowGetLogicalSize,
    setSize: windowSetSize,
    setAlwaysOnTop: windowSetAlwaysOnTop,
    setMinSize: windowSetMinSize,
    setMaxSize: windowSetMaxSize,
    setMaximizable: windowSetMaximizable,
};

export function useQuickAdd() {
    const [state, dispatch] = useReducer(quickAddReducer, initialQuickAddState);
    const { isQuickAdd, quickAddFileOrder, isTransitioning } = state;
    const savedSizeRef = useRef<{ width: number; height: number } | null>(null);
    const runExclusiveTransition = useMemo(() => createQuickAddTransitionRunner(), []);

    // Set the window minimum size via JS rather than tauri.conf.json, so Quick Add
    // mode can freely lower the constraint without fighting a static config floor.
    useEffect(() => {
        windowSetMinSize(NORMAL_WINDOW_MIN_SIZE.width, NORMAL_WINDOW_MIN_SIZE.height).catch(() => {
            /* no-op in non-Tauri env */
        });
    }, []);

    const runTransition = useCallback(
        ({
            startAction,
            completeAction,
            failureAction,
            run,
        }: {
            startAction: { type: 'enter-started' } | { type: 'exit-started' };
            completeAction: { type: 'enter-completed' } | { type: 'exit-completed' };
            failureAction: { type: 'enter-failed' } | { type: 'exit-failed' };
            run: () => Promise<void>;
        }) => {
            return runExclusiveTransition(async () => {
                dispatch(startAction);
                try {
                    await sleep(TRANSITION_MS);
                    await run();
                    dispatch(completeAction);
                    await sleep(PAINT_MS);
                    dispatch({ type: 'transition-finished' });
                } catch (error) {
                    dispatch(failureAction);
                    throw error;
                }
            });
        },
        [runExclusiveTransition],
    );

    const onFilesAdded = useCallback((ids: string[]) => {
        dispatch({ type: 'files-added', ids });
    }, []);

    const onFileRemoved = useCallback((id: string) => {
        dispatch({ type: 'file-removed', id });
    }, []);

    const enterQuickAdd = useCallback(() => {
        return runTransition({
            startAction: { type: 'enter-started' },
            completeAction: { type: 'enter-completed' },
            failureAction: { type: 'enter-failed' },
            run: async () => {
                const restoreSize = await captureQuickAddRestoreSize(quickAddWindowOps);
                savedSizeRef.current = restoreSize;
                await applyQuickAddWindow(quickAddWindowOps, restoreSize);
            },
        });
    }, [runTransition]);

    const exitQuickAdd = useCallback(() => {
        return runTransition({
            startAction: { type: 'exit-started' },
            completeAction: { type: 'exit-completed' },
            failureAction: { type: 'exit-failed' },
            run: async () => {
                await restoreNormalWindow(quickAddWindowOps, savedSizeRef.current);
            },
        });
    }, [runTransition]);

    return {
        isQuickAdd,
        quickAddFileOrder,
        isTransitioning,
        onFilesAdded,
        onFileRemoved,
        enterQuickAdd,
        exitQuickAdd,
    };
}
