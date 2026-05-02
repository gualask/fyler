/** Source document kind supported by the app. */
export type DocKind = 'pdf' | 'image';

/** A specific “thing” within a source file that the user can target (focus/rotate/export). */
export type SourceTarget = { kind: 'pdf'; pageNum: number } | { kind: 'image' };

/**
 * Rotation expressed in 90° steps.
 *
 * `0 => 0°`, `1 => 90°`, `2 => 180°`, `3 => 270°`.
 */
export type QuarterTurn = 0 | 1 | 2 | 3;

/** Clockwise/counterclockwise 90° step direction. */
export type RotationDirection = 'cw' | 'ccw';

/**
 * A user-imported file tracked by the session.
 *
 * `pageCount` is 1-based and represents the original source; edits are tracked separately.
 * For PDFs, `pageCount` is `null` while the background page-count task is running.
 */
export type SourceFile = {
    id: string;
    originalPath: string;
    name: string;
    /** Original file size in bytes. */
    byteSize: number;
    /** Null for PDFs while page count is being resolved in the background. */
    pageCount: number | null;
    kind: DocKind;
};

/**
 * A page in the final composition.
 *
 * `pageNum` is 1-based and refers to the original page number in the source file.
 */
export type FinalPage =
    | {
          id: string;
          fileId: string;
          kind: 'pdf';
          pageNum: number;
      }
    | {
          id: string;
          fileId: string;
          kind: 'image';
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

export type ExportItem =
    | { kind: 'pdf'; fileId: string; pageNum: number }
    | { kind: 'image'; fileId: string };

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
    pages: ExportItem[];
    edits: Record<string, FileEdits>;
    outputPath: string;
    optimize?: OptimizeOptions;
};

export type MergeResult = {
    optimizationFailedCount: number;
    warnings?: MergeWarning[];
};

export type MergeWarning = {
    code: string;
    meta?: Record<string, unknown>;
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
