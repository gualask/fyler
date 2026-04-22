import { useCallback, useEffect, useReducer, useRef } from 'react';
import {
    windowGetLogicalSize,
    windowSetAlwaysOnTop,
    windowSetMaximizable,
    windowSetMaxSize,
    windowSetMinSize,
    windowSetSize,
} from '@/infra/platform';
import { initialQuickAddState, quickAddReducer } from './quick-add.reducer';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const QD_SIZE = { width: 380, height: 520 } as const;
const NORMAL_MIN_SIZE = { width: 1100, height: 600 } as const;
const TRANSITION_MS = 400;
const PAINT_MS = 30;

export { prependRecentQuickAddIds, removeQuickAddId } from './quick-add.reducer';

export function useQuickAdd() {
    const [state, dispatch] = useReducer(quickAddReducer, initialQuickAddState);
    const { isQuickAdd, quickAddFileOrder, isTransitioning } = state;
    const savedSizeRef = useRef<{ width: number; height: number } | null>(null);

    // Set the window minimum size via JS rather than tauri.conf.json, so Quick Add
    // mode can freely lower the constraint without fighting a static config floor.
    useEffect(() => {
        windowSetMinSize(NORMAL_MIN_SIZE.width, NORMAL_MIN_SIZE.height).catch(() => {
            /* no-op in non-Tauri env */
        });
    }, []);

    const runTransition = useCallback(
        async ({
            startAction,
            completeAction,
            run,
        }: {
            startAction: { type: 'enter-started' } | { type: 'exit-started' };
            completeAction: { type: 'enter-completed' } | { type: 'exit-completed' };
            run: () => Promise<void>;
        }) => {
            dispatch(startAction);
            await sleep(TRANSITION_MS);
            await run();
            dispatch(completeAction);
            await sleep(PAINT_MS);
            dispatch({ type: 'transition-finished' });
        },
        [],
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
            run: async () => {
                try {
                    const logical = await windowGetLogicalSize().catch(() => null);
                    savedSizeRef.current = logical
                        ? { width: logical.width, height: logical.height }
                        : { width: 1100, height: 700 };
                    await windowSetMinSize(QD_SIZE.width, QD_SIZE.height);
                    await windowSetMaxSize(QD_SIZE);
                    await windowSetMaximizable(false);
                    await windowSetSize(QD_SIZE.width, QD_SIZE.height);
                    await windowSetAlwaysOnTop(true);
                } catch {
                    /* no-op in non-Tauri env */
                }
            },
        });
    }, [runTransition]);

    const exitQuickAdd = useCallback(() => {
        return runTransition({
            startAction: { type: 'exit-started' },
            completeAction: { type: 'exit-completed' },
            run: async () => {
                try {
                    await windowSetMaximizable(true);
                    await windowSetMaxSize(null);
                    if (savedSizeRef.current) {
                        await windowSetSize(
                            savedSizeRef.current.width,
                            savedSizeRef.current.height,
                        );
                    }
                    await windowSetMinSize(NORMAL_MIN_SIZE.width, NORMAL_MIN_SIZE.height);
                    await windowSetAlwaysOnTop(false);
                } catch {
                    /* no-op */
                }
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
