/** Source document kind supported by the app. */
export type DocKind = 'pdf' | 'image';

/**
 * Rotation expressed in 90° steps.
 *
 * `0 => 0°`, `1 => 90°`, `2 => 180°`, `3 => 270°`.
 */
export type QuarterTurn = 0 | 1 | 2 | 3;

/**
 * A user-imported file tracked by the session.
 *
 * `pageCount` is 1-based and represents the original source; edits are tracked separately.
 */
export type SourceFile = {
    id: string;
    originalPath: string;
    name: string;
    pageCount: number;
    kind: DocKind;
};

/**
 * A page in the final composition.
 *
 * `pageNum` is 1-based and refers to the original page number in the source file.
 */
export type FinalPage = {
    id: string;
    fileId: string;
    pageNum: number;
};

/**
 * Per-source edits applied by the user.
 *
 * - `pageRotations` is sparse: missing pages are treated as `0` rotation.
 * - `revision` is incremented on every edit to make cache invalidation cheap.
 */
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
    targetDpi?: number;
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

export type MergeResult = {
    optimizationFailedCount: number;
};

export type SkippedFile = {
    name: string;
    reason: string;
    detail?: string;
};

export type OpenFilesResult = {
    files: SourceFile[];
    skippedErrors: SkippedFile[];
};

/** Builds the backend export request from the current composition state. */
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
