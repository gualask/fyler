import { IconPin, IconPinnedFilled } from '@tabler/icons-react';

import { useTranslation } from '@/shared/i18n';
import { ActionTooltip } from '@/shared/ui/feedback/tooltip';

export function AlwaysOnTopButton({
    active,
    disabled,
    onToggle,
}: {
    active: boolean;
    disabled: boolean;
    onToggle: () => void;
}) {
    const { t } = useTranslation();
    const label = active ? t('header.unpinWindow') : t('header.pinWindow');
    const Icon = active ? IconPinnedFilled : IconPin;

    return (
        <ActionTooltip
            label={label}
            description={t('header.pinWindowDescription')}
            renderTrigger={({ ariaDescribedBy, onFocus, onBlur }) => (
                <button
                    type="button"
                    className={`btn-icon ${active ? 'btn-icon-active' : ''}`}
                    disabled={disabled}
                    onClick={onToggle}
                    aria-label={label}
                    aria-describedby={ariaDescribedBy}
                    aria-pressed={active}
                    onFocus={onFocus}
                    onBlur={onBlur}
                >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                </button>
            )}
        />
    );
}
