import { useEffect, useRef, useState } from 'react';

export function useSlotVisibility(
    scrollRoot: Element | null,
    index: number,
    onVisible: (index: number) => void,
) {
    const slotRef = useRef<HTMLDivElement>(null);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (!slotRef.current || !scrollRoot) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setShouldRender(true);
                }
            },
            { root: scrollRoot, rootMargin: '300px' },
        );
        observer.observe(slotRef.current);
        return () => observer.disconnect();
    }, [scrollRoot]);

    useEffect(() => {
        if (!slotRef.current || !scrollRoot) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) onVisible(index);
            },
            { root: scrollRoot, threshold: 0.3 },
        );
        observer.observe(slotRef.current);
        return () => observer.disconnect();
    }, [index, onVisible, scrollRoot]);

    return { slotRef, shouldRender };
}
