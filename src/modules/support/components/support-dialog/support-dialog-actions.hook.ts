import { useMemo, useState } from 'react';
import type { DiagnosticsSnapshot } from '@/shared/diagnostics';
import { type TranslationKey, useTranslation } from '@/shared/i18n';

import { openSupportIssue } from '../support-issue-flow';
import { buildGitHubIssueBody } from '../support-issue-report';

type SupportDialogAction = 'copy' | 'save' | 'issue';

type SupportActionRunnerResult = {
    started: boolean;
};

type GitHubIssueOpenResult = {
    diagnosticsCopied: boolean;
    openResult: 'prefilled' | 'blank_fallback';
};

export function getGitHubIssueFeedback(result: GitHubIssueOpenResult): {
    tone: 'success' | 'warning';
    messageKey: TranslationKey;
} {
    if (!result.diagnosticsCopied && result.openResult === 'blank_fallback') {
        return {
            tone: 'warning',
            messageKey: 'support.feedback.issueOpenedFallbackWithoutDiagnostics',
        };
    }

    if (result.openResult === 'blank_fallback') {
        return {
            tone: 'warning',
            messageKey: 'support.feedback.issueOpenedFallback',
        };
    }

    if (!result.diagnosticsCopied) {
        return {
            tone: 'warning',
            messageKey: 'support.feedback.issueOpenedWithoutDiagnostics',
        };
    }

    return {
        tone: 'success',
        messageKey: 'support.feedback.issueOpenedWithDiagnostics',
    };
}

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

type Translate = ReturnType<typeof useTranslation>['t'];
type SupportActionRunner = ReturnType<typeof createSupportActionRunner>;

function createCopyDiagnosticsAction({
    run,
    copy,
    showToast,
    showError,
    t,
}: {
    run: SupportActionRunner;
    copy: () => Promise<void>;
    showToast: UseSupportDialogActionsParams['onShowToast'];
    showError: UseSupportDialogActionsParams['onShowError'];
    t: Translate;
}) {
    return async () => {
        await run('copy', async () => {
            try {
                await copy();
                showToast('success', t('support.feedback.copySuccess'));
            } catch (error) {
                showError(error);
            }
        });
    };
}

function createSaveDiagnosticsAction({
    run,
    snapshot,
    save,
    showToast,
    showError,
    t,
}: {
    run: SupportActionRunner;
    snapshot: DiagnosticsSnapshot;
    save: UseSupportDialogActionsParams['onSaveDiagnosticsFile'];
    showToast: UseSupportDialogActionsParams['onShowToast'];
    showError: UseSupportDialogActionsParams['onShowError'];
    t: Translate;
}) {
    return async () => {
        await run('save', async () => {
            try {
                const path = await save({
                    defaultFilename: `fyler-diagnostics-${snapshot.app.version}.txt`,
                    filterLabel: t('support.dialog.diagnosticsFileFilter'),
                });
                if (path) showToast('success', t('support.feedback.diagnosticsSaved'));
            } catch (error) {
                showError(error);
            }
        });
    };
}

function createOpenIssueAction({
    run,
    issueTitle,
    issueDescription,
    snapshot,
    copy,
    openIssue,
    showToast,
    showError,
    t,
}: {
    run: SupportActionRunner;
    issueTitle: string;
    issueDescription: string;
    snapshot: DiagnosticsSnapshot;
    copy: UseSupportDialogActionsParams['onCopyDiagnostics'];
    openIssue: UseSupportDialogActionsParams['onOpenGitHubIssue'];
    showToast: UseSupportDialogActionsParams['onShowToast'];
    showError: UseSupportDialogActionsParams['onShowError'];
    t: Translate;
}) {
    const title = issueTitle.trim();
    const description = issueDescription.trim();
    const canOpenIssue = Boolean(title && description);
    const openGitHubIssue = async () => {
        if (!canOpenIssue) return;
        await run('issue', async () => {
            try {
                const result = await openSupportIssue({
                    copyDiagnostics: copy,
                    openGitHubIssue: openIssue,
                    title,
                    body: buildGitHubIssueBody({ problem: description, snapshot }),
                });
                const feedback = getGitHubIssueFeedback(result);
                showToast(feedback.tone, t(feedback.messageKey));
            } catch (error) {
                showError(error);
            }
        });
    };
    return { canOpenIssue, openGitHubIssue };
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
    const copyDiagnostics = createCopyDiagnosticsAction({
        run: runSupportAction,
        copy: onCopyDiagnostics,
        showToast: onShowToast,
        showError: onShowError,
        t,
    });
    const saveDiagnostics = createSaveDiagnosticsAction({
        run: runSupportAction,
        snapshot,
        save: onSaveDiagnosticsFile,
        showToast: onShowToast,
        showError: onShowError,
        t,
    });
    const { canOpenIssue, openGitHubIssue } = createOpenIssueAction({
        run: runSupportAction,
        issueTitle,
        issueDescription,
        snapshot,
        copy: onCopyDiagnostics,
        openIssue: onOpenGitHubIssue,
        showToast: onShowToast,
        showError: onShowError,
        t,
    });

    return {
        actionPending: pendingAction !== null,
        canOpenIssue,
        copyDiagnostics,
        saveDiagnostics,
        openGitHubIssue,
    };
}
