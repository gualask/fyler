import { useCallback, useEffect, useRef, useState } from 'react';
import {
    windowGetLogicalSize,
    windowSetAlwaysOnTop,
    windowSetMaximizable,
    windowSetMaxSize,
    windowSetMinSize,
    windowSetSize,
} from '@/infra/platform';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const QD_SIZE = { width: 380, height: 520 } as const;
const NORMAL_MIN_SIZE = { width: 1100, height: 600 } as const;
const TRANSITION_MS = 400;
const PAINT_MS = 30;

export function useQuickAdd() {
    const [isQuickAdd, setIsQuickAdd] = useState(false);
    const [quickAddFileIds, setQuickAddFileIds] = useState<Set<string>>(new Set());
    const [isTransitioning, setIsTransitioning] = useState(false);
    const savedSizeRef = useRef<{ width: number; height: number } | null>(null);
    const isQuickAddSessionRef = useRef(false);

    // Set the window minimum size via JS rather than tauri.conf.json, so Quick Add
    // mode can freely lower the constraint without fighting a static config floor.
    useEffect(() => {
        windowSetMinSize(NORMAL_MIN_SIZE.width, NORMAL_MIN_SIZE.height).catch(() => {
            /* no-op in non-Tauri env */
        });
    }, []);

    const withTransition = useCallback(async (fn: () => Promise<void>) => {
        setIsTransitioning(true);
        await sleep(TRANSITION_MS);
        await fn();
        await sleep(PAINT_MS);
        setIsTransitioning(false);
    }, []);

    const onFilesAdded = useCallback((ids: string[]) => {
        if (!isQuickAddSessionRef.current) return;
        setQuickAddFileIds((prev) => new Set([...prev, ...ids]));
    }, []);

    const enterQuickAdd = useCallback(() => {
        isQuickAddSessionRef.current = true;
        setQuickAddFileIds(new Set());

        return withTransition(async () => {
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
            setIsQuickAdd(true);
        });
    }, [withTransition]);

    const exitQuickAdd = useCallback(() => {
        isQuickAddSessionRef.current = false;

        return withTransition(async () => {
            try {
                await windowSetMaximizable(true);
                await windowSetMaxSize(null);
                if (savedSizeRef.current) {
                    await windowSetSize(savedSizeRef.current.width, savedSizeRef.current.height);
                }
                await windowSetMinSize(NORMAL_MIN_SIZE.width, NORMAL_MIN_SIZE.height);
                await windowSetAlwaysOnTop(false);
            } catch {
                /* no-op */
            }
            setIsQuickAdd(false);
            setQuickAddFileIds(new Set());
        });
    }, [withTransition]);

    return {
        isQuickAdd,
        quickAddFileIds,
        isTransitioning,
        onFilesAdded,
        enterQuickAdd,
        exitQuickAdd,
    };
}
