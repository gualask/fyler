import { ArrowDownTrayIcon, DocumentIcon, DocumentPlusIcon, MoonIcon, SunIcon, TrashIcon } from '@heroicons/react/24/outline';

/** Props for the main application toolbar. */
interface Props {
    isDark: boolean;
    onToggleTheme: () => void;
    onAddPDFs: () => void;
    onRemove: () => void;
    canRemove: boolean;
    onExport: () => void;
    canExport: boolean;
}

/**
 * Fixed top toolbar: brand with version, theme toggle,
 * and action buttons with visual hierarchy (ghost / ghost-destructive / solid).
 */
export function AppHeader({ isDark, onToggleTheme, onAddPDFs, onRemove, canRemove, onExport, canExport }: Props) {
    return (
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-ui-border bg-ui-surface px-4">
            <div className="flex items-center gap-2">
                <DocumentIcon className="h-5 w-5 text-ui-accent" />
                <div className="flex flex-col leading-none">
                    <span className="text-sm font-semibold">Fyler</span>
                    <span className="text-[10px] text-ui-text-muted">v0.1.0</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={onToggleTheme}
                    className="rounded-md p-1.5 text-ui-text-dim hover:bg-ui-surface-hover"
                >
                    {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
                </button>
                <div className="h-4 w-px bg-ui-border" />
                <button
                    onClick={onAddPDFs}
                    className="flex items-center gap-1.5 rounded-md border border-ui-border px-3 py-1.5 text-sm font-medium text-ui-text-secondary hover:bg-ui-surface-hover"
                >
                    <DocumentPlusIcon className="h-4 w-4" />
                    Aggiungi PDF
                </button>
                <button
                    disabled={!canRemove}
                    onClick={onRemove}
                    className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-ui-text-dim hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                >
                    <TrashIcon className="h-4 w-4" />
                    Rimuovi
                </button>
                <button
                    disabled={!canExport}
                    onClick={onExport}
                    className="flex items-center gap-1.5 rounded-md bg-ui-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-ui-accent-hover disabled:opacity-40"
                >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    Esporta PDF
                </button>
            </div>
        </header>
    );
}
