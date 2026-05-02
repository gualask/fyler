import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { DiagnosticsSnapshot } from '@/shared/diagnostics';
import { buildGitHubIssueBody } from './support-issue-report';

const snapshot: DiagnosticsSnapshot = {
    generatedAt: '2026-04-23T20:00:00.000Z',
    app: {
        appName: 'Fyler',
        version: '1.0.0',
        identifier: 'com.fyler.app',
        platform: 'macos',
        arch: 'aarch64',
    },
    preferences: {
        locale: 'it',
        theme: 'dark',
    },
    session: {
        quickAdd: false,
        fileCount: 2,
        finalPageCount: 4,
        optimizationPreset: 'light',
        imageFit: 'contain',
        targetDpi: null,
        jpegQuality: null,
    },
    recentEvents: [],
};

test('builds a GitHub issue body with problem and environment details', () => {
    const body = buildGitHubIssueBody({
        problem: 'Export fails after rotating a page.',
        snapshot,
    });

    assert.match(body, /## Problem\nExport fails after rotating a page\./);
    assert.match(body, /- Fyler version: 1\.0\.0/);
    assert.match(body, /- Platform: macos \(aarch64\)/);
    assert.match(body, /- Locale: it/);
    assert.match(body, /- Theme: dark/);
    assert.match(body, /Copy diagnostics/);
});
