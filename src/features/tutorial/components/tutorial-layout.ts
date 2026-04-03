import type { CSSProperties } from 'react';
import { TUTORIAL_DATA_ATTR } from './targets';

export interface TargetRect {
    top: number;
    left: number;
    width: number;
    height: number;
}
const TOOLTIP_WIDTH = 320;
const TOOLTIP_ESTIMATED_HEIGHT = 120;
const GAP = 12;
const PADDING = 8;

export function getTargetRect(target: string): TargetRect | null {
    const el = document.querySelector(`[${TUTORIAL_DATA_ATTR}="${target}"]`);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
        top: rect.top - PADDING,
        left: rect.left - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
    };
}

export function getTooltipStyle(rect: TargetRect): CSSProperties {
    const tooltipBelow = rect.top + rect.height + GAP;
    const fitsBelow = tooltipBelow + TOOLTIP_ESTIMATED_HEIGHT < window.innerHeight;
    const isTall = rect.height > window.innerHeight * 0.5;

    if (isTall) {
        const spaceRight = window.innerWidth - (rect.left + rect.width);
        const spaceLeft = rect.left;
        const placeRight = spaceRight >= spaceLeft;
        return {
            top: rect.top + rect.height / 2,
            transform: 'translateY(-50%)',
            ...(placeRight
                ? { left: rect.left + rect.width + GAP }
                : { left: rect.left - GAP, transform: 'translate(-100%, -50%)' }),
        };
    }

    const left = Math.min(rect.left, window.innerWidth - TOOLTIP_WIDTH);
    if (fitsBelow) {
        return { top: tooltipBelow, left };
    }
    return { top: rect.top - GAP, left, transform: 'translateY(-100%)' };
}

export function getBackdropClipPath(rect: TargetRect): string {
    return `polygon(
        0% 0%, 100% 0%, 100% 100%, 0% 100%,
        0% ${rect.top}px,
        ${rect.left}px ${rect.top}px,
        ${rect.left}px ${rect.top + rect.height}px,
        ${rect.left + rect.width}px ${rect.top + rect.height}px,
        ${rect.left + rect.width}px ${rect.top}px,
        0% ${rect.top}px
    )`;
}
