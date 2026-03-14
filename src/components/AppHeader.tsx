import { ArrowDownTrayIcon, ArrowsPointingInIcon, EyeIcon, MoonIcon, Squares2X2Icon, SunIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';

interface Props {
    isDark: boolean;
    onToggleTheme: () => void;
    onExport: () => void;
    canExport: boolean;
    onPreview: () => void;
    canPreview: boolean;
    onQuickDrop: () => void;
}

export function AppHeader({ isDark, onToggleTheme, onExport, canExport, onPreview, canPreview, onQuickDrop }: Props) {
    const { t } = useTranslation();

    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-ui-border bg-ui-surface px-6">
            <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ui-accent text-white shadow-sm">
                    <Squares2X2Icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col leading-none">
                    <span className="text-base font-bold">Fyler</span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-ui-text-muted">v0.1.0</span>
                </div>
                <div className="ml-2 flex items-center gap-3">
                    <button
                        onClick={onToggleTheme}
                        title={isDark ? t('header.toggleTheme.light') : t('header.toggleTheme.dark')}
                        className="btn-icon"
                    >
                        {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
                    </button>
                    <LanguageSwitcher />
                    <button onClick={onQuickDrop} className="btn-ghost" title={t('header.quickDrop')}>
                        <ArrowsPointingInIcon className="h-4 w-4" />
                        {t('header.quickDrop')}
                    </button>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button
                    disabled={!canPreview}
                    onClick={onPreview}
                    className="btn-ghost"
                >
                    <EyeIcon className="h-4 w-4" />
                    {t('header.preview')}
                </button>
                <button
                    disabled={!canExport}
                    onClick={onExport}
                    className="btn-primary"
                >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                    {t('header.exportPdf')}
                </button>
            </div>
        </header>
    );
}
