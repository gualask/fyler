import { uniqueSortedNumbers } from './number-list';

export type PageSpecError =
    | { kind: 'empty-token' }
    | { kind: 'invalid-token'; token: string }
    | { kind: 'non-positive-page' }
    | { kind: 'reversed-range'; start: number; end: number }
    | { kind: 'out-of-range'; page: number; total: number };

function clampPage(pageNum: number, total: number): number {
    return Math.min(Math.max(pageNum, 1), Math.max(total, 1));
}

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

/**
 * Permissive page-spec parser.
 *
 * - Ignores invalid / incomplete tokens
 * - Clamps values to the valid range (1..total)
 * - Fixes reversed ranges (`5-3` → `3-5`)
 * - Output is de-duplicated and sorted
 *
 * Empty/whitespace-only input selects no pages.
 */
export function parseSelectedPagesFromSpecLoose(spec: string, total: number): number[] {
    if (!spec.trim() || total <= 0) return [];

    const pages: number[] = [];

    for (const rawToken of spec.split(',')) {
        const token = rawToken.trim().replace(/\s+/g, '');
        if (!token) continue;

        const match = token.match(/^(\d+)(?:-(\d+))?$/) ?? token.match(/^(\d+)-$/);
        if (!match) continue;

        const a = Number.parseInt(match[1], 10);
        const b = match[2] ? Number.parseInt(match[2], 10) : a;
        if (!Number.isFinite(a) || !Number.isFinite(b)) continue;

        const start = clampPage(Math.min(a, b), total);
        const end = clampPage(Math.max(a, b), total);

        for (let pageNum = start; pageNum <= end; pageNum += 1) {
            pages.push(pageNum);
        }
    }

    return uniqueSortedNumbers(pages);
}

/**
 * Formats a set of selected pages into a compact page-spec string.
 *
 * Example: `[1,2,3,5,7,8]` → `"1-3, 5, 7-8"`.
 */
export function formatSelectedPagesToSpec(pages: number[]): string {
    if (!pages.length) return '';
    const normalized = uniqueSortedNumbers(pages);

    const chunks: string[] = [];
    let start = normalized[0];
    let prev = normalized[0];

    for (let i = 1; i < normalized.length; i += 1) {
        const current = normalized[i];
        if (current === prev + 1) {
            prev = current;
            continue;
        }

        chunks.push(start === prev ? String(start) : `${start}-${prev}`);
        start = current;
        prev = current;
    }

    chunks.push(start === prev ? String(start) : `${start}-${prev}`);
    return chunks.join(', ');
}

/** Formats the full valid range (`1..total`) as a page-spec string. */
export function formatAllPagesToSpec(total: number): string {
    if (total <= 0) return '';
    return total === 1 ? '1' : `1-${total}`;
}
