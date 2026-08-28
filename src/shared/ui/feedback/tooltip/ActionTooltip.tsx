import type { ReactNode } from 'react';

import { Tooltip, type TooltipAlign } from './Tooltip';

type ActionTooltipTriggerProps = {
    ariaDescribedBy?: string;
    onFocus: () => void;
    onBlur: () => void;
};

export function ActionTooltip({
    label,
    description,
    align = 'center',
    renderTrigger,
}: {
    label: string;
    description?: string;
    align?: TooltipAlign;
    renderTrigger: (props: ActionTooltipTriggerProps) => ReactNode;
}) {
    return (
        <Tooltip
            align={align}
            side="bottom"
            openOnClick={false}
            className="inline-flex items-center"
            panelClassName={description ? 'w-72 max-w-[calc(100vw-1rem)]' : undefined}
            renderTrigger={({ ariaDescribedBy, onFocus, onBlur }) =>
                renderTrigger({ ariaDescribedBy, onFocus, onBlur })
            }
        >
            <span className="tooltip-content-title">{label}</span>
            {description ? <span className="tooltip-content-row-copy">{description}</span> : null}
        </Tooltip>
    );
}
