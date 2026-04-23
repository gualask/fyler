import type { DiagnosticsSnapshot } from '@/shared/diagnostics';

export function buildGitHubIssueBody({
    problem,
    snapshot,
}: {
    problem: string;
    snapshot: DiagnosticsSnapshot;
}) {
    return [
        '## Problem',
        problem,
        '',
        '## Steps to reproduce',
        '1. ',
        '',
        '## Expected',
        '',
        '## Actual',
        '',
        '## Environment',
        `- Fyler version: ${snapshot.app.version}`,
        `- Platform: ${snapshot.app.platform} (${snapshot.app.arch})`,
        `- Locale: ${snapshot.preferences.locale}`,
        `- Theme: ${snapshot.preferences.theme}`,
        '',
        '## Diagnostics',
        '_Paste the diagnostics from clipboard here (Copy diagnostics)._',
        '',
    ].join('\n');
}
