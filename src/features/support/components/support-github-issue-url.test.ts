import assert from 'node:assert/strict';
import { test } from 'vitest';
import { buildGitHubIssueOpenTarget } from './support-github-issue-url';

test('builds a prefilled GitHub issue URL when title and body fit the URL limit', () => {
    const target = buildGitHubIssueOpenTarget({
        title: 'Export failed',
        body: 'The exported PDF cannot be opened.',
    });

    assert.equal(target.kind, 'prefilled');
    assert.match(target.url, /^https:\/\/github\.com\/gualask\/fyler\/issues\/new\?/);
    assert.match(target.url, /title=Export%20failed/);
    assert.match(target.url, /body=The%20exported%20PDF%20cannot%20be%20opened\./);
});

test('falls back to the blank GitHub issue URL when the prefilled URL is too long', () => {
    const target = buildGitHubIssueOpenTarget({
        title: 'Export failed',
        body: 'x'.repeat(9000),
    });

    assert.deepEqual(target, {
        kind: 'blank_fallback',
        url: 'https://github.com/gualask/fyler/issues/new',
    });
});
