import { IconMoon, IconSun } from '@tabler/icons-react';

import type { useTranslation } from '@/shared/i18n';
import { ACCENT_COLORS, type AccentColor, type Locale } from '@/shared/preferences';
import type { ToggleOption } from '@/shared/ui';

import { ACCENT_SWATCHES } from './menu.styles';

type Translate = ReturnType<typeof useTranslation>['t'];

export type ThemeValue = 'light' | 'dark';

const LANGUAGE_ORDER: Locale[] = ['en', 'it'];

export function languageOptions(t: Translate): ToggleOption<Locale>[] {
    return LANGUAGE_ORDER.map((option) => ({
        value: option,
        label: t(`language.short.${option}`),
        buttonClassName: 'min-w-0 px-0 text-xs font-semibold',
    }));
}

export function themeOptions(t: Translate): ToggleOption<ThemeValue>[] {
    return [
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
}

export function accentOptions(t: Translate): ToggleOption<AccentColor>[] {
    return ACCENT_COLORS.map((color) => ({
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
}
