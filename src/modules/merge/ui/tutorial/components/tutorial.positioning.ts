import type { CSSProperties } from 'react';

export interface TargetRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

export interface TooltipSize {
    width: number;
    height: number;
}

const DEFAULT_TOOLTIP_SIZE: TooltipSize = { width: 320, height: 120 };
const GAP = 12;
const VIEWPORT_GUTTER = 24;

function clampValue(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), Math.max(min, max));
}

function clampTooltipLeft(left: number, viewportWidth: number, tooltipWidth: number): number {
    const maxLeft = viewportWidth - tooltipWidth - VIEWPORT_GUTTER;

    return clampValue(left, VIEWPORT_GUTTER, maxLeft);
}

function clampTooltipTop(top: number, viewportHeight: number, tooltipHeight: number): number {
    const maxTop = viewportHeight - tooltipHeight - VIEWPORT_GUTTER;

    return clampValue(top, VIEWPORT_GUTTER, maxTop);
}

export function getTooltipStyle(
    rect: TargetRect,
    viewportWidth = window.innerWidth,
    viewportHeight = window.innerHeight,
    tooltipSize: TooltipSize = DEFAULT_TOOLTIP_SIZE,
): CSSProperties {
    const { width: tooltipWidth, height: tooltipHeight } = tooltipSize;
    const tooltipBelow = rect.top + rect.height + GAP;
    const tooltipAbove = rect.top - GAP - tooltipHeight;
    const fitsBelow = tooltipBelow + tooltipHeight <= viewportHeight - VIEWPORT_GUTTER;
    const fitsAbove =
        tooltipAbove >= VIEWPORT_GUTTER &&
        tooltipAbove + tooltipHeight <= viewportHeight - VIEWPORT_GUTTER;
    const isTall = rect.height > viewportHeight * 0.5;

    if (isTall) {
        const spaceRight = viewportWidth - (rect.left + rect.width);
        const spaceLeft = rect.left;
        const placeRight = spaceRight >= spaceLeft;
        const left = placeRight ? rect.left + rect.width + GAP : rect.left - GAP - tooltipWidth;

        return {
            top: clampTooltipTop(
                rect.top + rect.height / 2 - tooltipHeight / 2,
                viewportHeight,
                tooltipHeight,
            ),
            left: clampTooltipLeft(left, viewportWidth, tooltipWidth),
        };
    }

    const left = clampTooltipLeft(rect.left, viewportWidth, tooltipWidth);

    if (fitsBelow) {
        return { top: tooltipBelow, left };
    }

    if (fitsAbove) {
        return { top: tooltipAbove, left };
    }

    const centeredTop = rect.top + rect.height / 2 - tooltipHeight / 2;

    return { top: clampTooltipTop(centeredTop, viewportHeight, tooltipHeight), left };
}
