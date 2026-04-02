import { useEffect, useRef, useState } from 'react';

type EntryCallback = (entry: IntersectionObserverEntry) => void;

type SharedObserverMode = 'prefetch' | 'visible';

class SharedIntersectionObserver {
    private observer: IntersectionObserver;
    private callbacks = new Map<Element, EntryCallback>();
    private onEmpty: (() => void) | null;

    constructor(observer: IntersectionObserver, onEmpty: () => void) {
        this.observer = observer;
        this.onEmpty = onEmpty;
    }

    observe(target: Element, cb: EntryCallback): () => void {
        this.callbacks.set(target, cb);
        this.observer.observe(target);

        return () => {
            this.callbacks.delete(target);
            this.observer.unobserve(target);
            if (this.callbacks.size === 0) {
                this.observer.disconnect();
                this.onEmpty?.();
                this.onEmpty = null;
            }
        };
    }

    handleEntries(entries: IntersectionObserverEntry[]) {
        for (const entry of entries) {
            const cb = this.callbacks.get(entry.target);
            cb?.(entry);
        }
    }
}

const sharedObserversByRoot = new WeakMap<
    Element,
    Map<SharedObserverMode, SharedIntersectionObserver>
>();

function getSharedObserver(root: Element, mode: SharedObserverMode): SharedIntersectionObserver {
    const existingByMode = sharedObserversByRoot.get(root) ?? new Map();
    sharedObserversByRoot.set(root, existingByMode);

    const existing = existingByMode.get(mode);
    if (existing) return existing;

    const options: IntersectionObserverInit =
        mode === 'prefetch' ? { root, rootMargin: '300px' } : { root, threshold: 0.3 };

    const shared = new SharedIntersectionObserver(
        new IntersectionObserver((entries) => shared.handleEntries(entries), options),
        () => {
            existingByMode.delete(mode);
        },
    );

    existingByMode.set(mode, shared);
    return shared;
}

export function useSlotVisibility(
    scrollRoot: Element | null,
    index: number,
    onVisible: (index: number) => void,
) {
    const slotRef = useRef<HTMLDivElement>(null);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (!slotRef.current || !scrollRoot || shouldRender) return;

        let stop: (() => void) | null = null;
        stop = getSharedObserver(scrollRoot, 'prefetch').observe(slotRef.current, (entry) => {
            if (!entry.isIntersecting) return;
            setShouldRender(true);
            stop?.();
            stop = null;
        });

        return () => stop?.();
    }, [scrollRoot, shouldRender]);

    useEffect(() => {
        if (!slotRef.current || !scrollRoot) return;
        return getSharedObserver(scrollRoot, 'visible').observe(slotRef.current, (entry) => {
            if (entry.isIntersecting) onVisible(index);
        });
    }, [index, onVisible, scrollRoot]);

    return { slotRef, shouldRender };
}
