import { describe, expect, test, vi } from 'vitest';
import {
    createSupportActionRunner,
    getGitHubIssueFeedback,
} from './support-dialog-actions.hook.js';

describe('getGitHubIssueFeedback', () => {
    test('returns the precise feedback for each issue open result', () => {
        expect(
            getGitHubIssueFeedback({
                diagnosticsCopied: true,
                openResult: 'prefilled',
            }),
        ).toEqual({
            tone: 'success',
            messageKey: 'support.feedback.issueOpenedWithDiagnostics',
        });

        expect(
            getGitHubIssueFeedback({
                diagnosticsCopied: false,
                openResult: 'prefilled',
            }),
        ).toEqual({
            tone: 'warning',
            messageKey: 'support.feedback.issueOpenedWithoutDiagnostics',
        });

        expect(
            getGitHubIssueFeedback({
                diagnosticsCopied: true,
                openResult: 'blank_fallback',
            }),
        ).toEqual({
            tone: 'warning',
            messageKey: 'support.feedback.issueOpenedFallback',
        });

        expect(
            getGitHubIssueFeedback({
                diagnosticsCopied: false,
                openResult: 'blank_fallback',
            }),
        ).toEqual({
            tone: 'warning',
            messageKey: 'support.feedback.issueOpenedFallbackWithoutDiagnostics',
        });
    });
});

describe('createSupportActionRunner', () => {
    test('ignores overlapping support actions until the active action completes', async () => {
        const pendingActions: Array<string | null> = [];
        const runSupportAction = createSupportActionRunner((action) => pendingActions.push(action));
        let releaseFirstAction!: () => void;
        const firstTask = vi.fn(
            () =>
                new Promise<void>((resolve) => {
                    releaseFirstAction = resolve;
                }),
        );
        const overlappingTask = vi.fn(async () => undefined);

        const firstAction = runSupportAction('copy', firstTask);
        await expect(runSupportAction('save', overlappingTask)).resolves.toEqual({
            started: false,
        });

        expect(firstTask).toHaveBeenCalledTimes(1);
        expect(overlappingTask).not.toHaveBeenCalled();
        expect(pendingActions).toEqual(['copy']);

        releaseFirstAction();
        await expect(firstAction).resolves.toEqual({ started: true });
        expect(pendingActions).toEqual(['copy', null]);

        const nextTask = vi.fn(async () => undefined);
        await expect(runSupportAction('issue', nextTask)).resolves.toEqual({ started: true });
        expect(nextTask).toHaveBeenCalledTimes(1);
        expect(pendingActions).toEqual(['copy', null, 'issue', null]);
    });

    test('unlocks after a failed support action', async () => {
        const pendingActions: Array<string | null> = [];
        const runSupportAction = createSupportActionRunner((action) => pendingActions.push(action));
        const failedTask = vi.fn(async () => {
            throw new Error('copy failed');
        });
        const nextTask = vi.fn(async () => undefined);

        await expect(runSupportAction('copy', failedTask)).rejects.toThrow('copy failed');
        await expect(runSupportAction('issue', nextTask)).resolves.toEqual({ started: true });

        expect(failedTask).toHaveBeenCalledTimes(1);
        expect(nextTask).toHaveBeenCalledTimes(1);
        expect(pendingActions).toEqual(['copy', null, 'issue', null]);
    });
});
