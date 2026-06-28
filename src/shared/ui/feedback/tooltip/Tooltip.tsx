import { type ReactNode, useId, useMemo, useRef, useState } from 'react';
import { useResolvedTooltipPlacement } from './resolved-tooltip-placement.hook';
import { TooltipPanelPortal } from './TooltipPanel';
import { useTooltipPanelPosition } from './tooltip-panel-position.hook';
import type { TooltipPlacement } from './tooltip-placement';

import './tooltip.css';

export type { TooltipAlign, TooltipSide } from './tooltip-placement';

export type TooltipTriggerRenderProps = {
    open: boolean;
    tooltipId?: string;
    ariaDescribedBy?: string;
    ariaExpanded: boolean;
    onFocus: () => void;
    onBlur: () => void;
    onClick: () => void;
};

type TooltipProps = {
    align?: TooltipPlacement['align'];
    side?: TooltipPlacement['side'];
    className?: string;
    panelClassName?: string;
    renderTrigger: (props: TooltipTriggerRenderProps) => ReactNode;
    children: ReactNode;
};

type SetTooltipOpen = (open: boolean) => void;

function tooltipDisclosureHandlers(
    open: boolean,
    setOpen: SetTooltipOpen,
    resetResolvedPlacement: () => void,
) {
    const openTooltip = () => {
        resetResolvedPlacement();
        setOpen(true);
    };

    const closeTooltip = () => setOpen(false);

    const toggleTooltip = () => {
        if (open) {
            closeTooltip();
            return;
        }
        openTooltip();
    };

    return {
        openTooltip,
        closeTooltip,
        toggleTooltip,
    };
}

export function Tooltip({
    align = 'start',
    side = 'top',
    className,
    panelClassName,
    renderTrigger,
    children,
}: TooltipProps) {
    const [open, setOpen] = useState(false);
    const tooltipId = useId();
    const anchorRef = useRef<HTMLSpanElement | null>(null);
    const panelRef = useRef<HTMLSpanElement | null>(null);
    const preferredPlacement = useMemo(
        () => ({ align, side }) satisfies TooltipPlacement,
        [align, side],
    );
    const { resolvedPlacement, resetResolvedPlacement } = useResolvedTooltipPlacement({
        open,
        preferredPlacement,
        anchorRef,
        panelRef,
    });

    const { openTooltip, closeTooltip, toggleTooltip } = tooltipDisclosureHandlers(
        open,
        setOpen,
        resetResolvedPlacement,
    );
    const panelStyle = useTooltipPanelPosition({
        open,
        resolvedPlacement,
        anchorRef,
        panelRef,
    });

    return (
        <span
            ref={anchorRef}
            className={['tooltip', className].filter(Boolean).join(' ')}
            onMouseEnter={openTooltip}
            onMouseLeave={closeTooltip}
        >
            {renderTrigger({
                open,
                tooltipId,
                ariaDescribedBy: open ? tooltipId : undefined,
                ariaExpanded: open,
                onFocus: openTooltip,
                onBlur: closeTooltip,
                onClick: toggleTooltip,
            })}

            <TooltipPanelPortal
                open={open}
                tooltipId={tooltipId}
                panelRef={panelRef}
                panelStyle={panelStyle}
                resolvedPlacement={resolvedPlacement}
                panelClassName={panelClassName}
            >
                {children}
            </TooltipPanelPortal>
        </span>
    );
}
