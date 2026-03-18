import { ArrowDownTrayIcon, ArrowsPointingInIcon, EyeIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';
import { HelpMenu } from './support/HelpMenu';

interface Props {
    isDark: boolean;
    onToggleTheme: () => void;
    onExport: () => void;
    canExport: boolean;
    onPreview: () => void;
    canPreview: boolean;
    onQuickAdd: () => void;
    onReportBug: () => void;
    onCopyDiagnostics: () => void;
    onOpenGitHubIssues: () => void;
    onOpenAbout: () => void;
}

export function AppHeader({
    isDark,
    onToggleTheme,
    onExport,
    canExport,
    onPreview,
    canPreview,
    onQuickAdd,
    onReportBug,
    onCopyDiagnostics,
    onOpenGitHubIssues,
    onOpenAbout,
}: Props) {
    const { t } = useTranslation();

    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-ui-border bg-ui-surface px-6">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                    <img src="/icon.svg" alt="Fyler" className="h-6 w-6" />
                    <span className="text-sm font-semibold text-ui-text">Fyler</span>
                </div>
                <div className="mx-1 h-5 w-px bg-ui-border" />
                <div className="flex items-center gap-2">
                    <button
                        onClick={onToggleTheme}
                        title={isDark ? t('header.toggleTheme.light') : t('header.toggleTheme.dark')}
                        className="btn-icon"
                    >
                        {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
                    </button>
                    <LanguageSwitcher />
                    <button onClick={onQuickAdd} className="btn-ghost" title={t('header.quickAdd')}>
                        <ArrowsPointingInIcon className="h-4 w-4" />
                        {t('header.quickAdd')}
                    </button>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <HelpMenu
                    onReportBug={onReportBug}
                    onCopyDiagnostics={onCopyDiagnostics}
                    onOpenGitHubIssues={onOpenGitHubIssues}
                    onOpenAbout={onOpenAbout}
                />
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
