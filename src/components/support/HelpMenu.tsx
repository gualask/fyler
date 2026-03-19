import { IconChevronDown, IconLifebuoy } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import { useDismissableMenu } from '@/hooks/useDismissableMenu';
import { useTranslation } from '@/i18n';

interface Props {
    onReportBug: () => void;
    onOpenAbout: () => void;
}

export function HelpMenu({
    onReportBug,
    onOpenAbout,
}: Props) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement | null>(null);
    useDismissableMenu({ open, rootRef, onClose: () => setOpen(false) });

    function handleAction(action: () => void) {
        action();
        setOpen(false);
    }

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                className={[
                    'btn-ghost',
                    open ? 'bg-ui-accent-soft text-ui-accent-on-soft' : '',
                ].filter(Boolean).join(' ')}
                aria-label={t('support.help')}
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((current) => !current)}
            >
                <IconLifebuoy className="h-4 w-4" />
                {t('support.help')}
                <IconChevronDown className={['h-4 w-4 transition-transform', open ? 'rotate-180' : ''].join(' ')} />
            </button>
            {open ? (
                <div
                    role="menu"
                    aria-label={t('support.help')}
                    className="absolute right-0 top-[calc(100%+0.5rem)] z-30 min-w-[13rem] rounded-xl border border-ui-border bg-ui-surface p-1.5 shadow-lg"
                >
                    <button
                        type="button"
                        role="menuitem"
                        className="flex w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-ui-text-secondary transition-colors hover:bg-ui-surface-hover hover:text-ui-text"
                        onClick={() => handleAction(onReportBug)}
                    >
                        {t('support.reportBug')}
                    </button>
                    <div className="my-1 h-px bg-ui-border" />
                    <button
                        type="button"
                        role="menuitem"
                        className="flex w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-ui-text-secondary transition-colors hover:bg-ui-surface-hover hover:text-ui-text"
                        onClick={() => handleAction(onOpenAbout)}
                    >
                        {t('support.about')}
                    </button>
                </div>
            ) : null}
        </div>
    );
}
