import { type ReactNode, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useResolvedTooltipPlacement } from './resolved-tooltip-placement.hook';
import type { TooltipPlacement } from './tooltip-placement';
import { getTooltipBoundaryElement } from './tooltip-placement';

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
    const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({ opacity: 0 });
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

    useLayoutEffect(() => {
        if (!open) return;

        const updatePosition = () => {
            const triggerEl = anchorRef.current;
            const panelEl = panelRef.current;
            if (!triggerEl || !panelEl) return;

            const boundaryRect = {
                top: 0,
                right: window.innerWidth,
                bottom: window.innerHeight,
                left: 0,
            };
            const triggerRect = triggerEl.getBoundingClientRect();
            const panelRect = panelEl.getBoundingClientRect();

            const viewportPadding = 12;
            const offset = 9;

            const rawLeft =
                resolvedPlacement.align === 'start'
                    ? triggerRect.left
                    : resolvedPlacement.align === 'center'
                      ? triggerRect.left + triggerRect.width / 2 - panelRect.width / 2
                      : triggerRect.right - panelRect.width;

            const rawTop =
                resolvedPlacement.side === 'top'
                    ? triggerRect.top - offset - panelRect.height
                    : triggerRect.bottom + offset;

            const minLeft = boundaryRect.left + viewportPadding;
            const maxLeft = boundaryRect.right - viewportPadding - panelRect.width;
            const minTop = boundaryRect.top + viewportPadding;
            const maxTop = boundaryRect.bottom - viewportPadding - panelRect.height;

            const left = Math.min(Math.max(rawLeft, minLeft), maxLeft);
            const top = Math.min(Math.max(rawTop, minTop), maxTop);

            setPanelStyle({
                left,
                top,
                opacity: 1,
            });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        const boundaryEl = anchorRef.current ? getTooltipBoundaryElement(anchorRef.current) : null;
        boundaryEl?.addEventListener('scroll', updatePosition, { passive: true });
        const ro = new ResizeObserver(() => updatePosition());
        if (panelRef.current) ro.observe(panelRef.current);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
            boundaryEl?.removeEventListener('scroll', updatePosition);
            ro.disconnect();
        };
    }, [open, resolvedPlacement]);

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

            {open
                ? typeof document === 'undefined'
                    ? null
                    : createPortal(
                          <span
                              id={tooltipId}
                              ref={panelRef}
                              role="tooltip"
                              style={panelStyle}
                              className={[
                                  'tooltip-panel',
                                  `tooltip-panel-${resolvedPlacement.align}`,
                                  `tooltip-panel-side-${resolvedPlacement.side}`,
                                  panelClassName,
                              ]
                                  .filter(Boolean)
                                  .join(' ')}
                          >
                              {children}
                          </span>,
                          document.body,
                      )
                : null}
        </span>
    );
}
