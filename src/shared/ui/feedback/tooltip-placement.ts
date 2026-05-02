export type TooltipAlign = 'start' | 'center' | 'end';
export type TooltipSide = 'top' | 'bottom';
export type TooltipPlacement = {
    align: TooltipAlign;
    side: TooltipSide;
};

const VIEWPORT_PADDING = 12;
const TOOLTIP_OFFSET = 9;
const TOOLTIP_ALIGNMENTS: TooltipAlign[] = ['start', 'center', 'end'];
const TOOLTIP_SIDES: TooltipSide[] = ['top', 'bottom'];
const CLIPPING_OVERFLOW_VALUES = new Set(['auto', 'scroll', 'hidden', 'clip']);

type TooltipBoundaryRect = {
    top: number;
    right: number;
    bottom: number;
    left: number;
};

function isClippingOverflow(value: string) {
    return CLIPPING_OVERFLOW_VALUES.has(value);
}

export function getTooltipBoundaryElement(anchorEl: HTMLElement) {
    let current: HTMLElement | null = anchorEl.parentElement;

    while (current) {
        const { overflowX, overflowY } = window.getComputedStyle(current);
        if (isClippingOverflow(overflowX) || isClippingOverflow(overflowY)) return current;
        current = current.parentElement;
    }

    return null;
}

function getTooltipLeftEdge(triggerRect: DOMRect, panelWidth: number, align: TooltipAlign) {
    switch (align) {
        case 'start':
            return triggerRect.left;
        case 'center':
            return triggerRect.left + triggerRect.width / 2 - panelWidth / 2;
        case 'end':
            return triggerRect.right - panelWidth;
    }
}

function getTooltipOverflowScore(
    triggerRect: DOMRect,
    panelWidth: number,
    align: TooltipAlign,
    boundaryRect: TooltipBoundaryRect,
) {
    const left = getTooltipLeftEdge(triggerRect, panelWidth, align);
    const right = left + panelWidth;
    const overflowLeft = Math.max(0, boundaryRect.left + VIEWPORT_PADDING - left);
    const overflowRight = Math.max(0, right - (boundaryRect.right - VIEWPORT_PADDING));
    return overflowLeft + overflowRight;
}

function getTooltipCandidates(preferredAlign: TooltipAlign) {
    return [preferredAlign, ...TOOLTIP_ALIGNMENTS].filter(
        (align, index, values): align is TooltipAlign => values.indexOf(align) === index,
    );
}

function getTooltipTopEdge(triggerRect: DOMRect, panelHeight: number, side: TooltipSide) {
    switch (side) {
        case 'top':
            return triggerRect.top - TOOLTIP_OFFSET - panelHeight;
        case 'bottom':
            return triggerRect.bottom + TOOLTIP_OFFSET;
    }
}

function getTooltipVerticalOverflowScoreWithinBoundary(
    triggerRect: DOMRect,
    panelHeight: number,
    side: TooltipSide,
    boundaryRect: TooltipBoundaryRect,
) {
    const top = getTooltipTopEdge(triggerRect, panelHeight, side);
    const bottom = top + panelHeight;
    const overflowTop = Math.max(0, boundaryRect.top + VIEWPORT_PADDING - top);
    const overflowBottom = Math.max(0, bottom - (boundaryRect.bottom - VIEWPORT_PADDING));
    return overflowTop + overflowBottom;
}

function getTooltipSideCandidates(preferredSide: TooltipSide) {
    return [preferredSide, ...TOOLTIP_SIDES].filter(
        (side, index, values): side is TooltipSide => values.indexOf(side) === index,
    );
}

function resolveTooltipSide(
    preferredPlacement: TooltipPlacement,
    triggerRect: DOMRect,
    panelHeight: number,
    boundaryRect: TooltipBoundaryRect,
): TooltipSide {
    const candidates = getTooltipSideCandidates(preferredPlacement.side);

    return candidates.reduce(
        (bestSide, candidate) =>
            getTooltipVerticalOverflowScoreWithinBoundary(
                triggerRect,
                panelHeight,
                candidate,
                boundaryRect,
            ) <
            getTooltipVerticalOverflowScoreWithinBoundary(
                triggerRect,
                panelHeight,
                bestSide,
                boundaryRect,
            )
                ? candidate
                : bestSide,
        candidates[0],
    );
}

function resolveTooltipAlign(
    preferredPlacement: TooltipPlacement,
    triggerRect: DOMRect,
    panelWidth: number,
    boundaryRect: TooltipBoundaryRect,
): TooltipAlign {
    const candidates = getTooltipCandidates(preferredPlacement.align);

    return candidates.reduce(
        (bestAlign, candidate) =>
            getTooltipOverflowScore(triggerRect, panelWidth, candidate, boundaryRect) <
            getTooltipOverflowScore(triggerRect, panelWidth, bestAlign, boundaryRect)
                ? candidate
                : bestAlign,
        candidates[0],
    );
}

export function resolveTooltipPlacement(
    preferredPlacement: TooltipPlacement,
    triggerRect: DOMRect,
    panelRect: DOMRect,
    boundaryRect: TooltipBoundaryRect,
): TooltipPlacement {
    return {
        align: resolveTooltipAlign(preferredPlacement, triggerRect, panelRect.width, boundaryRect),
        side: resolveTooltipSide(preferredPlacement, triggerRect, panelRect.height, boundaryRect),
    };
}
