import { type Dispatch, type SetStateAction, useCallback, useEffect, useState } from 'react';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const WHEEL_ZOOM_STEP = 1.1;
const BUTTON_ZOOM_STEP = 1.2;

function clampZoom(value: number): number {
    return Math.min(Math.max(value, ZOOM_MIN), ZOOM_MAX);
}

function useWheelZoom(
    scrollEl: HTMLElement | null,
    setZoomLevel: Dispatch<SetStateAction<number>>,
) {
    useEffect(() => {
        const el = scrollEl;
        if (!el) return;

        const handleWheelZoom = (event: WheelEvent) => {
            if (!event.ctrlKey) return;

            event.preventDefault();
            const factor = event.deltaY < 0 ? WHEEL_ZOOM_STEP : 1 / WHEEL_ZOOM_STEP;
            setZoomLevel((value) => clampZoom(value * factor));
        };

        el.addEventListener('wheel', handleWheelZoom, { passive: false });
        return () => el.removeEventListener('wheel', handleWheelZoom);
    }, [scrollEl, setZoomLevel]);
}

function useZoomControls(setZoomLevel: Dispatch<SetStateAction<number>>) {
    const zoomOut = useCallback(() => {
        setZoomLevel((value) => Math.max(value / BUTTON_ZOOM_STEP, ZOOM_MIN));
    }, [setZoomLevel]);
    const zoomIn = useCallback(() => {
        setZoomLevel((value) => Math.min(value * BUTTON_ZOOM_STEP, ZOOM_MAX));
    }, [setZoomLevel]);
    const zoomReset = useCallback(() => {
        setZoomLevel(1);
    }, [setZoomLevel]);

    return { zoomOut, zoomIn, zoomReset };
}

export function usePreviewZoom() {
    const [zoomLevel, setZoomLevel] = useState(1);
    const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null);
    const controls = useZoomControls(setZoomLevel);

    useWheelZoom(scrollEl, setZoomLevel);

    return { zoomLevel, scrollEl, setScrollEl, ...controls };
}
