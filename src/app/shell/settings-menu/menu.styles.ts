import type { AccentColor } from '@/shared/preferences';

export const ACCENT_SWATCHES: Record<AccentColor, string> = {
    indigo: 'var(--ui-swatch-indigo)',
    teal: 'var(--ui-swatch-teal)',
    amber: 'var(--ui-swatch-amber)',
    blue: 'var(--ui-swatch-blue)',
};

export const menuItemClass =
    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-ui-text-secondary transition-colors hover:bg-ui-surface-hover hover:text-ui-text';

export const menuInlineRowClass = 'flex items-center justify-between gap-3 px-2 py-1.5';

export const menuInlineLabelClass = 'shrink-0 text-sm font-medium text-ui-text';
