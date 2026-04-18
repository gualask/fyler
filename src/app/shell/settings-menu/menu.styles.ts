import type { AccentColor } from '@/shared/preferences';

export const ACCENT_SWATCHES: Record<AccentColor, string> = {
    indigo: 'var(--ui-swatch-indigo)',
    teal: 'var(--ui-swatch-teal)',
    amber: 'var(--ui-swatch-amber)',
    blue: 'var(--ui-swatch-blue)',
};

export const menuItemClass =
    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-ui-text-secondary transition-colors hover:bg-ui-surface-hover hover:text-ui-text';

export const submenuPanelClass =
    'mt-1 flex flex-col gap-1 rounded-lg border border-ui-border bg-ui-bg/60 p-1.5';
