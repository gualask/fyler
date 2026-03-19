import type { ReactNode } from 'react';
import { IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from '../../i18n';
import { Tooltip, type TooltipAlign } from '../shared/feedback/Tooltip';

export type { TooltipAlign } from '../shared/feedback/Tooltip';

export type TooltipItem = {
    title: string;
    description: string;
    visual?: ReactNode;
};

function TooltipSection({ title, description, visual }: TooltipItem) {
    return (
        <div className="tooltip-content-row">
            {visual ? <span className="tooltip-content-visual">{visual}</span> : null}
            <span className="min-w-0">
                <span className="tooltip-content-row-title">{title}</span>
                <span className="tooltip-content-row-copy">{description}</span>
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
            <span className="tooltip-content-title">{title}</span>
            {leadVisual ? <span className="tooltip-content-lead">{leadVisual}</span> : null}
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
                    <IconInfoCircle className="h-3.5 w-3.5" />
                </button>
            )}
        >
            {children}
        </Tooltip>
    );
}
