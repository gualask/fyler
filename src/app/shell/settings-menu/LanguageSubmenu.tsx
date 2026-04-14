import { IconChevronRight } from '@tabler/icons-react';
import { AnimatePresence, motion } from 'motion/react';
import type { Dispatch, SetStateAction } from 'react';
import { useTranslation } from '@/shared/i18n';
import { SUPPORTED_LOCALES } from '@/shared/preferences';
import { menuItemClass, submenuPanelClass } from './menu.styles';

type Submenu = 'language' | 'theme' | null;

interface Props {
    activeSubmenu: Submenu;
    setActiveSubmenu: Dispatch<SetStateAction<Submenu>>;
    closeAll: () => void;
}

export function LanguageSubmenu({ activeSubmenu, setActiveSubmenu, closeAll }: Props) {
    const { locale, setLocale, t } = useTranslation();

    return (
        <div
            className="relative"
            onMouseEnter={() => setActiveSubmenu('language')}
            onMouseLeave={() => setActiveSubmenu(null)}
        >
            <button
                type="button"
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={activeSubmenu === 'language'}
                className={[
                    menuItemClass,
                    activeSubmenu === 'language' ? 'bg-ui-surface-hover text-ui-text' : '',
                ].join(' ')}
                onClick={() =>
                    setActiveSubmenu((current) => (current === 'language' ? null : 'language'))
                }
            >
                {t('header.language')}
                <IconChevronRight className="ml-auto h-3.5 w-3.5" />
            </button>
            <AnimatePresence>
                {activeSubmenu === 'language' && (
                    <motion.div
                        className={submenuPanelClass}
                        role="menu"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.15 }}
                    >
                        {SUPPORTED_LOCALES.map((option) => (
                            <button
                                key={option}
                                type="button"
                                role="menuitemradio"
                                aria-checked={locale === option}
                                className={[
                                    menuItemClass,
                                    locale === option ? 'text-ui-accent-text' : '',
                                ].join(' ')}
                                onClick={() => {
                                    setLocale(option);
                                    closeAll();
                                }}
                            >
                                {t(`language.name.${option}`)}
                                <span className="ml-auto text-xs uppercase text-ui-text-muted">
                                    {t(`language.short.${option}`)}
                                </span>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
