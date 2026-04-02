import {
    IconAdjustments,
    IconCheck,
    IconChevronDown,
    IconChevronRight,
    IconMoon,
    IconSun,
} from '@tabler/icons-react';
import { useRef, useState } from 'react';
import { useTranslation } from '@/shared/i18n';
import { ACCENT_COLORS, type AccentColor, SUPPORTED_LOCALES } from '@/shared/preferences';
import { useDismissableMenu } from '@/shared/ui';

type Submenu = 'language' | 'theme' | null;

const ACCENT_SWATCHES: Record<AccentColor, string> = {
    indigo: '#6366f1',
    teal: '#14b8a6',
    amber: '#f59e0b',
    blue: '#3b82f6',
};

export interface AppSettingsMenuProps {
    isDark: boolean;
    accent: AccentColor;
    onToggleTheme: () => void;
    onSetAccent: (accent: AccentColor) => void;
    onReportBug: () => void;
    onOpenAbout: () => void;
}

const menuItemClass =
    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-ui-text-secondary transition-colors hover:bg-ui-surface-hover hover:text-ui-text';

const submenuPanelClass =
    'absolute left-full top-0 z-30 ml-1 min-w-[11rem] rounded-xl border border-ui-border bg-ui-surface p-1.5 shadow-lg';

export function AppSettingsMenu({
    isDark,
    accent,
    onToggleTheme,
    onSetAccent,
    onReportBug,
    onOpenAbout,
}: AppSettingsMenuProps) {
    const { locale, setLocale, t } = useTranslation();
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
                    {/* ── Language submenu ── */}
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
                                activeSubmenu === 'language'
                                    ? 'bg-ui-surface-hover text-ui-text'
                                    : '',
                            ].join(' ')}
                            onClick={() =>
                                setActiveSubmenu((c) => (c === 'language' ? null : 'language'))
                            }
                        >
                            {t('header.language')}
                            <IconChevronRight className="ml-auto h-3.5 w-3.5" />
                        </button>
                        {activeSubmenu === 'language' ? (
                            <div className={submenuPanelClass} role="menu">
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
                            </div>
                        ) : null}
                    </div>

                    {/* ── Theme submenu ── */}
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
                                setActiveSubmenu((c) => (c === 'theme' ? null : 'theme'))
                            }
                        >
                            {t('header.theme')}
                            <IconChevronRight className="ml-auto h-3.5 w-3.5" />
                        </button>
                        {activeSubmenu === 'theme' ? (
                            <div className={submenuPanelClass} role="menu">
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
                                    {isDark
                                        ? t('header.toggleTheme.light')
                                        : t('header.toggleTheme.dark')}
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
                            </div>
                        ) : null}
                    </div>

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
