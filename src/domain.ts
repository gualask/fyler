export type DocKind = 'pdf' | 'image';
export type QuarterTurn = 0 | 1 | 2 | 3;

export type SourceFile = {
    id: string;
    originalPath: string;
    name: string;
    pageCount: number;
    kind: DocKind;
};

export type FinalPage = {
    id: string;
    fileId: string;
    pageNum: number;
};

export type FileEdits = {
    revision: number;
    pageRotations?: Record<number, QuarterTurn>;
    imageRotation?: QuarterTurn;
};

export type ExportPage = {
    fileId: string;
    pageNum: number;
};

export type JpegQuality = number;
export type ImageFit = 'fit' | 'contain' | 'cover';

export type OptimizeOptions = {
    jpegQuality?: JpegQuality;
    maxPx?: number;
    imageFit?: ImageFit;
};

export type ImageExportPreviewLayout = {
    pageWidthPt: number;
    pageHeightPt: number;
    drawXPt: number;
    drawYPt: number;
    drawWidthPt: number;
    drawHeightPt: number;
    clipToPage: boolean;
    fillBackground: boolean;
};

export type MergeRequest = {
    pages: ExportPage[];
    edits: Record<string, FileEdits>;
    outputPath: string;
    optimize?: OptimizeOptions;
};

export function buildMergeRequest(
    finalPages: FinalPage[],
    edits: Record<string, FileEdits>,
    outputPath: string,
    optimize?: OptimizeOptions,
): MergeRequest {
    return {
        pages: finalPages.map(({ fileId, pageNum }) => ({ fileId, pageNum })),
        edits,
        outputPath,
        optimize,
    };
}
