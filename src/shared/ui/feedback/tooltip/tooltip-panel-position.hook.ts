import { type CSSProperties, type RefObject, useLayoutEffect, useState } from 'react';

import { getTooltipBoundaryElement, type TooltipPlacement } from './tooltip-placement';

type TooltipPanelStyleOptions = {
    triggerRect: DOMRect;
    panelRect: DOMRect;
    resolvedPlacement: TooltipPlacement;
};

const INITIAL_PANEL_STYLE: CSSProperties = { opacity: 0 };
const VIEWPORT_PADDING = 12;
const TOOLTIP_OFFSET = 9;

function viewportBoundaryRect() {
    return {
        top: 0,
        right: window.innerWidth,
        bottom: window.innerHeight,
        left: 0,
    };
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function rawTooltipLeft({ triggerRect, panelRect, resolvedPlacement }: TooltipPanelStyleOptions) {
    switch (resolvedPlacement.align) {
        case 'start':
            return triggerRect.left;
        case 'center':
            return triggerRect.left + triggerRect.width / 2 - panelRect.width / 2;
        case 'end':
            return triggerRect.right - panelRect.width;
    }
}

function rawTooltipTop({ triggerRect, panelRect, resolvedPlacement }: TooltipPanelStyleOptions) {
    return resolvedPlacement.side === 'top'
        ? triggerRect.top - TOOLTIP_OFFSET - panelRect.height
        : triggerRect.bottom + TOOLTIP_OFFSET;
}

function tooltipPanelStyle(options: TooltipPanelStyleOptions): CSSProperties {
    const boundaryRect = viewportBoundaryRect();
    const { panelRect } = options;
    const minLeft = boundaryRect.left + VIEWPORT_PADDING;
    const maxLeft = boundaryRect.right - VIEWPORT_PADDING - panelRect.width;
    const minTop = boundaryRect.top + VIEWPORT_PADDING;
    const maxTop = boundaryRect.bottom - VIEWPORT_PADDING - panelRect.height;

    return {
        left: clamp(rawTooltipLeft(options), minLeft, maxLeft),
        top: clamp(rawTooltipTop(options), minTop, maxTop),
        opacity: 1,
    };
}

export function useTooltipPanelPosition({
    open,
    resolvedPlacement,
    anchorRef,
    panelRef,
}: {
    open: boolean;
    resolvedPlacement: TooltipPlacement;
    anchorRef: RefObject<HTMLSpanElement | null>;
    panelRef: RefObject<HTMLSpanElement | null>;
}) {
    const [panelStyle, setPanelStyle] = useState<CSSProperties>(INITIAL_PANEL_STYLE);

    useLayoutEffect(() => {
        if (!open) return;

        const updatePosition = () => {
            const triggerEl = anchorRef.current;
            const panelEl = panelRef.current;
            if (!triggerEl || !panelEl) return;

            setPanelStyle(
                tooltipPanelStyle({
                    triggerRect: triggerEl.getBoundingClientRect(),
                    panelRect: panelEl.getBoundingClientRect(),
                    resolvedPlacement,
                }),
            );
        };

        const boundaryEl = anchorRef.current ? getTooltipBoundaryElement(anchorRef.current) : null;
        const ro = new ResizeObserver(() => updatePosition());

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        boundaryEl?.addEventListener('scroll', updatePosition, { passive: true });
        if (panelRef.current) ro.observe(panelRef.current);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
            boundaryEl?.removeEventListener('scroll', updatePosition);
            ro.disconnect();
        };
    }, [anchorRef, open, panelRef, resolvedPlacement]);

    return panelStyle;
}
