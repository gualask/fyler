import type { ReactNode } from 'react';

import type { AccentColor, Locale } from '@/shared/preferences';
import { ToggleGroup, type ToggleOption } from '@/shared/ui';

import { menuInlineLabelClass, menuInlineRowClass, menuItemClass } from './menu.styles';
import type { ThemeValue } from './settings-menu-options';

interface SettingsPanelProps {
    panelId: string;
    title: string;
    languageLabel: string;
    locale: Locale;
    languageOptions: ToggleOption<Locale>[];
    onSetLocale: (locale: Locale) => void;
    themeLabel: string;
    themeValue: ThemeValue;
    themeOptions: ToggleOption<ThemeValue>[];
    onThemeChange: (value: ThemeValue) => void;
    colorLabel: string;
    accent: AccentColor;
    accentOptions: ToggleOption<AccentColor>[];
    onSetAccent: (accent: AccentColor) => void;
    reportBugLabel: string;
    onReportBug: () => void;
}

function SettingsRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className={menuInlineRowClass}>
            <p className={menuInlineLabelClass}>{label}</p>
            {children}
        </div>
    );
}

export function SettingsPanel({
    panelId,
    title,
    languageLabel,
    locale,
    languageOptions,
    onSetLocale,
    themeLabel,
    themeValue,
    themeOptions,
    onThemeChange,
    colorLabel,
    accent,
    accentOptions,
    onSetAccent,
    reportBugLabel,
    onReportBug,
}: SettingsPanelProps) {
    return (
        <fieldset
            id={panelId}
            className="absolute left-0 top-[calc(100%+0.5rem)] z-50 min-w-[15rem] rounded-xl border border-ui-border bg-ui-surface p-1.5 shadow-lg"
        >
            <legend className="sr-only">{title}</legend>
            <SettingsRow label={languageLabel}>
                <ToggleGroup
                    className="w-24 shrink-0"
                    options={languageOptions}
                    value={locale}
                    onChange={onSetLocale}
                />
            </SettingsRow>

            <SettingsRow label={themeLabel}>
                <ToggleGroup
                    className="w-24 shrink-0"
                    options={themeOptions}
                    value={themeValue}
                    onChange={onThemeChange}
                />
            </SettingsRow>

            <SettingsRow label={colorLabel}>
                <ToggleGroup
                    className="shrink-0"
                    options={accentOptions}
                    variant="swatch"
                    value={accent}
                    onChange={onSetAccent}
                />
            </SettingsRow>

            <div className="my-1 h-px bg-ui-border" />

            <button type="button" className={menuItemClass} onClick={onReportBug}>
                {reportBugLabel}
            </button>
        </fieldset>
    );
}
