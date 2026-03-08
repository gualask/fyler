import { useCallback, useEffect, useRef, useState } from 'react';
import { windowGetLogicalSize, windowSetAlwaysOnTop, windowSetSize } from '../platform';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const QD_SIZE = { width: 380, height: 520 } as const;
const TRANSITION_MS = 400;
const PAINT_MS = 30;

export function useQuickDrop() {
    const [isQuickDrop, setIsQuickDrop] = useState(false);
    const [quickDropFileIds, setQuickDropFileIds] = useState<Set<string>>(new Set());
    const [isTransitioning, setIsTransitioning] = useState(false);
    const savedSizeRef = useRef<{ width: number; height: number } | null>(null);
    const isQuickDropRef = useRef(false);

    useEffect(() => { isQuickDropRef.current = isQuickDrop; }, [isQuickDrop]);

    const withTransition = useCallback(async (fn: () => Promise<void>) => {
        setIsTransitioning(true);
        await sleep(TRANSITION_MS);
        await fn();
        await sleep(PAINT_MS);
        setIsTransitioning(false);
    }, []);

    const onFilesAdded = useCallback((ids: string[]) => {
        if (!isQuickDropRef.current) return;
        setQuickDropFileIds((prev) => new Set([...prev, ...ids]));
    }, []);

    const enterQuickDrop = useCallback(() => withTransition(async () => {
        try {
            const logical = await windowGetLogicalSize();
            savedSizeRef.current = { width: logical.width, height: logical.height };
            await windowSetSize(QD_SIZE.width, QD_SIZE.height);
            await windowSetAlwaysOnTop(true);
        } catch { /* no-op in non-Tauri env */ }
        setIsQuickDrop(true);
    }), [withTransition]);

    const exitQuickDrop = useCallback(() => withTransition(async () => {
        setIsQuickDrop(false);
        setQuickDropFileIds(new Set());
        try {
            if (savedSizeRef.current) {
                await windowSetSize(savedSizeRef.current.width, savedSizeRef.current.height);
            }
            await windowSetAlwaysOnTop(false);
        } catch { /* no-op */ }
    }), [withTransition]);

    return { isQuickDrop, quickDropFileIds, isTransitioning, onFilesAdded, enterQuickDrop, exitQuickDrop };
}
