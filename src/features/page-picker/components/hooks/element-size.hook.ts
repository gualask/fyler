import { useEffect, useState } from 'react';

/**
 * Observes the size of a DOM element via ResizeObserver.
 * Returns a ref setter to attach to the element and its current size in pixels.
 */
export function useElementSize(): [
    (el: HTMLDivElement | null) => void,
    { width: number; height: number },
] {
    const [el, setEl] = useState<HTMLDivElement | null>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!el) return;
        const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, [el]);

    return [setEl, size];
}
