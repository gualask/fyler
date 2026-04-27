import { useMemo, useState } from 'react';
import type { DiagnosticsSnapshot } from '@/shared/diagnostics';
import { useTranslation } from '@/shared/i18n';

import { openSupportIssue } from '../support-issue-flow';
import { buildGitHubIssueBody } from '../support-issue-report';

type SupportDialogAction = 'copy' | 'save' | 'issue';

type SupportActionRunnerResult = {
    started: boolean;
};

export function createSupportActionRunner(
    onPendingActionChange: (action: SupportDialogAction | null) => void = () => undefined,
) {
    let pendingAction: SupportDialogAction | null = null;

    return async function runSupportAction(
        action: SupportDialogAction,
        task: () => Promise<void>,
    ): Promise<SupportActionRunnerResult> {
        if (pendingAction) {
            return { started: false };
        }

        pendingAction = action;
        onPendingActionChange(action);

        try {
            await task();
            return { started: true };
        } finally {
            pendingAction = null;
            onPendingActionChange(null);
        }
    };
}

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
    const [pendingAction, setPendingAction] = useState<SupportDialogAction | null>(null);
    const runSupportAction = useMemo(() => createSupportActionRunner(setPendingAction), []);
    const normalizedIssueTitle = issueTitle.trim();
    const normalizedIssueDescription = issueDescription.trim();
    const canOpenIssue = Boolean(normalizedIssueTitle && normalizedIssueDescription);

    function showGitHubIssueResult(result: {
        diagnosticsCopied: boolean;
        openResult: 'prefilled' | 'blank_fallback';
    }) {
        if (result.openResult === 'blank_fallback') {
            onShowToast('warning', t('support.feedback.issueOpenedFallback'));
            return;
        }

        if (!result.diagnosticsCopied) {
            onShowToast('warning', t('support.feedback.issueOpenedWithoutDiagnostics'));
            return;
        }

        onShowToast('success', t('support.feedback.issueOpenedWithDiagnostics'));
    }

    async function openGitHubIssueTask() {
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

            showGitHubIssueResult(result);
        } catch (error) {
            onShowError(error);
        }
    }

    async function copyDiagnostics() {
        await runSupportAction('copy', async () => {
            try {
                await onCopyDiagnostics();
                onShowToast('success', t('support.feedback.copySuccess'));
            } catch (error) {
                onShowError(error);
            }
        });
    }

    async function saveDiagnostics() {
        await runSupportAction('save', async () => {
            try {
                const defaultFilename = `fyler-diagnostics-${snapshot.app.version}.txt`;
                const filterLabel = t('support.dialog.diagnosticsFileFilter');
                const path = await onSaveDiagnosticsFile({ defaultFilename, filterLabel });
                if (!path) return;
                onShowToast('success', t('support.feedback.diagnosticsSaved'));
            } catch (error) {
                onShowError(error);
            }
        });
    }

    async function openGitHubIssue() {
        if (!canOpenIssue) return;

        await runSupportAction('issue', openGitHubIssueTask);
    }

    return {
        actionPending: pendingAction !== null,
        canOpenIssue,
        copyDiagnostics,
        saveDiagnostics,
        openGitHubIssue,
    };
}
