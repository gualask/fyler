import { useCallback, useId, useRef, useState } from 'react';
import { useTranslation } from '@/shared/i18n';
import type { AccentColor } from '@/shared/preferences';
import { useDismissableMenu } from '@/shared/ui';
import { SettingsPanel } from './SettingsPanel';
import { SettingsTrigger } from './SettingsTrigger';
import {
    accentOptions,
    languageOptions,
    type ThemeValue,
    themeOptions,
} from './settings-menu-options';

export interface AppSettingsMenuProps {
    isDark: boolean;
    accent: AccentColor;
    onToggleTheme: () => void;
    onSetAccent: (accent: AccentColor) => void;
    onReportBug: () => void;
}

export function AppSettingsMenu({
    isDark,
    accent,
    onToggleTheme,
    onSetAccent,
    onReportBug,
}: AppSettingsMenuProps) {
    const { locale, setLocale, t } = useTranslation();
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const panelId = useId();

    const closeAll = useCallback(() => {
        setOpen(false);
    }, []);

    const toggleMenu = useCallback(() => {
        setOpen((current) => !current);
    }, []);

    const handleThemeChange = useCallback(
        (value: ThemeValue) => {
            if (value === 'dark' && !isDark) onToggleTheme();
            if (value === 'light' && isDark) onToggleTheme();
        },
        [isDark, onToggleTheme],
    );

    const handleReportBug = useCallback(() => {
        onReportBug();
        closeAll();
    }, [closeAll, onReportBug]);

    useDismissableMenu({
        open,
        rootRef,
        triggerRef,
        onClose: closeAll,
    });

    return (
        <div ref={rootRef} className="relative">
            <SettingsTrigger
                open={open}
                panelId={panelId}
                triggerRef={triggerRef}
                label={t('header.settings')}
                onClick={toggleMenu}
            />
            {open ? (
                <SettingsPanel
                    panelId={panelId}
                    title={t('header.settings')}
                    languageLabel={t('header.language')}
                    locale={locale}
                    languageOptions={languageOptions(t)}
                    onSetLocale={setLocale}
                    themeLabel={t('header.theme')}
                    themeValue={isDark ? 'dark' : 'light'}
                    themeOptions={themeOptions(t)}
                    onThemeChange={handleThemeChange}
                    colorLabel={t('header.color')}
                    accent={accent}
                    accentOptions={accentOptions(t)}
                    onSetAccent={onSetAccent}
                    reportBugLabel={t('support.reportBug')}
                    onReportBug={handleReportBug}
                />
            ) : null}
        </div>
    );
}
