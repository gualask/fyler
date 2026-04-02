import { IconAdjustments, IconChevronDown } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import { useTranslation } from '@/shared/i18n';
import type { AccentColor } from '@/shared/preferences';
import { useDismissableMenu } from '@/shared/ui';
import { LanguageSubmenu } from './LanguageSubmenu';
import { menuItemClass } from './menu.styles';
import { ThemeSubmenu } from './ThemeSubmenu';
import type { Submenu } from './types';

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
                className={[
                    'btn-ghost btn-toolbar',
                    open ? 'bg-ui-accent-soft text-ui-accent-on-soft' : '',
                ]
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
                <IconAdjustments className="h-4 w-4" />
                <IconChevronDown
                    className={['h-3.5 w-3.5 transition-transform', open ? 'rotate-180' : ''].join(
                        ' ',
                    )}
                />
            </button>
            {open ? (
                <div
                    role="menu"
                    aria-label={t('header.settings')}
                    className="absolute left-0 top-[calc(100%+0.5rem)] z-30 min-w-[13rem] rounded-xl border border-ui-border bg-ui-surface p-1.5 shadow-lg"
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
                </div>
            ) : null}
        </div>
    );
}
