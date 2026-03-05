import { useEffect, useState } from 'react';

/**
 * Observes the width of a DOM element via ResizeObserver.
 * Returns a ref setter to attach to the element and its current width in pixels.
 */
export function useElementWidth(): [(el: HTMLDivElement | null) => void, number] {
    const [el, setEl] = useState<HTMLDivElement | null>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        if (!el) return;
        const update = () => setWidth(el.clientWidth);
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, [el]);

    return [setEl, width];
}
