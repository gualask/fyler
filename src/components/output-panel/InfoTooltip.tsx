import { useId, useState, type ReactNode } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../../i18n';

export type TooltipAlign = 'start' | 'center' | 'end';

export type TooltipItem = {
    title: string;
    description: string;
    visual?: ReactNode;
};

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

    return (
        <span
            className="info-tooltip"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
        >
            <button
                type="button"
                className="info-tooltip-trigger"
                aria-label={t('tooltips.showDetails', { label })}
                aria-describedby={open ? tooltipId : undefined}
                aria-expanded={open}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                onClick={() => setOpen((current) => !current)}
            >
                <InformationCircleIcon className="h-3.5 w-3.5" />
            </button>

            {open ? (
                <span
                    id={tooltipId}
                    role="tooltip"
                    className={['info-tooltip-panel', `info-tooltip-panel-${align}`].join(' ')}
                >
                    {children}
                </span>
            ) : null}
        </span>
    );
}
