import { IconX } from '@tabler/icons-react';
import { useTranslation } from '@/shared/i18n';

interface QuickAddHeaderProps {
    disabled: boolean;
    onDiscardAndExit: () => void;
}

export function QuickAddHeader({ disabled, onDiscardAndExit }: QuickAddHeaderProps) {
    const { t } = useTranslation();

    return (
        <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-ui-border bg-ui-surface px-4">
            <div className="flex items-center gap-2.5">
                <img src="/icon.svg" alt="Fyler" className="h-6 w-6" />
                <span className="text-sm font-semibold text-ui-text">{t('header.quickAdd')}</span>
            </div>
            <button
                type="button"
                disabled={disabled}
                onClick={onDiscardAndExit}
                className="btn-icon"
                aria-label={t('quickAdd.close')}
                title={t('quickAdd.close')}
            >
                <IconX className="h-4 w-4" />
            </button>
        </header>
    );
}
