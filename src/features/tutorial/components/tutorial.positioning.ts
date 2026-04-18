import type { CSSProperties } from 'react';

export interface TargetRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

const TOOLTIP_WIDTH = 320;
const TOOLTIP_ESTIMATED_HEIGHT = 120;
const GAP = 12;
const VIEWPORT_GUTTER = 24;

function clampTooltipLeft(left: number, viewportWidth: number): number {
    const maxLeft = Math.max(VIEWPORT_GUTTER, viewportWidth - TOOLTIP_WIDTH - VIEWPORT_GUTTER);

    return Math.min(Math.max(left, VIEWPORT_GUTTER), maxLeft);
}

export function getTooltipStyle(
    rect: TargetRect,
    viewportWidth = window.innerWidth,
    viewportHeight = window.innerHeight,
): CSSProperties {
    const tooltipBelow = rect.top + rect.height + GAP;
    const fitsBelow = tooltipBelow + TOOLTIP_ESTIMATED_HEIGHT < viewportHeight;
    const isTall = rect.height > viewportHeight * 0.5;

    if (isTall) {
        const spaceRight = viewportWidth - (rect.left + rect.width);
        const spaceLeft = rect.left;
        const placeRight = spaceRight >= spaceLeft;

        return {
            top: rect.top + rect.height / 2,
            left: placeRight
                ? clampTooltipLeft(rect.left + rect.width + GAP, viewportWidth)
                : clampTooltipLeft(rect.left - GAP - TOOLTIP_WIDTH, viewportWidth),
            transform: 'translateY(-50%)',
        };
    }

    const left = clampTooltipLeft(rect.left, viewportWidth);

    if (fitsBelow) {
        return { top: tooltipBelow, left };
    }

    return { top: rect.top - GAP, left, transform: 'translateY(-100%)' };
}
