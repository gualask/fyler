import { useCallback, useEffect, useRef, useState } from 'react';

const ZOOM_STEP = 1.25;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 8;

export function useZoomPan() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOrigin = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
    // refs stabili per l'handler wheel (evita re-attach a ogni render)
    const stateRef = useRef({ scale: 1, offset: { x: 0, y: 0 } });
    stateRef.current = { scale, offset };

    const reset = useCallback(() => {
        setScale(1);
        setOffset({ x: 0, y: 0 });
    }, []);

    const zoomIn = useCallback(() => {
        setScale((s) => Math.min(s * ZOOM_STEP, ZOOM_MAX));
    }, []);

    const zoomOut = useCallback(() => {
        setScale((s) => {
            const next = Math.max(s / ZOOM_STEP, ZOOM_MIN);
            if (next <= 1) setOffset({ x: 0, y: 0 });
            return next;
        });
    }, []);

    // Wheel non-passivo: zoom centrato sul cursore
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const handler = (e: WheelEvent) => {
            e.preventDefault();
            const { scale: s, offset: o } = stateRef.current;
            const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
            const newScale = Math.min(Math.max(s * factor, ZOOM_MIN), ZOOM_MAX);
            const rect = el.getBoundingClientRect();
            const cx = e.clientX - rect.left - rect.width / 2;
            const cy = e.clientY - rect.top - rect.height / 2;
            const nx = cx - (cx - o.x) * (newScale / s);
            const ny = cy - (cy - o.y) * (newScale / s);
            setScale(newScale);
            setOffset({ x: nx, y: ny });
        };
        el.addEventListener('wheel', handler, { passive: false });
        return () => el.removeEventListener('wheel', handler);
    }, []);

    const containerHandlers = {
        onMouseDown: (e: React.MouseEvent) => {
            if (e.button !== 0) return;
            dragOrigin.current = {
                mx: e.clientX,
                my: e.clientY,
                ox: stateRef.current.offset.x,
                oy: stateRef.current.offset.y,
            };
            setIsDragging(true);
        },
        onMouseMove: (e: React.MouseEvent) => {
            if (!dragOrigin.current) return;
            setOffset({
                x: dragOrigin.current.ox + e.clientX - dragOrigin.current.mx,
                y: dragOrigin.current.oy + e.clientY - dragOrigin.current.my,
            });
        },
        onMouseUp: () => {
            dragOrigin.current = null;
            setIsDragging(false);
        },
        onMouseLeave: () => {
            dragOrigin.current = null;
            setIsDragging(false);
        },
    };

    return { containerRef, scale, offset, isDragging, reset, zoomIn, zoomOut, containerHandlers };
}
