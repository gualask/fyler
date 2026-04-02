import type { AccentColor } from '@/shared/preferences';

export const ACCENT_SWATCHES: Record<AccentColor, string> = {
    indigo: '#6366f1',
    teal: '#14b8a6',
    amber: '#f59e0b',
    blue: '#3b82f6',
};

export const menuItemClass =
    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-ui-text-secondary transition-colors hover:bg-ui-surface-hover hover:text-ui-text';

export const submenuPanelClass =
    'absolute left-full top-0 z-30 ml-1 min-w-[11rem] rounded-xl border border-ui-border bg-ui-surface p-1.5 shadow-lg';
