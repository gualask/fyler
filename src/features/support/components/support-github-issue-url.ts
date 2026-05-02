const GITHUB_NEW_ISSUE_URL = 'https://github.com/gualask/fyler/issues/new';
const MAX_GITHUB_ISSUE_URL_LENGTH = 8000;

export type GitHubIssueOpenTarget = {
    url: string;
    kind: 'prefilled' | 'blank_fallback';
};

export function buildGitHubIssueOpenTarget({
    title,
    body,
}: {
    title: string;
    body: string;
}): GitHubIssueOpenTarget {
    const url = `${GITHUB_NEW_ISSUE_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
    if (url.length <= MAX_GITHUB_ISSUE_URL_LENGTH) {
        return { url, kind: 'prefilled' };
    }

    return { url: GITHUB_NEW_ISSUE_URL, kind: 'blank_fallback' };
}
