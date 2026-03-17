import { useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../../i18n';

export type TooltipAlign = 'start' | 'center' | 'end';

export type TooltipItem = {
    title: string;
    description: string;
    visual?: ReactNode;
};

const VIEWPORT_PADDING = 12;
const TOOLTIP_ALIGNMENTS: TooltipAlign[] = ['start', 'center', 'end'];

type TooltipAlignmentDeps = {
    open: boolean;
    preferredAlign: TooltipAlign;
    triggerRef: RefObject<HTMLButtonElement | null>;
    panelRef: RefObject<HTMLSpanElement | null>;
};

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

function getTooltipOverflowScore(triggerRect: DOMRect, panelWidth: number, align: TooltipAlign) {
    const left = getTooltipLeftEdge(triggerRect, panelWidth, align);
    const right = left + panelWidth;
    const overflowLeft = Math.max(0, VIEWPORT_PADDING - left);
    const overflowRight = Math.max(0, right - (window.innerWidth - VIEWPORT_PADDING));
    return overflowLeft + overflowRight;
}

function getTooltipCandidates(preferredAlign: TooltipAlign) {
    return [preferredAlign, ...TOOLTIP_ALIGNMENTS].filter(
        (align, index, values): align is TooltipAlign => values.indexOf(align) === index,
    );
}

function resolveTooltipAlign(
    preferredAlign: TooltipAlign,
    triggerRect: DOMRect,
    panelWidth: number,
): TooltipAlign {
    const candidates = getTooltipCandidates(preferredAlign);

    return candidates.reduce((bestAlign, candidate) => (
        getTooltipOverflowScore(triggerRect, panelWidth, candidate)
            < getTooltipOverflowScore(triggerRect, panelWidth, bestAlign)
            ? candidate
            : bestAlign
    ), candidates[0]);
}

function useResolvedTooltipAlign({
    open,
    preferredAlign,
    triggerRef,
    panelRef,
}: TooltipAlignmentDeps) {
    const [resolvedAlign, setResolvedAlign] = useState<TooltipAlign>(preferredAlign);

    useLayoutEffect(() => {
        if (!open) return;

        const updateAlignment = () => {
            const triggerEl = triggerRef.current;
            const panelEl = panelRef.current;
            if (!triggerEl || !panelEl) return;

            const nextAlign = resolveTooltipAlign(
                preferredAlign,
                triggerEl.getBoundingClientRect(),
                panelEl.getBoundingClientRect().width,
            );

            setResolvedAlign((current) => (current === nextAlign ? current : nextAlign));
        };

        updateAlignment();
        window.addEventListener('resize', updateAlignment);
        return () => window.removeEventListener('resize', updateAlignment);
    }, [open, preferredAlign, triggerRef, panelRef]);

    return {
        resolvedAlign,
        resetResolvedAlign: () => setResolvedAlign(preferredAlign),
    };
}

function TooltipSection({ title, description, visual }: TooltipItem) {
    return (
        <div className="info-tooltip-row">
            {visual ? <span className="info-tooltip-visual">{visual}</span> : null}
            <span className="min-w-0">
                <span className="info-tooltip-row-title">{title}</span>
                <span className="info-tooltip-row-copy">{description}</span>
            </span>
        </div>
    );
}

export function TooltipContent({
    title,
    leadVisual,
    items,
}: {
    title: string;
    leadVisual?: ReactNode;
    items: TooltipItem[];
}) {
    return (
        <>
            <span className="info-tooltip-title">{title}</span>
            {leadVisual ? <span className="info-tooltip-lead">{leadVisual}</span> : null}
            {items.map((item) => (
                <TooltipSection
                    key={item.title}
                    title={item.title}
                    description={item.description}
                    visual={item.visual}
                />
            ))}
        </>
    );
}

export function InfoTooltip({
    label,
    align = 'start',
    children,
}: {
    label: string;
    align?: TooltipAlign;
    children: ReactNode;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const tooltipId = useId();
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const panelRef = useRef<HTMLSpanElement | null>(null);
    const { resolvedAlign, resetResolvedAlign } = useResolvedTooltipAlign({
        open,
        preferredAlign: align,
        triggerRef,
        panelRef,
    });

    const openTooltip = () => {
        resetResolvedAlign();
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
            className="info-tooltip"
            onMouseEnter={openTooltip}
            onMouseLeave={closeTooltip}
        >
            <button
                ref={triggerRef}
                type="button"
                className="info-tooltip-trigger"
                aria-label={t('tooltips.showDetails', { label })}
                aria-describedby={open ? tooltipId : undefined}
                aria-expanded={open}
                onFocus={openTooltip}
                onBlur={closeTooltip}
                onClick={toggleTooltip}
            >
                <InformationCircleIcon className="h-3.5 w-3.5" />
            </button>

            {open ? (
                <span
                    id={tooltipId}
                    ref={panelRef}
                    role="tooltip"
                    className={['info-tooltip-panel', `info-tooltip-panel-${resolvedAlign}`].join(' ')}
                >
                    {children}
                </span>
            ) : null}
        </span>
    );
}
