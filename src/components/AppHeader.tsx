import { ArrowDownTrayIcon, DocumentIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';

interface Props {
    isDark: boolean;
    onToggleTheme: () => void;
    onExport: () => void;
    canExport: boolean;
    optimizeSlot: ReactNode;
}

export function AppHeader({ isDark, onToggleTheme, onExport, canExport, optimizeSlot }: Props) {
    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-ui-border bg-ui-surface px-6">
            <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ui-accent/10 text-ui-accent">
                    <DocumentIcon className="h-5 w-5" />
                </div>
                <div className="flex flex-col leading-none">
                    <span className="text-base font-bold">Fyler</span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-ui-text-muted">v0.1.0</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={onToggleTheme}
                    title={isDark ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
                    className="rounded-lg bg-ui-bg p-1.5 text-ui-text-muted transition-colors hover:bg-ui-surface-hover"
                >
                    {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
                </button>
                <div className="h-6 w-px bg-ui-border" />
                {optimizeSlot}
                <button
                    disabled={!canExport}
                    onClick={onExport}
                    className="flex items-center gap-2 rounded-lg bg-ui-accent px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-ui-accent-hover disabled:opacity-40"
                >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                    Esporta PDF
                </button>
            </div>
        </header>
    );
}
