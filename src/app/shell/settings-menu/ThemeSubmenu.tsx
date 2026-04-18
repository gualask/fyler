import { IconCheck, IconChevronRight, IconMoon, IconSun } from '@tabler/icons-react';
import { AnimatePresence, motion } from 'motion/react';
import { useId } from 'react';
import { useTranslation } from '@/shared/i18n';
import { ACCENT_COLORS, type AccentColor } from '@/shared/preferences';
import { ACCENT_SWATCHES, menuItemClass, submenuPanelClass } from './menu.styles';

interface Props {
    isDark: boolean;
    accent: AccentColor;
    onToggleTheme: () => void;
    onSetAccent: (accent: AccentColor) => void;
    open: boolean;
    onToggle: () => void;
    closeAll: () => void;
}

export function ThemeSubmenu({
    isDark,
    accent,
    onToggleTheme,
    onSetAccent,
    open,
    onToggle,
    closeAll,
}: Props) {
    const { t } = useTranslation();
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
                {t('header.theme')}
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
                        <button
                            type="button"
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
                                aria-pressed={accent === color}
                                className={[
                                    menuItemClass,
                                    accent === color
                                        ? 'bg-ui-accent-soft text-ui-accent-on-soft'
                                        : '',
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
