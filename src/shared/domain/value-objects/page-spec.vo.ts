import { uniqueSortedNumbers } from '../utils/number-list';

const PAGE_RANGE_TOKEN_PATTERN = /^(\d+)(?:-(\d+))?$/;
const OPEN_PAGE_RANGE_TOKEN_PATTERN = /^(\d+)-$/;

interface PageRange {
    start: number;
    end: number;
}

function clampPage(pageNum: number, total: number): number {
    return Math.min(Math.max(pageNum, 1), Math.max(total, 1));
}

function parseLoosePageRange(rawToken: string, total: number): PageRange | null {
    const token = rawToken.trim().replace(/\s+/g, '');
    if (!token) return null;

    const match =
        token.match(PAGE_RANGE_TOKEN_PATTERN) ?? token.match(OPEN_PAGE_RANGE_TOKEN_PATTERN);
    if (!match) return null;

    const a = Number.parseInt(match[1], 10);
    const b = match[2] ? Number.parseInt(match[2], 10) : a;
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

    return {
        start: clampPage(Math.min(a, b), total),
        end: clampPage(Math.max(a, b), total),
    };
}

function compactPageRanges(pages: number[]): PageRange[] {
    const normalized = uniqueSortedNumbers(pages);
    const ranges: PageRange[] = [];
    let start = normalized[0];
    let end = normalized[0];

    for (let i = 1; i < normalized.length; i += 1) {
        const current = normalized[i];
        if (current === end + 1) {
            end = current;
            continue;
        }

        ranges.push({ start, end });
        start = current;
        end = current;
    }

    ranges.push({ start, end });
    return ranges;
}

function formatPageRange({ start, end }: PageRange): string {
    return start === end ? String(start) : `${start}-${end}`;
}

export const PageSpecVO = {
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
    parseLoose(spec: string, total: number): number[] {
        if (!spec.trim() || total <= 0) return [];

        const pages: number[] = [];

        for (const rawToken of spec.split(',')) {
            const range = parseLoosePageRange(rawToken, total);
            if (!range) continue;

            for (let pageNum = range.start; pageNum <= range.end; pageNum += 1) {
                pages.push(pageNum);
            }
        }

        return uniqueSortedNumbers(pages);
    },

    /**
     * Formats a set of selected pages into a compact page-spec string.
     *
     * Example: `[1,2,3,5,7,8]` → `"1-3, 5, 7-8"`.
     */
    formatSelected(pages: number[]): string {
        if (!pages.length) return '';
        return compactPageRanges(pages).map(formatPageRange).join(', ');
    },

    /** Formats the full valid range (`1..total`) as a page-spec string. */
    formatAll(total: number): string {
        if (total <= 0) return '';
        return total === 1 ? '1' : `1-${total}`;
    },
};
