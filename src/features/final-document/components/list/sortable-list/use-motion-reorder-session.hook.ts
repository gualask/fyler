import { useCallback, useEffect, useRef, useState } from 'react';
import { ordersMatch, resolveReorderCommit } from './motion-reorder-session';

type ReorderSession = {
    activeId: string;
    originalOrder: string[];
    draftOrder: string[];
};

type Options = {
    sourceOrder: string[];
    onCommit: (fromId: string, toId: string) => void;
    onCommitted: (position: number) => void;
    onStarted: () => void;
};

export function useMotionReorderSession({
    sourceOrder,
    onCommit,
    onCommitted,
    onStarted,
}: Options) {
    const [session, setSession] = useState<ReorderSession | null>(null);
    const sessionRef = useRef<ReorderSession | null>(null);

    const clearSession = useCallback(() => {
        sessionRef.current = null;
        setSession(null);
    }, []);

    const start = useCallback(
        (activeId: string) => {
            const nextSession: ReorderSession = {
                activeId,
                originalOrder: [...sourceOrder],
                draftOrder: [...sourceOrder],
            };
            sessionRef.current = nextSession;
            setSession(nextSession);
            onStarted();
        },
        [onStarted, sourceOrder],
    );

    const update = useCallback((nextOrder: string[]) => {
        const current = sessionRef.current;
        if (!current || ordersMatch(current.draftOrder, nextOrder)) return;

        const nextSession = { ...current, draftOrder: [...nextOrder] };
        sessionRef.current = nextSession;
        setSession(nextSession);
    }, []);

    const finish = useCallback(() => {
        const current = sessionRef.current;
        clearSession();
        if (!current) return;

        const commit = resolveReorderCommit(
            current.originalOrder,
            current.draftOrder,
            current.activeId,
        );
        if (!commit) return;

        onCommit(commit.fromId, commit.toId);
        onCommitted(commit.position);
    }, [clearSession, onCommit, onCommitted]);

    useEffect(() => {
        const current = sessionRef.current;
        if (current && !ordersMatch(current.originalOrder, sourceOrder)) {
            clearSession();
        }
    }, [clearSession, sourceOrder]);

    return {
        activeId: session?.activeId ?? null,
        order: session?.draftOrder ?? sourceOrder,
        start,
        update,
        finish,
        cancel: clearSession,
    };
}
