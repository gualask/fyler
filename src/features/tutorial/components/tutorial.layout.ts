import { getTooltipStyle, type TargetRect } from './tutorial.positioning';
import { TUTORIAL_DATA_ATTR } from './tutorial.targets';

const PADDING = 8;

export { getTooltipStyle };

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
