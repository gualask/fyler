import { IconInfoCircle } from '@tabler/icons-react';
import type { ReactNode } from 'react';

import { useTranslation } from '@/shared/i18n';
import { Tooltip } from './Tooltip';
import type { TooltipAlign } from './tooltip-placement';

type InfoTooltipItem = {
    title: string;
    description: string;
    visual?: ReactNode;
};

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
    return (
        <Tooltip
            align={align}
            className="inline-flex items-center"
            panelClassName="w-[min(20rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)]"
            renderTrigger={({ ariaDescribedBy, ariaExpanded, onFocus, onBlur, onClick }) => (
                <button
                    type="button"
                    className="tooltip-trigger-icon"
                    aria-label={t('tooltips.showDetails', { label })}
                    aria-describedby={ariaDescribedBy}
                    aria-expanded={ariaExpanded}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    onClick={onClick}
                >
                    <IconInfoCircle className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
            )}
        >
            {children}
        </Tooltip>
    );
}

export function InfoTooltipContent({
    title,
    leadVisual,
    items,
}: {
    title: string;
    leadVisual?: ReactNode;
    items: ReadonlyArray<InfoTooltipItem>;
}) {
    return (
        <>
            <span className="tooltip-content-title">{title}</span>
            {leadVisual ? <span className="tooltip-content-lead">{leadVisual}</span> : null}
            {items.map((item) => (
                <span key={item.title} className="tooltip-content-row">
                    {item.visual ? (
                        <span className="tooltip-content-visual">{item.visual}</span>
                    ) : null}
                    <span className="min-w-0">
                        <span className="tooltip-content-row-title">{item.title}</span>
                        <span className="tooltip-content-row-copy">{item.description}</span>
                    </span>
                </span>
            ))}
        </>
    );
}
