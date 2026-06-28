import { type RefObject, useLayoutEffect, useState } from 'react';

import {
    getTooltipBoundaryElement,
    resolveTooltipPlacement,
    type TooltipPlacement,
} from './tooltip-placement';

type TooltipPlacementDeps = {
    open: boolean;
    preferredPlacement: TooltipPlacement;
    anchorRef: RefObject<HTMLSpanElement | null>;
    panelRef: RefObject<HTMLSpanElement | null>;
};

export function useResolvedTooltipPlacement({
    open,
    preferredPlacement,
    anchorRef,
    panelRef,
}: TooltipPlacementDeps) {
    const [resolvedPlacement, setResolvedPlacement] =
        useState<TooltipPlacement>(preferredPlacement);

    useLayoutEffect(() => {
        if (!open) return;

        const updatePlacement = () => {
            const triggerEl = anchorRef.current;
            const panelEl = panelRef.current;
            if (!triggerEl || !panelEl) return;

            const triggerRect = triggerEl.getBoundingClientRect();
            const panelRect = panelEl.getBoundingClientRect();
            const nextPlacement = resolveTooltipPlacement(
                preferredPlacement,
                triggerRect,
                panelRect,
                {
                    top: 0,
                    right: window.innerWidth,
                    bottom: window.innerHeight,
                    left: 0,
                },
            );

            setResolvedPlacement((current) =>
                current.align === nextPlacement.align && current.side === nextPlacement.side
                    ? current
                    : nextPlacement,
            );
        };

        const boundaryEl = anchorRef.current ? getTooltipBoundaryElement(anchorRef.current) : null;
        updatePlacement();
        window.addEventListener('resize', updatePlacement);
        window.addEventListener('scroll', updatePlacement, true);
        boundaryEl?.addEventListener('scroll', updatePlacement, { passive: true });
        return () => {
            window.removeEventListener('resize', updatePlacement);
            window.removeEventListener('scroll', updatePlacement, true);
            boundaryEl?.removeEventListener('scroll', updatePlacement);
        };
    }, [open, preferredPlacement, anchorRef, panelRef]);

    return {
        resolvedPlacement,
        resetResolvedPlacement: () => {
            setResolvedPlacement(preferredPlacement);
        },
    };
}
