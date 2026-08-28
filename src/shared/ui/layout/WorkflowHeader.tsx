import { IconArrowLeft } from '@tabler/icons-react';
import type { ReactNode } from 'react';

import { useTranslation } from '@/shared/i18n';
import { ActionTooltip } from '../feedback/tooltip';

export function WorkflowHeader({
    title,
    backDisabled = false,
    utilityActions,
    settingsControl,
    primaryActions,
    onBack,
}: {
    title: ReactNode;
    backDisabled?: boolean;
    utilityActions?: ReactNode;
    settingsControl: ReactNode;
    primaryActions: ReactNode;
    onBack: () => void;
}) {
    const { t } = useTranslation();
    const backLabel = t('navigation.backToTaskSelection');

    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-ui-border bg-ui-surface px-6">
            <div className="flex min-w-0 items-center gap-3">
                <ActionTooltip
                    label={backLabel}
                    align="start"
                    renderTrigger={({ ariaDescribedBy, onFocus, onBlur }) => (
                        <button
                            type="button"
                            className="btn-icon"
                            onClick={onBack}
                            disabled={backDisabled}
                            aria-label={backLabel}
                            aria-describedby={ariaDescribedBy}
                            onFocus={onFocus}
                            onBlur={onBlur}
                        >
                            <IconArrowLeft className="h-5 w-5" aria-hidden="true" />
                        </button>
                    )}
                />
                <h1 className="sr-only text-sm font-semibold text-ui-text-secondary md:not-sr-only md:block md:max-w-52 md:truncate">
                    {title}
                </h1>
            </div>
            <div className="flex items-center gap-2">
                {utilityActions}
                {settingsControl}
                <div className="ml-2 flex items-center gap-2 border-l border-ui-border pl-4">
                    {primaryActions}
                </div>
            </div>
        </header>
    );
}
