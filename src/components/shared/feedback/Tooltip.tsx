import { useId, useMemo, useRef, useState, type ReactNode } from 'react';

import type { TooltipPlacement } from './tooltip-placement';
import { useResolvedTooltipPlacement } from './resolved-tooltip-placement.hook';

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

export function Tooltip({
    align = 'start',
    side = 'top',
    className,
    panelClassName,
    renderTrigger,
    children,
}: {
    align?: TooltipPlacement['align'];
    side?: TooltipPlacement['side'];
    className?: string;
    panelClassName?: string;
    renderTrigger: (props: TooltipTriggerRenderProps) => ReactNode;
    children: ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const tooltipId = useId();
    const anchorRef = useRef<HTMLSpanElement | null>(null);
    const panelRef = useRef<HTMLSpanElement | null>(null);
    const preferredPlacement = useMemo(() => ({ align, side } satisfies TooltipPlacement), [align, side]);
    const { resolvedPlacement, resetResolvedPlacement } = useResolvedTooltipPlacement({
        open,
        preferredPlacement,
        anchorRef,
        panelRef,
    });

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

            {open ? (
                <span
                    id={tooltipId}
                    ref={panelRef}
                    role="tooltip"
                    className={[
                        'tooltip-panel',
                        `tooltip-panel-${resolvedPlacement.align}`,
                        `tooltip-panel-side-${resolvedPlacement.side}`,
                        panelClassName,
                    ].filter(Boolean).join(' ')}
                >
                    {children}
                </span>
            ) : null}
        </span>
    );
}
