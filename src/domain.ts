export type DocKind = 'pdf' | 'image';

export type Doc = {
    id: string;
    path: string;
    name: string;
    pageCount: number;
    pageSpec: string;
    kind: DocKind;
};

export type MergeInput = {
    path: string;
    pageSpec: string;
};

export type JpegQuality = 'high' | 'medium' | 'low';

export type OptimizeOptions = {
    jpegQuality?: JpegQuality;
    maxPx?: number;
};

/**
 * Conta le pagine selezionate da una page spec (es. "1-3,5,8").
 * Ritorna il totale se la spec è vuota, null se la spec è invalida.
 */
export function countSelectedPages(spec: string, total: number): number | null {
    if (!spec.trim()) return total;
    const pages = new Set<number>();
    for (const token of spec.split(',')) {
        const m = token.trim().match(/^(\d+)(?:-(\d+))?$/);
        if (!m) return null;
        const from = parseInt(m[1], 10);
        const to = m[2] ? parseInt(m[2], 10) : from;
        if (from < 1 || to < from) return null;
        for (let p = from; p <= Math.min(to, total); p++) pages.add(p);
    }
    return pages.size;
}

export type MergeRequest = {
    inputs: MergeInput[];
    outputPath: string;
    optimize?: OptimizeOptions;
};
