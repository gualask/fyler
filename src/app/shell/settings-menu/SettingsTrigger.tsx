import { IconAdjustments } from '@tabler/icons-react';
import type { RefObject } from 'react';

import { TUTORIAL_TARGETS, tutorialTargetProps } from '@/modules/merge/ui/tutorial';
import { ActionTooltip } from '@/shared/ui/feedback/tooltip';

interface SettingsTriggerProps {
    open: boolean;
    panelId: string;
    triggerRef: RefObject<HTMLButtonElement | null>;
    label: string;
    onClick: () => void;
}

export function SettingsTrigger({
    open,
    panelId,
    triggerRef,
    label,
    onClick,
}: SettingsTriggerProps) {
    return (
        <ActionTooltip
            label={label}
            renderTrigger={({ ariaDescribedBy, onFocus, onBlur }) => (
                <button
                    ref={triggerRef}
                    type="button"
                    {...tutorialTargetProps(TUTORIAL_TARGETS.settings)}
                    className={['btn-icon', open ? 'bg-ui-accent-soft text-ui-accent-on-soft' : '']
                        .filter(Boolean)
                        .join(' ')}
                    aria-label={label}
                    aria-describedby={ariaDescribedBy}
                    aria-haspopup="true"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    onClick={onClick}
                >
                    <IconAdjustments className="h-5 w-5" />
                </button>
            )}
        />
    );
}
