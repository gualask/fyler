import { IconAdjustments } from '@tabler/icons-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRef, useState } from 'react';
import { useTranslation } from '@/shared/i18n';
import type { AccentColor } from '@/shared/preferences';
import { useDismissableMenu } from '@/shared/ui';
import { LanguageSubmenu } from './LanguageSubmenu';
import { menuItemClass } from './menu.styles';
import { ThemeSubmenu } from './ThemeSubmenu';

type Submenu = 'language' | 'theme' | null;

export interface AppSettingsMenuProps {
    isDark: boolean;
    accent: AccentColor;
    onToggleTheme: () => void;
    onSetAccent: (accent: AccentColor) => void;
    onReportBug: () => void;
    onOpenAbout: () => void;
}

export function AppSettingsMenu({
    isDark,
    accent,
    onToggleTheme,
    onSetAccent,
    onReportBug,
    onOpenAbout,
}: AppSettingsMenuProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [activeSubmenu, setActiveSubmenu] = useState<Submenu>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);

    useDismissableMenu({
        open,
        rootRef,
        onClose: () => {
            setOpen(false);
            setActiveSubmenu(null);
        },
    });

    function closeAll() {
        setOpen(false);
        setActiveSubmenu(null);
    }

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                className={['btn-icon', open ? 'bg-ui-accent-soft text-ui-accent-on-soft' : '']
                    .filter(Boolean)
                    .join(' ')}
                aria-label={t('header.settings')}
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => {
                    setOpen((current) => !current);
                    setActiveSubmenu(null);
                }}
            >
                <IconAdjustments className="h-5 w-5" />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        role="menu"
                        aria-label={t('header.settings')}
                        className="absolute left-0 top-[calc(100%+0.5rem)] z-50 min-w-[13rem] rounded-xl border border-ui-border bg-ui-surface p-1.5 shadow-lg"
                        initial={{ opacity: 0, scale: 0.97, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: -4 }}
                        transition={{ duration: 0.15 }}
                    >
                        <LanguageSubmenu
                            activeSubmenu={activeSubmenu}
                            setActiveSubmenu={setActiveSubmenu}
                            closeAll={closeAll}
                        />

                        <ThemeSubmenu
                            isDark={isDark}
                            accent={accent}
                            onToggleTheme={onToggleTheme}
                            onSetAccent={onSetAccent}
                            activeSubmenu={activeSubmenu}
                            setActiveSubmenu={setActiveSubmenu}
                            closeAll={closeAll}
                        />

                        <div className="my-1 h-px bg-ui-border" />

                        <button
                            type="button"
                            role="menuitem"
                            className={menuItemClass}
                            onClick={() => {
                                onReportBug();
                                closeAll();
                            }}
                        >
                            {t('support.reportBug')}
                        </button>
                        <button
                            type="button"
                            role="menuitem"
                            className={menuItemClass}
                            onClick={() => {
                                onOpenAbout();
                                closeAll();
                            }}
                        >
                            {t('support.about')}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
