import { useTranslation } from '@/shared/i18n';

const secondaryActionClassName =
    'inline-flex min-h-9 items-center rounded-md px-2 text-xs font-medium text-ui-text-muted transition-colors hover:bg-ui-surface-hover hover:text-ui-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent-muted focus-visible:ring-offset-2 focus-visible:ring-offset-ui-surface disabled:cursor-wait disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-ui-text-muted';

export function SupportDialogFooter({
    actionPending,
    canOpenIssue,
    onClose,
    onCopyDiagnostics,
    onSaveDiagnostics,
    onOpenGitHubIssue,
}: {
    actionPending: boolean;
    canOpenIssue: boolean;
    onClose: () => void;
    onCopyDiagnostics: () => Promise<void>;
    onSaveDiagnostics: () => Promise<void>;
    onOpenGitHubIssue: () => Promise<void>;
}) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ui-border px-6 py-4">
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    className={secondaryActionClassName}
                    disabled={actionPending}
                    onClick={() => void onCopyDiagnostics()}
                >
                    {t('support.copyDiagnostics')}
                </button>
                <button
                    type="button"
                    className={secondaryActionClassName}
                    disabled={actionPending}
                    onClick={() => void onSaveDiagnostics()}
                >
                    {t('support.saveDiagnostics')}
                </button>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
                <button type="button" className="btn-ghost" onClick={onClose}>
                    {t('support.close')}
                </button>
                <button
                    type="button"
                    className="btn-primary"
                    disabled={!canOpenIssue || actionPending}
                    onClick={() => void onOpenGitHubIssue()}
                >
                    {t('support.openGitHubIssue')}
                </button>
            </div>
        </div>
    );
}
