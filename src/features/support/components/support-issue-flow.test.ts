/// <reference types="node" />

import assert from 'node:assert/strict';
import { openSupportIssue } from './support-issue-flow.js';

void (async () => {
    {
        const calls: string[] = [];
        const result = await openSupportIssue({
            title: 'Bug report',
            body: 'Body',
            copyDiagnostics: async () => {
                calls.push('copy');
                throw new Error('clipboard denied');
            },
            openGitHubIssue: async () => {
                calls.push('open');
                return 'prefilled' as const;
            },
        });

        assert.deepEqual(calls, ['copy', 'open']);
        assert.deepEqual(result, {
            diagnosticsCopied: false,
            openResult: 'prefilled',
        });
    }

    {
        const calls: string[] = [];
        const result = await openSupportIssue({
            title: 'Bug report',
            body: 'Body',
            copyDiagnostics: async () => {
                calls.push('copy');
            },
            openGitHubIssue: async () => {
                calls.push('open');
                return 'blank_fallback' as const;
            },
        });

        assert.deepEqual(calls, ['copy', 'open']);
        assert.deepEqual(result, {
            diagnosticsCopied: true,
            openResult: 'blank_fallback',
        });
    }
})();
