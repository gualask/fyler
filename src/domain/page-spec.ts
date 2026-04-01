export type PageSpecError =
    | { kind: 'empty-token' }
    | { kind: 'invalid-token'; token: string }
    | { kind: 'non-positive-page' }
    | { kind: 'reversed-range'; start: number; end: number }
    | { kind: 'out-of-range'; page: number; total: number };

/**
 * Parses a user-provided page selection string.
 *
 * Supported format:
 * - Comma-separated tokens (`1,3,5-7`)
 * - Ranges are inclusive and 1-based
 * - Output is de-duplicated and sorted
 *
 * Empty/whitespace-only input selects all pages.
 */
export function parseSelectedPagesFromSpec(
    spec: string,
    total: number,
): { pages: number[]; error: null } | { pages: null; error: PageSpecError } {
    if (!spec.trim()) {
        return {
            pages: Array.from({ length: total }, (_, i) => i + 1),
            error: null,
        };
    }

    const pages = new Set<number>();

    for (const rawToken of spec.split(',')) {
        const token = rawToken.trim();
        if (!token) {
            return { pages: null, error: { kind: 'empty-token' } };
        }

        const match = token.match(/^(\d+)(?:-(\d+))?$/);
        if (!match) {
            return { pages: null, error: { kind: 'invalid-token', token } };
        }

        const start = Number.parseInt(match[1], 10);
        const end = match[2] ? Number.parseInt(match[2], 10) : start;

        if (start === 0 || end === 0) {
            return { pages: null, error: { kind: 'non-positive-page' } };
        }

        if (start > end) {
            return { pages: null, error: { kind: 'reversed-range', start, end } };
        }

        if (end > total) {
            return { pages: null, error: { kind: 'out-of-range', page: end, total } };
        }

        for (let pageNum = start; pageNum <= end; pageNum += 1) {
            pages.add(pageNum);
        }
    }

    return {
        pages: Array.from(pages).sort((a, b) => a - b),
        error: null,
    };
}
