import { useCallback, useRef, useState } from 'react';
import { windowGetLogicalSize, windowSetAlwaysOnTop, windowSetSize } from '@/infra/platform';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const QD_SIZE = { width: 380, height: 520 } as const;
const TRANSITION_MS = 400;
const PAINT_MS = 30;

export function useQuickAdd() {
    const [isQuickAdd, setIsQuickAdd] = useState(false);
    const [quickAddFileIds, setQuickAddFileIds] = useState<Set<string>>(new Set());
    const [isTransitioning, setIsTransitioning] = useState(false);
    const savedSizeRef = useRef<{ width: number; height: number } | null>(null);
    const isQuickAddSessionRef = useRef(false);

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
                const logical = await windowGetLogicalSize();
                savedSizeRef.current = { width: logical.width, height: logical.height };
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
            setIsQuickAdd(false);
            setQuickAddFileIds(new Set());
            try {
                if (savedSizeRef.current) {
                    await windowSetSize(savedSizeRef.current.width, savedSizeRef.current.height);
                }
                await windowSetAlwaysOnTop(false);
            } catch {
                /* no-op */
            }
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
