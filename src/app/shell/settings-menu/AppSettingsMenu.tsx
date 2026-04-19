import { IconAdjustments, IconMoon, IconSun } from '@tabler/icons-react';
import { motion } from 'motion/react';
import { useId, useRef, useState } from 'react';
import { useTranslation } from '@/shared/i18n';
import { ACCENT_COLORS, type AccentColor, type Locale } from '@/shared/preferences';
import { ToggleGroup, type ToggleOption, useDismissableMenu } from '@/shared/ui';
import {
    ACCENT_SWATCHES,
    menuInlineLabelClass,
    menuInlineRowClass,
    menuItemClass,
} from './menu.styles';

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
    const { locale, setLocale, t } = useTranslation();
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const panelId = useId();
    const languageOrder: Locale[] = ['en', 'it'];
    const languageOptions: ToggleOption<Locale>[] = languageOrder.map((option) => ({
        value: option,
        label: t(`language.short.${option}`),
        buttonClassName: 'min-w-0 px-0 text-xs font-semibold',
    }));
    const themeOptions: ToggleOption<'light' | 'dark'>[] = [
        {
            value: 'light',
            label: <IconSun className="h-4 w-4" />,
            ariaLabel: t('header.appearance.light'),
            title: t('header.appearance.light'),
            buttonClassName: 'min-w-0 px-0',
        },
        {
            value: 'dark',
            label: <IconMoon className="h-4 w-4" />,
            ariaLabel: t('header.appearance.dark'),
            title: t('header.appearance.dark'),
            buttonClassName: 'min-w-0 px-0',
        },
    ];
    const accentOptions: ToggleOption<AccentColor>[] = ACCENT_COLORS.map((color) => ({
        value: color,
        label: (
            <span
                className="h-4 w-4 rounded-full border border-ui-border"
                style={{ backgroundColor: ACCENT_SWATCHES[color] }}
            />
        ),
        ariaLabel: t(`header.accent.${color}`),
        title: t(`header.accent.${color}`),
        buttonClassName: 'min-w-0 px-0',
    }));

    function closeAll() {
        setOpen(false);
    }

    useDismissableMenu({
        open,
        rootRef,
        triggerRef,
        onClose: closeAll,
    });

    return (
        <div ref={rootRef} className="relative">
            <button
                ref={triggerRef}
                type="button"
                className={['btn-icon', open ? 'bg-ui-accent-soft text-ui-accent-on-soft' : '']
                    .filter(Boolean)
                    .join(' ')}
                aria-label={t('header.settings')}
                aria-haspopup="true"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => {
                    if (open) {
                        closeAll();
                        return;
                    }

                    setOpen(true);
                }}
            >
                <IconAdjustments className="h-5 w-5" />
            </button>
            {open ? (
                <motion.div
                    id={panelId}
                    aria-label={t('header.settings')}
                    className="absolute left-0 top-[calc(100%+0.5rem)] z-50 min-w-[15rem] rounded-xl border border-ui-border bg-ui-surface p-1.5 shadow-lg"
                    initial={{ opacity: 0, scale: 0.97, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                >
                    <div className={menuInlineRowClass}>
                        <p className={menuInlineLabelClass}>{t('header.language')}</p>
                        <ToggleGroup
                            className="w-24 shrink-0"
                            options={languageOptions}
                            value={locale}
                            onChange={setLocale}
                        />
                    </div>

                    <div className={menuInlineRowClass}>
                        <p className={menuInlineLabelClass}>{t('header.theme')}</p>
                        <ToggleGroup
                            className="w-24 shrink-0"
                            options={themeOptions}
                            value={isDark ? 'dark' : 'light'}
                            onChange={(value) => {
                                if (value === 'dark' && !isDark) onToggleTheme();
                                if (value === 'light' && isDark) onToggleTheme();
                            }}
                        />
                    </div>

                    <div className={menuInlineRowClass}>
                        <p className={menuInlineLabelClass}>{t('header.color')}</p>
                        <ToggleGroup
                            className="shrink-0"
                            options={accentOptions}
                            variant="swatch"
                            value={accent}
                            onChange={onSetAccent}
                        />
                    </div>

                    <div className="my-1 h-px bg-ui-border" />

                    <button
                        type="button"
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
                        className={menuItemClass}
                        onClick={() => {
                            onOpenAbout();
                            closeAll();
                        }}
                    >
                        {t('support.about')}
                    </button>
                </motion.div>
            ) : null}
        </div>
    );
}
