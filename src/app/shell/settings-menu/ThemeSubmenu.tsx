import { IconCheck, IconChevronRight, IconMoon, IconSun } from '@tabler/icons-react';
import { AnimatePresence, motion } from 'motion/react';
import type { Dispatch, SetStateAction } from 'react';
import { useTranslation } from '@/shared/i18n';
import { ACCENT_COLORS, type AccentColor } from '@/shared/preferences';
import { ACCENT_SWATCHES, menuItemClass, submenuPanelClass } from './menu.styles';

type Submenu = 'language' | 'theme' | null;

interface Props {
    isDark: boolean;
    accent: AccentColor;
    onToggleTheme: () => void;
    onSetAccent: (accent: AccentColor) => void;
    activeSubmenu: Submenu;
    setActiveSubmenu: Dispatch<SetStateAction<Submenu>>;
    closeAll: () => void;
}

export function ThemeSubmenu({
    isDark,
    accent,
    onToggleTheme,
    onSetAccent,
    activeSubmenu,
    setActiveSubmenu,
    closeAll,
}: Props) {
    const { t } = useTranslation();

    return (
        <div
            className="relative"
            onMouseEnter={() => setActiveSubmenu('theme')}
            onMouseLeave={() => setActiveSubmenu(null)}
        >
            <button
                type="button"
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={activeSubmenu === 'theme'}
                className={[
                    menuItemClass,
                    activeSubmenu === 'theme' ? 'bg-ui-surface-hover text-ui-text' : '',
                ].join(' ')}
                onClick={() =>
                    setActiveSubmenu((current) => (current === 'theme' ? null : 'theme'))
                }
            >
                {t('header.theme')}
                <IconChevronRight className="ml-auto h-3.5 w-3.5" />
            </button>
            <AnimatePresence>
                {activeSubmenu === 'theme' && (
                    <motion.div
                        className={submenuPanelClass}
                        role="menu"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.15 }}
                    >
                        <button
                            type="button"
                            role="menuitem"
                            className={menuItemClass}
                            onClick={() => {
                                onToggleTheme();
                                closeAll();
                            }}
                        >
                            {isDark ? (
                                <IconSun className="h-4 w-4" />
                            ) : (
                                <IconMoon className="h-4 w-4" />
                            )}
                            {isDark ? t('header.toggleTheme.light') : t('header.toggleTheme.dark')}
                        </button>
                        <div className="my-1 h-px bg-ui-border" />
                        {ACCENT_COLORS.map((color) => (
                            <button
                                key={color}
                                type="button"
                                role="menuitemradio"
                                aria-checked={accent === color}
                                className={[
                                    menuItemClass,
                                    accent === color ? 'text-ui-text' : '',
                                ].join(' ')}
                                onClick={() => {
                                    onSetAccent(color);
                                    closeAll();
                                }}
                            >
                                <span
                                    className="h-3.5 w-3.5 shrink-0 rounded-full border border-ui-border"
                                    style={{ backgroundColor: ACCENT_SWATCHES[color] }}
                                />
                                {t(`header.accent.${color}`)}
                                {accent === color ? (
                                    <IconCheck className="ml-auto h-3.5 w-3.5 text-ui-accent-text" />
                                ) : null}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
