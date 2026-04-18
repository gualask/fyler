import { IconCheck, IconChevronRight } from '@tabler/icons-react';
import { AnimatePresence, motion } from 'motion/react';
import { useId } from 'react';
import { useTranslation } from '@/shared/i18n';
import { SUPPORTED_LOCALES } from '@/shared/preferences';
import { menuItemClass, submenuPanelClass } from './menu.styles';

interface Props {
    open: boolean;
    onToggle: () => void;
    closeAll: () => void;
}

export function LanguageSubmenu({ open, onToggle, closeAll }: Props) {
    const { locale, setLocale, t } = useTranslation();
    const panelId = useId();

    return (
        <div className="relative">
            <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                className={[menuItemClass, open ? 'bg-ui-surface-hover text-ui-text' : ''].join(
                    ' ',
                )}
                onClick={onToggle}
            >
                {t('header.language')}
                <IconChevronRight
                    className={['ml-auto h-3.5 w-3.5 transition-transform', open ? 'rotate-90' : '']
                        .filter(Boolean)
                        .join(' ')}
                />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        id={panelId}
                        className={submenuPanelClass}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.15 }}
                    >
                        {SUPPORTED_LOCALES.map((option) => (
                            <button
                                key={option}
                                type="button"
                                aria-pressed={locale === option}
                                className={[
                                    menuItemClass,
                                    locale === option
                                        ? 'bg-ui-accent-soft text-ui-accent-on-soft'
                                        : '',
                                ].join(' ')}
                                onClick={() => {
                                    setLocale(option);
                                    closeAll();
                                }}
                            >
                                {t(`language.name.${option}`)}
                                <span className="ml-auto flex items-center gap-2">
                                    {locale === option ? (
                                        <IconCheck className="h-3.5 w-3.5 text-ui-accent-text" />
                                    ) : null}
                                    <span className="text-xs uppercase text-ui-text-muted">
                                        {t(`language.short.${option}`)}
                                    </span>
                                </span>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
