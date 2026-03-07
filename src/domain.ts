export type DocKind = 'pdf' | 'image';

export type SourceFile = {
    id: string;
    path: string;
    name: string;
    pageCount: number;
    kind: DocKind;
};

export type FinalPage = {
    id: string;       // UUID univoco nell'ordine finale
    fileId: string;   // SourceFile.id sorgente
    pageNum: number;  // 1-indexed (0 per immagini)
};

export type MergeInput = {
    path: string;
    pageSpec: string;
};

export type JpegQuality = 'high' | 'medium' | 'low';
export type ImageFit = 'fit' | 'contain' | 'cover';

export type OptimizeOptions = {
    jpegQuality?: JpegQuality;
    maxPx?: number;
    imageFit?: ImageFit;
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

/**
 * Converte FinalPage[] in MergeInput[] per l'export.
 * Raggruppa run consecutive dello stesso fileId in un singolo MergeInput.
 */
export function finalPagesToMergeInputs(finalPages: FinalPage[], files: SourceFile[]): MergeInput[] {
    const fileMap = new Map(files.map((f) => [f.id, f]));
    const result: MergeInput[] = [];
    let i = 0;
    while (i < finalPages.length) {
        const fp = finalPages[i];
        const file = fileMap.get(fp.fileId);
        if (!file) { i++; continue; }

        const pages: number[] = [fp.pageNum];
        let j = i + 1;
        while (j < finalPages.length && finalPages[j].fileId === fp.fileId) {
            pages.push(finalPages[j].pageNum);
            j++;
        }

        const pageSpec = file.kind === 'image' ? '' : pages.join(',');
        result.push({ path: file.path, pageSpec });
        i = j;
    }
    return result;
}

export type MergeRequest = {
    inputs: MergeInput[];
    outputPath: string;
    optimize?: OptimizeOptions;
};
