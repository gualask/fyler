import type { CSSProperties, ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';

import type { TooltipPlacement } from './tooltip-placement';

function tooltipPanelClassName(resolvedPlacement: TooltipPlacement, panelClassName?: string) {
    return [
        'tooltip-panel',
        `tooltip-panel-${resolvedPlacement.align}`,
        `tooltip-panel-side-${resolvedPlacement.side}`,
        panelClassName,
    ]
        .filter(Boolean)
        .join(' ');
}

export function TooltipPanelPortal({
    open,
    tooltipId,
    panelRef,
    panelStyle,
    resolvedPlacement,
    panelClassName,
    children,
}: {
    open: boolean;
    tooltipId: string;
    panelRef: RefObject<HTMLSpanElement | null>;
    panelStyle: CSSProperties;
    resolvedPlacement: TooltipPlacement;
    panelClassName?: string;
    children: ReactNode;
}) {
    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <span
            id={tooltipId}
            ref={panelRef}
            role="tooltip"
            style={panelStyle}
            className={tooltipPanelClassName(resolvedPlacement, panelClassName)}
        >
            {children}
        </span>,
        document.body,
    );
}
