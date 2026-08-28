import { IconChevronDown } from '@tabler/icons-react';
import { type ReactNode, useId, useState } from 'react';

export function ProgressiveDisclosure({
    collapsedLabel,
    expandedLabel,
    disabled = false,
    contentClassName = 'mt-2 rounded-xl bg-ui-surface-subtle p-4',
    children,
}: {
    collapsedLabel: string;
    expandedLabel: string;
    disabled?: boolean;
    contentClassName?: string;
    children: ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const contentId = useId();
    const buttonLabel: string = open ? expandedLabel : collapsedLabel;

    return (
        <>
            <button
                type="button"
                className="mt-2 flex w-full items-center justify-between rounded-lg py-2 text-sm font-semibold text-ui-text outline-none transition-colors hover:text-ui-accent-text focus-visible:ring-2 focus-visible:ring-ui-accent-muted disabled:opacity-55"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-controls={contentId}
                disabled={disabled}
            >
                <span>{buttonLabel}</span>
                <IconChevronDown
                    className={`h-4 w-4 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                />
            </button>
            {open ? (
                <div id={contentId} className={contentClassName}>
                    {children}
                </div>
            ) : null}
        </>
    );
}
