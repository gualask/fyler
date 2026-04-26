import type { DiagnosticsSnapshot } from '@/shared/diagnostics';
import { useTranslation } from '@/shared/i18n';

import { openSupportIssue } from '../support-issue-flow';
import { buildGitHubIssueBody } from '../support-issue-report';

interface UseSupportDialogActionsParams {
    issueTitle: string;
    issueDescription: string;
    snapshot: DiagnosticsSnapshot;
    onCopyDiagnostics: () => Promise<void>;
    onSaveDiagnosticsFile: (params: {
        defaultFilename: string;
        filterLabel: string;
    }) => Promise<string>;
    onOpenGitHubIssue: (params: {
        title: string;
        body: string;
    }) => Promise<'prefilled' | 'blank_fallback'>;
    onShowToast: (tone: 'success' | 'warning', message: string) => void;
    onShowError: (error: unknown) => void;
}

export function useSupportDialogActions({
    issueTitle,
    issueDescription,
    snapshot,
    onCopyDiagnostics,
    onSaveDiagnosticsFile,
    onOpenGitHubIssue,
    onShowToast,
    onShowError,
}: UseSupportDialogActionsParams) {
    const { t } = useTranslation();
    const normalizedIssueTitle = issueTitle.trim();
    const normalizedIssueDescription = issueDescription.trim();
    const canOpenIssue = Boolean(normalizedIssueTitle && normalizedIssueDescription);

    async function copyDiagnostics() {
        try {
            await onCopyDiagnostics();
            onShowToast('success', t('support.feedback.copySuccess'));
        } catch (error) {
            onShowError(error);
        }
    }

    async function saveDiagnostics() {
        try {
            const defaultFilename = `fyler-diagnostics-${snapshot.app.version}.txt`;
            const filterLabel = t('support.dialog.diagnosticsFileFilter');
            const path = await onSaveDiagnosticsFile({ defaultFilename, filterLabel });
            if (!path) return;
            onShowToast('success', t('support.feedback.diagnosticsSaved'));
        } catch (error) {
            onShowError(error);
        }
    }

    async function openGitHubIssue() {
        if (!canOpenIssue) return;

        try {
            const result = await openSupportIssue({
                copyDiagnostics: onCopyDiagnostics,
                openGitHubIssue: onOpenGitHubIssue,
                title: normalizedIssueTitle,
                body: buildGitHubIssueBody({
                    problem: normalizedIssueDescription,
                    snapshot,
                }),
            });

            if (result.openResult === 'blank_fallback') {
                onShowToast('warning', t('support.feedback.issueOpenedFallback'));
                return;
            }

            if (!result.diagnosticsCopied) {
                onShowToast('warning', t('support.feedback.issueOpenedWithoutDiagnostics'));
                return;
            }

            onShowToast('success', t('support.feedback.issueOpenedWithDiagnostics'));
        } catch (error) {
            onShowError(error);
        }
    }

    return {
        canOpenIssue,
        copyDiagnostics,
        saveDiagnostics,
        openGitHubIssue,
    };
}
